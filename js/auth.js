/**
 * auth.js — 认证模块
 * 管理登录/登出 UI 和状态
 */

import { API, $ } from './utils.js?v=260709v';

let currentRole = null;

export function getRole() { return currentRole; }
export function isAdmin() { return currentRole === 'admin'; }

export function initAuth() {
    // 先挂事件监听器，再异步检查认证状态
    showLogin();

    // 后台检查是否已有有效会话
    API.auth.check()
        .then(data => {
            if (data.authenticated) {
                currentRole = data.role;
                showDashboard();
            }
        })
        .catch(() => { /* 忽略检查失败，留在登录页 */ });
}

function showLogin() {
    const overlay = $('#loginOverlay');
    const form = $('#loginForm');
    const errorEl = $('#loginError');
    const input = $('#passwordInput');
    const guestBtn = $('#guestBtn');

    // 确保登录页可见
    overlay.classList.remove('hidden');

    // 管理员登录
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = input.value.trim();
        if (!password) return;

        errorEl.textContent = '';
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = '...';

        try {
            const data = await API.auth.login(password);
            currentRole = data.role;
            showDashboard();
        } catch (err) {
            errorEl.textContent = err.message || '密码错误，请重试';
            input.value = '';
            input.focus();
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i>';
        }
    });

    // 访客登录
    guestBtn.addEventListener('click', async () => {
        guestBtn.disabled = true;
        guestBtn.textContent = '登录中...';

        try {
            const data = await API.auth.login('guest');
            currentRole = data.role;
            showDashboard();
        } catch {
            // API 失败时用仅前端标记的访客模式
            // 此时 API 调用会因为缺 token 被拒，但至少能看到界面框架
            currentRole = 'visitor';
            showDashboard();
        } finally {
            guestBtn.disabled = false;
            guestBtn.textContent = '以访客身份浏览';
        }
    });

    // 回车提交
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') form.dispatchEvent(new Event('submit'));
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

    if (currentRole === 'admin') {
        roleBadge.textContent = '管理员';
        roleBadge.className = 'role-badge admin';
    } else {
        roleBadge.textContent = '访客';
        roleBadge.className = 'role-badge visitor';
        document.body.classList.add('visitor');
    }

    window.dispatchEvent(new CustomEvent('nosr:dashboard-ready', { detail: { role: currentRole } }));
}

export async function logout() {
    try { await API.auth.logout(); } catch { /* ignore */ }
    currentRole = null;
    location.reload();
}
