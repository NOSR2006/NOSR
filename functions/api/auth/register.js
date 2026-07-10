/**
 * 注册接口 — POST /api/auth/register
 */

import { createToken } from '../../_middleware.js';
import { generateSalt, hashPassword } from '../_crypto.js';
import { findUserByUsername, createUser, updateLastLogin } from '../_db.js';

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

function setCookie(response, name, value, maxAge) {
    response.headers.set(
        'Set-Cookie',
        `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`
    );
}

export async function onRequestPost(context) {
    const { request, env } = context;

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    const { username, password } = body;

    if (!username || typeof username !== 'string') {
        return json({ error: 'Username required' }, 400);
    }
    if (username.length < 2 || username.length > 20) {
        return json({ error: 'Username must be 2-20 characters' }, 400);
    }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
        return json({ error: 'Username: letters, digits, underscore, Chinese only' }, 400);
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
        return json({ error: 'Password must be at least 4 characters' }, 400);
    }

    const db = env.NOSR_DB;
    if (!db) {
        return json({ error: 'Database not configured' }, 500);
    }

    const existing = await findUserByUsername(db, username);
    if (existing) {
        return json({ error: 'Username already taken' }, 409);
    }

    const countResult = await db.prepare('SELECT COUNT(*) as cnt FROM users').first();
    const isFirstUser = countResult.cnt === 0;
    const role = isFirstUser ? 'admin' : 'user';

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    const user = await createUser(db, username, passwordHash, salt, role);
    await updateLastLogin(db, user.id);

    const secret = env.JWT_SECRET || 'nosr-default-secret-change-me';
    const token = await createToken(
        { role: user.role, sub: user.username, uid: user.id },
        secret,
        '168h'
    );

    const response = json({ success: true, role: user.role, username: user.username });
    setCookie(response, 'nosr_token', token, 604800);
    return response;
}
