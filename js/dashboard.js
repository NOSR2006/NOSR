/**
 * dashboard.js — NOSR's RNG 主入口
 * 面板模块采用动态 import，仅在登录后按需加载
 */

console.log("NOSR's RNG v260711b");

import { initAuth, logout } from './auth.js?v=260711b';
import { $, showToast } from './utils.js?v=260711b';

// ===== 主初始化 =====
async function init() {
    // 1. 认证
    await initAuth();

    // 2. 仪表盘就绪 → 按需加载 RNG
    window.addEventListener('nosr:dashboard-ready', async (e) => {
        const role = e.detail.role;
        console.log(`NOSR's RNG 已就绪 — 角色: ${role}`);

        // 动态加载 RNG 模块
        const load = (path) => import(`./modules/${path}?v=260711b`).catch(() => null);

        const [rng] = await Promise.allSettled([
            load('rng.js'),
        ]);

        // 初始化 RNG
        const rngInit = rng.value?.initRNG();
        if (rngInit) await rngInit;

        if (role === 'admin') {
            showToast('欢迎回来', 'info', 2000);
        }
    });

    // 3. 全局事件
    setupGlobalEvents();
}

// ===== 全局事件 =====
function setupGlobalEvents() {
    $('#logoutBtn').addEventListener('click', logout);

    window.addEventListener('nosr:logout', () => {
        showToast('会话已过期，请重新登录', 'error', 3000);
        setTimeout(() => location.reload(), 1500);
    });

    // Space 键触发抽奖
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' && document.activeElement === document.body) {
            e.preventDefault();
            $('#rngRollBtn')?.click();
        }
    });
}

// ===== 启动 =====
init();
