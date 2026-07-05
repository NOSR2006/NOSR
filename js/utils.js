/**
 * utils.js — 共享工具函数
 * API 请求封装、DOM 工具、通知、时间格式化
 */

// ===== API 请求 =====
export async function api(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 秒超时

    const config = {
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        ...options,
    };

    try {
        const res = await fetch(url, config);
        clearTimeout(timeout);
        const data = await res.json();

        if (!res.ok) {
            if (res.status === 401) {
                window.dispatchEvent(new CustomEvent('nosr:logout'));
                throw new Error('Session expired');
            }
            throw new Error(data.error || `HTTP ${res.status}`);
        }
        return data;
    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
            console.error(`API Timeout [${url}]`);
            throw new Error('请求超时，请检查网络连接');
        }
        if (err.message !== 'Session expired') {
            console.error(`API Error [${url}]:`, err.message);
        }
        throw err;
    }
}

export const API = {
    auth: {
        login: (password) => api('/api/auth', {
            method: 'POST',
            body: JSON.stringify({ password })
        }),
        logout: () => api('/api/auth', { method: 'DELETE' }),
        check: () => api('/api/auth'),
    },
    bookmarks: {
        list: () => api('/api/bookmarks'),
        add: (data) => api('/api/bookmarks', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api(`/api/bookmarks?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        remove: (id) => api(`/api/bookmarks?id=${id}`, { method: 'DELETE' }),
    },
    rss: {
        items: () => api('/api/rss'),
        feeds: () => api('/api/rss/feeds'),
        addFeed: (data) => api('/api/rss/feeds', { method: 'POST', body: JSON.stringify(data) }),
        removeFeed: (id) => api(`/api/rss/feeds?id=${id}`, { method: 'DELETE' }),
    },
    monitor: {
        status: (refresh = false) => api(`/api/monitor${refresh ? '?refresh=1' : ''}`),
        addTarget: (data) => api('/api/monitor/target', { method: 'POST', body: JSON.stringify(data) }),
        removeTarget: (id) => api(`/api/monitor/target?id=${id}`, { method: 'DELETE' }),
    },
};

// ===== DOM 工具 =====
export const $ = (sel, parent = document) => parent.querySelector(sel);

// ===== 时间格式化 =====
export function timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = (now - then) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
    return new Date(dateStr).toLocaleDateString('zh-CN');
}

export function formatTime(date) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function formatDate(date) {
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

// ===== Toast 通知 =====
export function showToast(msg, type = 'info', duration = 2500) {
    const existing = $('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    toast.style.cssText = `
        position:fixed; bottom:2rem; left:50%; transform:translateX(-50%);
        padding:0.6rem 1.5rem; border-radius:0.5rem; font-size:0.85rem;
        z-index:9999; animation: fadeInUp 0.3s ease;
        background:${type === 'error' ? 'var(--color-danger)' : type === 'success' ? 'var(--color-success)' : 'var(--color-bg-panel)'};
        color:#fff; border:1px solid var(--color-border-subtle);
        box-shadow: var(--shadow-panel);
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s'; }, duration - 300);
    setTimeout(() => toast.remove(), duration);
}

// ===== HTML 转义 =====
export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
