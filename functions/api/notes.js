/**
 * Notes API — 速记笔记
 * GET    /api/notes         — 获取所有笔记
 * POST   /api/notes         — 创建笔记
 * PUT    /api/notes?id=xxx  — 更新笔记
 * DELETE /api/notes?id=xxx  — 删除笔记
 */

import { getNotes, saveNotes } from './_kv.js';

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestGet({ env }) {
    const notes = await getNotes(env);
    return json(notes);
}

export async function onRequestPost({ request, env }) {
    const body = await request.json();
    const notes = await getNotes(env);
    const note = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        title: body.title || '',
        content: body.content || '',
        tags: body.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pinned: body.pinned || false
    };
    notes.unshift(note);
    await saveNotes(env, notes);
    return json(note, 201);
}

export async function onRequestPut({ request, env }) {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return json({ error: 'Missing id' }, 400);
    const body = await request.json();
    const notes = await getNotes(env);
    const idx = notes.findIndex(n => n.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    notes[idx] = { ...notes[idx], ...body, id, updatedAt: new Date().toISOString() };
    await saveNotes(env, notes);
    return json(notes[idx]);
}

export async function onRequestDelete({ request, env }) {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return json({ error: 'Missing id' }, 400);
    let notes = await getNotes(env);
    notes = notes.filter(n => n.id !== id);
    await saveNotes(env, notes);
    return json({ success: true });
}
