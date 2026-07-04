/**
 * auth.js — 认证模块
 * 管理登录/登出 UI 和状态
 */

import { API, $, showToast } from './utils.js';

let currentRole = null;

export function getRole() { return currentRole; }
export function isAdmin() { return currentRole === 'admin'; }

export async function initAuth() {
    // 检查是否有已存在的会话
    try {
        const data = await API.auth.check();
        if (data.authenticated) {
            currentRole = data.role;
            showDashboard();
            return;
        }
    } catch { /* 无有效会话，显示登录页 */ }
    showLogin();
}

function showLogin() {
    const overlay = $('#loginOverlay');
    const form = $('#loginForm');
    const errorEl = $('#loginError');
    const input = $('#passwordInput');
    const guestBtn = $('#guestBtn');

    overlay.classList.remove('hidden');

    form.addEventListener('submit', async(e) => {
        e.preventDefault();
        const password = input.value.trim();
        if (!password) return;

        errorEl.textContent = '';
        try {
            const data = await API.auth.login(password);
            currentRole = data.role;
            showDashboard();
        } catch (err) {
            errorEl.textContent = '密码错误，请重试';
            input.value = '';
            input.focus();
        }
    });

    guestBtn.addEventListener('click', async() => {
        try {
            const data = await API.auth.login('guest');
            currentRole = data.role;
            showDashboard();
        } catch {
            // 如果 guest 密码未配置，直接用 'guest' 可能不行，尝试直接进入访客模式
            currentRole = 'visitor';
            showDashboard();
        }
    });

    input.focus();
}

function showDashboard() {
    const overlay = $('#loginOverlay');
    const dashboard = $('#dashboard');
    const topbar = $('#topBar');
    const roleBadge = $('#roleBadge');

    overlay.classList.add('hidden');
    dashboard.style.display = '';
    topbar.style.display = '';

    // 设置角色标记
    if (currentRole === 'admin') {
        roleBadge.textContent = '管理员';
        roleBadge.className = 'role-badge admin';
    } else {
        roleBadge.textContent = '访客';
        roleBadge.className = 'role-badge visitor';
        document.body.classList.add('visitor');
    }

    // 触发仪表盘初始化
    window.dispatchEvent(new CustomEvent('nosr:dashboard-ready', { detail: { role: currentRole } }));
}

export async function logout() {
    try { await API.auth.logout(); } catch { /* ignore */ }
    currentRole = null;
    location.reload();
}
