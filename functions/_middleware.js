/**
 * 全局认证中间件
 * - /api/auth/* 路径直接放行
 * - /api/* 路径验证 JWT（管理员或访客）
 * - 静态资源直接放行
 * - 首页检查 cookie，无认证则注入登录页
 */

const PUBLIC_PATHS = ['/api/auth'];
const ADMIN_ONLY_PATHS = ['/api/bookmarks', '/api/rss/feeds', '/api/monitor/targets'];

function base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return atob(str);
}

function parseJwt(token) {
    try {
        const payload = JSON.parse(base64UrlDecode(token.split('.')[1]));
        return payload;
    } catch {
        return null;
    }
}

async function verifyToken(token, secret) {
    // 简化版 JWT 验证：HMAC-SHA256
    const encoder = new TextEncoder();
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    const data = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
        'raw', encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );

    const sig = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sig, encoder.encode(data));

    if (!valid) return null;

    const payload = parseJwt(token);
    if (!payload || payload.exp * 1000 < Date.now()) return null;
    return payload;
}

async function createToken(payload, secret, expiresIn = '24h') {
    const encoder = new TextEncoder();
    const header = { alg: 'HS256', typ: 'JWT' };

    const hours = expiresIn === '168h' ? 168 : 24;
    const exp = Math.floor(Date.now() / 1000) + hours * 3600;

    const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

    const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const payloadB64 = btoa(JSON.stringify(fullPayload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const data = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
        'raw', encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );

    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    return `${headerB64}.${payloadB64}.${sigB64}`;
}

// 简单的密码哈希（用于对比）
async function verifyPassword(password, hash) {
    // 使用 PBKDF2 简化验证，生产环境应用 bcrypt
    // 这里用简单 SHA-256 对比替代 bcrypt（Cloudflare Workers 无原生 bcrypt）
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === hash;
}

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // 静态资源直接放行
    if (path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2|html)$/)) {
        return context.next();
    }

    // 公开接口直接放行
    if (PUBLIC_PATHS.includes(path)) {
        return context.next();
    }

    // 检查 cookie 中的 token
    const cookieHeader = request.headers.get('Cookie') || '';
    const tokenMatch = cookieHeader.match(/nosr_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
        // API 请求返回 401
        if (path.startsWith('/api/')) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // 页面请求：返回登录页
        return context.next();
    }

    const payload = await verifyToken(token, env.JWT_SECRET || 'nosr-default-secret-change-me');
    if (!payload) {
        if (path.startsWith('/api/')) {
            return new Response(JSON.stringify({ error: 'Token expired or invalid' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // 清除过期 cookie，返回登录页
        const response = await context.next();
        response.headers.set('Set-Cookie', 'nosr_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
        return response;
    }

    // 将 payload 注入到请求上下文
    request.user = payload;

    // 管理员专用接口检查
    if (ADMIN_ONLY_PATHS.some(p => path.startsWith(p))) {
        if (payload.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Admin access required' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 将 env 和 user 注入到后续处理
    const response = await context.next();
    return response;
}

// 导出工具函数供其他 worker 使用
export { createToken, verifyToken, verifyPassword };
