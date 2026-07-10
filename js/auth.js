/**
 * auth.js — 认证模块
 * 管理登录/注册/登出 UI 和状态
 * v260711d — Phase 2: 用户名+密码注册/登录 + D1
 */

import { API, $ } from './utils.js?v=260711d';

let currentRole = null;
let currentUsername = null;

export function getRole() { return currentRole; }
export function getUsername() { return currentUsername; }
export function isAdmin() { return currentRole === 'admin'; }

export function initAuth() {
    showLogin();

    // 后台检查是否已有有效会话
    API.auth.check()
        .then(data => {
            if (data.authenticated) {
                currentRole = data.role;
                currentUsername = data.username || data.role;
                showDashboard();
            }
        })
        .catch(() => { /* 忽略检查失败，留在登录页 */ });
}

function showLogin() {
    const overlay = $('#loginOverlay');
    const loginForm = $('#loginForm');
    const registerForm = $('#registerForm');
    const loginError = $('#loginError');
    const registerError = $('#registerError');
    const guestBtn = $('#guestBtn');
    const tabLogin = $('#tabLogin');
    const tabRegister = $('#tabRegister');
    const loginUsername = $('#loginUsername');
    const loginPassword = $('#loginPassword');
    const regUsername = $('#regUsername');
    const regPassword = $('#regPassword');

    overlay.classList.remove('hidden');

    const tabsContainer = $('.login-tabs');

    // ===== Tab 切换 =====
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        tabsContainer.removeAttribute('data-active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginError.textContent = '';
        registerError.textContent = '';
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        tabsContainer.setAttribute('data-active', 'register');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        loginError.textContent = '';
        registerError.textContent = '';
    });

    // ===== 登录 =====
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = loginUsername.value.trim();
        const password = loginPassword.value.trim();
        if (!username || !password) return;

        loginError.textContent = '';
        const btn = loginForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            const data = await API.auth.login(username, password);
            currentRole = data.role;
            currentUsername = data.username || username;
            showDashboard();
        } catch (err) {
            loginError.textContent = err.message || '登录失败';
            loginPassword.value = '';
            loginPassword.focus();
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i>';
        }
    });

    // ===== 注册 =====
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = regUsername.value.trim();
        const password = regPassword.value.trim();
        if (!username || !password) return;

        registerError.textContent = '';
        const btn = registerForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            const data = await API.auth.register(username, password);
            currentRole = data.role;
            currentUsername = data.username || username;
            showDashboard();
        } catch (err) {
            registerError.textContent = err.message || '注册失败';
            if (err.message?.includes('taken') || err.message?.includes('already')) {
                regUsername.focus();
            } else {
                regPassword.focus();
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-user-plus"></i>';
        }
    });

    // ===== 访客 =====
    guestBtn.addEventListener('click', async () => {
        guestBtn.disabled = true;
        guestBtn.textContent = '进入中...';

        try {
            // 发送无凭证登录请求
            const data = await API.auth.login('', 'guest');
            currentRole = data.role;
            currentUsername = 'guest';
            showDashboard();
        } catch {
            // API 失败时用纯前端访客模式
            currentRole = 'visitor';
            currentUsername = 'guest';
            showDashboard();
        } finally {
            guestBtn.disabled = false;
            guestBtn.textContent = '以访客身份浏览';
        }
    });

    // 回车支持
    loginUsername.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            loginPassword.focus();
        }
    });

    regUsername.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            regPassword.focus();
        }
    });

    loginUsername.focus();
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
    } else if (currentRole === 'user') {
        roleBadge.textContent = currentUsername || '用户';
        roleBadge.className = 'role-badge user';
    } else {
        roleBadge.textContent = '访客';
        roleBadge.className = 'role-badge visitor';
        document.body.classList.add('visitor');
    }

    window.dispatchEvent(new CustomEvent('nosr:dashboard-ready', {
        detail: { role: currentRole, username: currentUsername }
    }));
}

export async function logout() {
    try { await API.auth.logout(); } catch { /* ignore */ }
    currentRole = null;
    currentUsername = null;
    location.reload();
}
