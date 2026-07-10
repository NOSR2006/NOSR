/**
 * 认证接口 — /api/auth
 * POST   → 登录（用户名密码 / 管理员密码 / 访客）
 * GET    → 检查登录状态
 * DELETE → 登出
 *
 * 注册接口在 /api/auth/register.js
 */

import { createToken, verifyToken } from '../../_middleware.js';
import { verifyPassword } from '../_crypto.js';
import { findUserByUsername, updateLastLogin, getUserProfile } from '../_db.js';

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function parseCookie(cookieHeader, name) {
    const match = (cookieHeader || '').match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
}

function setCookie(response, name, value, maxAge) {
    response.headers.set(
        'Set-Cookie',
        `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`
    );
}

function clearCookie(response, name) {
    response.headers.set('Set-Cookie', `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
}

// ===== 登录 =====
export async function onRequestPost(context) {
    const { request, env } = context;

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    const { username, password } = body;

    // —— 管理员密码登录（向后兼容）——
    if (!username && password) {
        const inputHash = await sha256(password);
        const adminHash = env.ADMIN_PASSWORD_HASH || '';

        if (adminHash && inputHash === adminHash) {
            const secret = env.JWT_SECRET || 'nosr-default-secret-change-me';
            const token = await createToken({ role: 'admin', sub: 'admin' }, secret, '168h');
            const response = json({ success: true, role: 'admin', username: 'admin' });
            setCookie(response, 'nosr_token', token, 604800);
            return response;
        }

        // 访客
        if (!password || password === 'guest') {
            const secret = env.JWT_SECRET || 'nosr-default-secret-change-me';
            const token = await createToken({ role: 'visitor', sub: 'guest' }, secret, '24h');
            const response = json({ success: true, role: 'visitor', username: 'guest' });
            setCookie(response, 'nosr_token', token, 86400);
            return response;
        }

        return json({ error: 'Incorrect password' }, 401);
    }

    // —— 用户名 + 密码登录（D1 用户）——
    if (username && password) {
        const db = env.NOSR_DB;
        if (!db) {
            return json({ error: 'Database not configured' }, 500);
        }

        const user = await findUserByUsername(db, username);
        if (!user) {
            return json({ error: 'User not found' }, 401);
        }

        const valid = await verifyPassword(password, user.salt, user.password_hash);
        if (!valid) {
            return json({ error: 'Incorrect password' }, 401);
        }

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

    return json({ error: 'Username and password required' }, 400);
}

// ===== 登出 =====
export async function onRequestDelete(context) {
    const response = json({ success: true });
    clearCookie(response, 'nosr_token');
    return response;
}

// ===== 检查状态 =====
export async function onRequestGet(context) {
    const { request, env } = context;
    const token = parseCookie(request.headers.get('Cookie'), 'nosr_token');

    if (!token) {
        return json({ authenticated: false });
    }

    const secret = env.JWT_SECRET || 'nosr-default-secret-change-me';
    const payload = await verifyToken(token, secret);

    if (!payload) {
        return json({ authenticated: false });
    }

    let profile = null;
    if (payload.uid && env.NOSR_DB) {
        try {
            profile = await getUserProfile(env.NOSR_DB, payload.uid);
        } catch { /* ignore */ }
    }

    return json({
        authenticated: true,
        role: payload.role || null,
        username: profile?.username || payload.sub || null,
        profile: profile ? {
            display_name: profile.display_name,
            bio: profile.bio
        } : null
    });
}
