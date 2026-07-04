/**
 * Monitor API — 服务器/服务状态监控
 * GET    /api/monitor          — 获取所有监控目标状态
 * POST   /api/monitor/target   — 添加监控目标
 * DELETE /api/monitor/target?id=x — 删除监控目标
 */

import { getMonitorTargets, saveMonitorTargets } from './_kv.js';

const CACHE_TTL = 120; // 状态缓存 2 分钟

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}

async function checkTarget(target) {
    const start = Date.now();
    try {
        const res = await fetch(target.url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(10000),
            redirect: 'follow'
        });
        return {
            id: target.id,
            name: target.name,
            url: target.url,
            status: res.ok ? 'online' : 'degraded',
            statusCode: res.status,
            latency: Date.now() - start,
            checkedAt: new Date().toISOString()
        };
    } catch (e) {
        return {
            id: target.id,
            name: target.name,
            url: target.url,
            status: 'offline',
            statusCode: 0,
            latency: Date.now() - start,
            error: e.message,
            checkedAt: new Date().toISOString()
        };
    }
}

export async function onRequestGet({ request, env }) {
    const data = await getMonitorTargets(env);
    const forceRefresh = new URL(request.url).searchParams.get('refresh') === '1';

    // 使用缓存避免频繁检查
    const cachedAt = data.lastChecked ? new Date(data.lastChecked).getTime() : 0;
    if (!forceRefresh && data.results && Date.now() - cachedAt < CACHE_TTL * 1000) {
        return json(data);
    }

    const results = await Promise.all(data.targets.map(checkTarget));
    const updated = {
        ...data,
        results,
        lastChecked: new Date().toISOString(),
        summary: {
            total: results.length,
            online: results.filter(r => r.status === 'online').length,
            degraded: results.filter(r => r.status === 'degraded').length,
            offline: results.filter(r => r.status === 'offline').length
        }
    };

    await saveMonitorTargets(env, updated);
    return json(updated);
}

export async function onRequestPost({ request, env }) {
    const body = await request.json();
    const data = await getMonitorTargets(env);

    if (!body.url || !body.name) return json({ error: 'Name and URL required' }, 400);

    data.targets.push({
        id: Date.now().toString(36),
        name: body.name,
        url: body.url,
        category: body.category || 'service',
        addedAt: new Date().toISOString()
    });

    await saveMonitorTargets(env, data);
    return json(data, 201);
}

export async function onRequestDelete({ request, env }) {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return json({ error: 'Missing id' }, 400);
    let data = await getMonitorTargets(env);
    data.targets = data.targets.filter(t => t.id !== id);
    await saveMonitorTargets(env, data);
    return json({ success: true });
}
