/**
 * dashboard.js — 仪表盘主入口
 * 面板模块采用动态 import，仅在登录后按需加载
 */

console.log('NOSR Dashboard v260705a');

import { initAuth, logout } from './auth.js?v=260705a';
import { $, showToast } from './utils.js?v=260705a';

// ===== 主初始化 =====
async function init() {
    // 1. 认证 (auth.js 立即加载，它很小)
    await initAuth();

    // 2. 仪表盘就绪 → 按需加载面板
    window.addEventListener('nosr:dashboard-ready', async (e) => {
        const role = e.detail.role;
        console.log(`NOSR Dashboard 已就绪 — 角色: ${role}`);

        // 动态加载各模块，并行不阻塞
        const load = (path) => import(`./modules/${path}`).catch(() => null);

        const [clock, rng, bookmarks, rss, monitor] =
            await Promise.allSettled([
                load('clock.js'),   load('rng.js'),
                load('bookmarks.js'), load('rss.js'),
                load('monitor.js'),
            ]);

        // 逐个初始化
        const inits = [
            clock.value      ?.initClock(),
            rng.value        ?.initRNG(),
            bookmarks.value  ?.initBookmarks(),
            rss.value        ?.initRSS(),
            monitor.value    ?.initMonitor(),
        ].filter(Boolean);
        await Promise.allSettled(inits);

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
