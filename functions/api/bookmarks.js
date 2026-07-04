/**
 * Bookmarks API — 书签与快捷入口
 * GET    /api/bookmarks          — 获取所有书签
 * POST   /api/bookmarks          — 添加书签
 * PUT    /api/bookmarks?id=xxx   — 更新书签
 * DELETE /api/bookmarks?id=xxx   — 删除书签
 * POST   /api/bookmarks/category — 添加分类
 */

import { getBookmarks, saveBookmarks } from './_kv.js';

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestGet({ env }) {
    const bookmarks = await getBookmarks(env);
    return json(bookmarks);
}

export async function onRequestPost({ request, env }) {
    const body = await request.json();
    const bookmarks = await getBookmarks(env);

    if (body.type === 'category') {
        // 添加分类
        if (!bookmarks.categories.find(c => c.name === body.name)) {
            bookmarks.categories.push({
                id: Date.now().toString(36),
                name: body.name,
                icon: body.icon || 'fa-solid fa-bookmark',
                order: bookmarks.categories.length
            });
        }
    } else {
        // 添加书签
        bookmarks.items.push({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
            title: body.title || '',
            url: body.url || '',
            icon: body.icon || 'fa-solid fa-link',
            categoryId: body.categoryId || 'default',
            description: body.description || '',
            order: bookmarks.items.length,
            createdAt: new Date().toISOString()
        });
    }

    await saveBookmarks(env, bookmarks);
    return json(bookmarks, 201);
}

export async function onRequestPut({ request, env }) {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return json({ error: 'Missing id' }, 400);
    const body = await request.json();
    const bookmarks = await getBookmarks(env);
    const idx = bookmarks.items.findIndex(b => b.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    bookmarks.items[idx] = { ...bookmarks.items[idx], ...body, id };
    await saveBookmarks(env, bookmarks);
    return json(bookmarks.items[idx]);
}

export async function onRequestDelete({ request, env }) {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return json({ error: 'Missing id' }, 400);
    let bookmarks = await getBookmarks(env);
    // 检查是否是分类删除
    const catIdx = bookmarks.categories.findIndex(c => c.id === id);
    if (catIdx !== -1) {
        bookmarks.categories.splice(catIdx, 1);
        bookmarks.items = bookmarks.items.filter(b => b.categoryId !== id);
    } else {
        bookmarks.items = bookmarks.items.filter(b => b.id !== id);
    }
    await saveBookmarks(env, bookmarks);
    return json({ success: true });
}
