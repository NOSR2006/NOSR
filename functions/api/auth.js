/**
 * 登录接口
 * POST /api/auth/login
 * Body: { password: string }
 * Response: { success: boolean, role: 'admin' | 'visitor' }
 * 同时设置 httpOnly cookie: nosr_token
 */

import { createToken, verifyPassword } from '../_middleware.js';

// SHA-256 哈希（与中间件中的 verifyPassword 配合使用）
async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
    const { request, env } = context;

    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const { password } = body;
    if (!password) {
        return new Response(JSON.stringify({ error: 'Password required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const inputHash = await sha256(password);
    const adminHash = env.ADMIN_PASSWORD_HASH || await sha256('admin');
    const visitorHash = env.VISITOR_PASSWORD_HASH || await sha256('visitor');

    let role = null;
    let expiresIn = '24h';

    if (inputHash === adminHash) {
        role = 'admin';
        expiresIn = '168h'; // 管理员 7 天
    } else if (inputHash === visitorHash) {
        role = 'visitor';
        // 访客默认密码为空：允许无密码访客访问
    }

    // 如果没有配置访客密码且不是管理员密码，允许空密码或默认密码
    if (!role && (!password || password === 'guest')) {
        role = 'visitor';
    }

    if (!role) {
        return new Response(JSON.stringify({ error: 'Incorrect password' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const token = await createToken(
        { role, sub: role },
        env.JWT_SECRET || 'nosr-default-secret-change-me',
        expiresIn
    );

    const response = new Response(JSON.stringify({ success: true, role }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });

    response.headers.set(
        'Set-Cookie',
        `nosr_token=${token}; Path=/; Max-Age=${role === 'admin' ? 604800 : 86400}; HttpOnly; SameSite=Lax`
    );

    return response;
}

/**
 * 登出接口
 * POST /api/auth/logout
 */
export async function onRequestPost_logout(context) {
    const response = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
    response.headers.set('Set-Cookie', 'nosr_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
    return response;
}

/**
 * 检查登录状态
 * GET /api/auth/check
 */
export async function onRequestGet(context) {
    const { request, env } = context;
    const cookieHeader = request.headers.get('Cookie') || '';
    const tokenMatch = cookieHeader.match(/nosr_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ authenticated: false }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 手动验证（绕过中间件因为 /api/auth/check 在公开路径中）
    const { verifyToken: vt } = await import('../_middleware.js');
    const payload = await vt(token, env.JWT_SECRET || 'nosr-default-secret-change-me');

    if (!payload) {
        return new Response(JSON.stringify({ authenticated: false }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ authenticated: true, role: payload.role }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
