/**
 * RSS API — 订阅聚合
 * GET  /api/rss             — 获取所有 RSS 条目
 * GET  /api/rss/feeds       — 获取订阅源列表
 * POST /api/rss/feeds       — 添加订阅源
 * DELETE /api/rss/feeds?id=x — 删除订阅源
 */

import { getRssFeeds, saveRssFeeds } from './_kv.js';

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}

// 简易 RSS XML 解析器
function parseRSS(xmlText) {
    const items = [];
    // 匹配 <item>...</item> 块
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
        const itemXml = match[1];
        const title = extractTag(itemXml, 'title');
        const link = extractTag(itemXml, 'link');
        const description = stripHtml(extractTag(itemXml, 'description') || '');
        const pubDate = extractTag(itemXml, 'pubDate');
        const author = extractTag(itemXml, 'author') || extractTag(itemXml, 'dc:creator');

        if (title && link) {
            items.push({
                title,
                link,
                description: description.slice(0, 280),
                pubDate: pubDate ? new Date(pubDate).toISOString() : null,
                author,
                feedTitle: extractTag(xmlText, 'title') || 'Unknown Feed'
            });
        }
    }

    // 也尝试 Atom 格式
    if (items.length === 0) {
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
        while ((match = entryRegex.exec(xmlText)) !== null) {
            const entryXml = match[1];
            const title = extractTag(entryXml, 'title');
            const linkMatch = entryXml.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/);
            const link = linkMatch ? linkMatch[1] : extractTag(entryXml, 'link');
            const summary = stripHtml(extractTag(entryXml, 'summary') || extractTag(entryXml, 'content') || '');
            const updated = extractTag(entryXml, 'updated') || extractTag(entryXml, 'published');

            if (title && link) {
                items.push({
                    title, link,
                    description: summary.slice(0, 280),
                    pubDate: updated ? new Date(updated).toISOString() : null,
                    author: extractTag(entryXml, 'author'),
                    feedTitle: extractTag(xmlText, 'title') || 'Unknown Feed'
                });
            }
        }
    }

    return items;
}

function extractTag(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : null;
}

function stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

// ===== Route handlers =====

export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);

    // 获取订阅源列表
    if (url.pathname === '/api/rss/feeds') {
        const feeds = await getRssFeeds(env);
        return json(feeds);
    }

    // 获取所有 RSS 条目
    const { feeds } = await getRssFeeds(env);
    if (feeds.length === 0) {
        return json({ items: [], feeds: [] });
    }

    // 并发拉取所有 feed
    const results = await Promise.allSettled(
        feeds.map(async feed => {
            try {
                const res = await fetch(feed.url, {
                    headers: { 'User-Agent': 'NOSR-RSS-Reader/1.0' },
                    signal: AbortSignal.timeout(8000)
                });
                const text = await res.text();
                const items = parseRSS(text);
                return items.map(item => ({ ...item, feedTitle: feed.title || item.feedTitle, feedUrl: feed.url }));
            } catch (e) {
                console.error(`Failed to fetch ${feed.url}:`, e.message);
                return [];
            }
        })
    );

    // 合并、去重、按时间排序
    const allItems = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .filter((item, i, arr) => arr.findIndex(a => a.link === item.link) === i)
        .sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime())
        .slice(0, 50);

    return json({ items: allItems, feeds });
}

export async function onRequestPost({ request, env }) {
    const body = await request.json();
    const feeds = await getRssFeeds(env);

    if (!body.url) return json({ error: 'URL required' }, 400);

    // 检查重复
    if (feeds.feeds.find(f => f.url === body.url)) {
        return json({ error: 'Feed already exists' }, 409);
    }

    feeds.feeds.push({
        id: Date.now().toString(36),
        title: body.title || 'Untitled Feed',
        url: body.url,
        category: body.category || 'general',
        addedAt: new Date().toISOString()
    });

    await saveRssFeeds(env, feeds);
    return json(feeds, 201);
}

export async function onRequestDelete({ request, env }) {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return json({ error: 'Missing id' }, 400);
    let feeds = await getRssFeeds(env);
    feeds.feeds = feeds.feeds.filter(f => f.id !== id);
    await saveRssFeeds(env, feeds);
    return json({ success: true });
}
