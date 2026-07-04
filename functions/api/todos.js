/**
 * Todos API
 * GET    /api/todos         — 获取所有 todo
 * POST   /api/todos         — 添加 todo
 * PUT    /api/todos?id=xxx  — 更新 todo
 * DELETE /api/todos?id=xxx  — 删除 todo
 */

import { getTodos, saveTodos } from './_kv.js';

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function onRequestGet({ request, env }) {
    const todos = await getTodos(env);
    return jsonResponse(todos);
}

export async function onRequestPost({ request, env }) {
    const body = await request.json();
    const todos = await getTodos(env);

    const newTodo = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        text: body.text || '',
        completed: false,
        category: body.category || 'default',
        createdAt: new Date().toISOString(),
        dueDate: body.dueDate || null,
        priority: body.priority || 'medium' // low, medium, high
    };

    todos.push(newTodo);
    await saveTodos(env, todos);
    return jsonResponse(newTodo, 201);
}

export async function onRequestPut({ request, env }) {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return jsonResponse({ error: 'Missing id' }, 400);

    const body = await request.json();
    const todos = await getTodos(env);
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) return jsonResponse({ error: 'Not found' }, 404);

    todos[index] = { ...todos[index], ...body, id };
    await saveTodos(env, todos);
    return jsonResponse(todos[index]);
}

export async function onRequestDelete({ request, env }) {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return jsonResponse({ error: 'Missing id' }, 400);

    let todos = await getTodos(env);
    todos = todos.filter(t => t.id !== id);
    await saveTodos(env, todos);
    return jsonResponse({ success: true });
}
