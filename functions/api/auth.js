/**
 * 认证接口 — 统一处理 /api/auth
 * POST   /api/auth  → 登录
 * GET    /api/auth  → 检查登录状态
 * DELETE /api/auth  → 登出
 */

import { createToken, verifyToken } from '../_middleware.js';

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
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid JSON' }, 400);
    }

    const { password } = body;
    if (!password) {
        return json({ error: 'Password required' }, 400);
    }

    const inputHash = await sha256(password);
    const adminHash = env.ADMIN_PASSWORD_HASH || '';
    const visitorHash = env.VISITOR_PASSWORD_HASH || '';

    let role = null;
    let expiresIn = '24h';

    if (adminHash && inputHash === adminHash) {
        role = 'admin';
        expiresIn = '168h';
    } else if (visitorHash && inputHash === visitorHash) {
        role = 'visitor';
    }

    // 未配置访客密码时，允许 "guest" 或无密码进入
    if (!role && (!password || password === 'guest')) {
        role = 'visitor';
    }

    if (!role) {
        return json({ error: 'Incorrect password' }, 401);
    }

    const secret = env.JWT_SECRET || 'nosr-default-secret-change-me';
    const token = await createToken({ role, sub: role }, secret, expiresIn);

    const response = json({ success: true, role });
    setCookie(response, 'nosr_token', token, role === 'admin' ? 604800 : 86400);

    return response;
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

    return json({
        authenticated: !!payload,
        role: payload?.role || null
    });
}
