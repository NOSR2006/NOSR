/**
 * dashboard.js — NOSR's RNG 主入口
 * 面板模块采用动态 import，仅在登录后按需加载
 * v260711d
 */

console.log("NOSR's RNG v260711d");

import { initAuth, logout } from './auth.js?v=260711d';
import { $, showToast } from './utils.js?v=260711d';

// ===== 主初始化 =====
async function init() {
    // 1. 认证
    await initAuth();

    // 2. 仪表盘就绪 → 按需加载 RNG + 持久化
    window.addEventListener('nosr:dashboard-ready', async (e) => {
        const role = e.detail.role;
        const isGuest = role === 'visitor';
        console.log(`NOSR's RNG 已就绪 — 角色: ${role}`);

        // 动态加载模块
        const load = (path) => import(`./modules/${path}?v=260711d`).catch(() => null);

        const [rngM, persistM, syncM] = await Promise.allSettled([
            load('rng.js'),
            load('rng-persistence.js'),
            load('rng-sync.js'),
        ]);

        const persist = persistM.value;
        const sync = syncM.value;

        // 设置持久化钩子（rng.js 会在 initRNG 中调用）
        if (persist) {
            await persist.openDB().catch(() => {});

            window.__rngHooks = {
                // 加载状态：从服务端合并或从本地恢复
                onLoad: async () => {
                    if (sync && !isGuest) {
                        return await sync.loadAndMerge();
                    }
                    // 访客：仅从本地加载
                    return await persist.loadState();
                },
                // 每次 Roll 后：记录到 IndexedDB + 同步队列
                onRoll: async (rollData) => {
                    await persist.addPendingRoll(rollData);
                    // 更新本地状态缓存
                    const state = window.__rngState;
                    if (state) {
                        await persist.saveState(state);
                        await persist.saveCollection(state.hits);
                    }
                    // 触发同步（如果积累了足够多）
                    if (sync && !isGuest) {
                        await sync.recordRoll(rollData);
                    }
                },
            };

            // 初始化同步器
            if (sync && !isGuest) {
                sync.initSync({ guest: false });
            }
        }

        // 初始化 RNG（持久化钩子已设置，initRNG 会自动加载状态）
        const rngInit = rngM.value?.initRNG();
        if (rngInit) await rngInit;

        if (role === 'admin') {
            showToast('欢迎回来', 'info', 2000);
        } else if (!isGuest) {
            const state = window.__rngState;
            if (state?.total > 0) {
                showToast(`已恢复 ${state.total} 次 Roll 记录`, 'info', 2500);
            }
        }
    });

    // 3. 全局事件
    setupGlobalEvents();
}

// ===== 全局事件 =====
function setupGlobalEvents() {
    $('#logoutBtn').addEventListener('click', async () => {
        // 登出前最后同步一次
        try {
            const syncM = await import('./modules/rng-sync.js?v=260711d');
            await syncM.flush();
            const persistM = await import('./modules/rng-persistence.js?v=260711d');
            await persistM.clearAll();
        } catch { /* ignore */ }
        logout();
    });

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
