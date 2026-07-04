/**
 * dashboard.js — 仪表盘主入口
 * 协调所有模块的初始化
 */

import { initAuth, logout, isAdmin, getRole } from './auth.js';
import { initClock } from './modules/clock.js';
import { initWeather } from './modules/weather.js';
import { initTodos } from './modules/todos.js';
import { initNotes } from './modules/notes.js';
import { initBookmarks } from './modules/bookmarks.js';
import { initRSS } from './modules/rss.js';
import { initMonitor } from './modules/monitor.js';
import { $, showToast } from './utils.js';

// ===== 主初始化 =====
async function init() {
    // 1. 认证
    await initAuth();

    // 2. 等待仪表盘就绪
    window.addEventListener('nosr:dashboard-ready', async(e) => {
        const role = e.detail.role;
        console.log(`NOSR Dashboard 已就绪 — 角色: ${role}`);

        // 并行初始化所有模块
        await Promise.allSettled([
            initClock(),
            initWeather(),
            initTodos(),
            initNotes(),
            initBookmarks(),
            initRSS(),
            initMonitor(),
        ]);

        if (role === 'admin') {
            showToast('欢迎回来', 'info', 2000);
        }
    });

    // 3. 全局事件
    setupGlobalEvents();
}

// ===== 全局事件 =====
function setupGlobalEvents() {
    // 登出
    $('#logoutBtn').addEventListener('click', logout);

    // 刷新全部
    $('#refreshBtn').addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('nosr:refresh'));
        showToast('正在刷新...', 'info', 1500);
    });

    // 监听登出事件（token 过期等）
    window.addEventListener('nosr:logout', () => {
        showToast('会话已过期，请重新登录', 'error', 3000);
        setTimeout(() => location.reload(), 1500);
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        // Ctrl+K 聚焦搜索 / 快捷添加 Todo
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            if (isAdmin()) {
                const addBtn = $('#addTodoBtn');
                if (addBtn) addBtn.click();
            }
        }
        // Ctrl+Shift+N 新建笔记
        if (e.ctrlKey && e.shiftKey && e.key === 'N') {
            e.preventDefault();
            if (isAdmin()) {
                const noteBtn = $('#addNoteBtn');
                if (noteBtn) noteBtn.click();
            }
        }
    });
}

// ===== 启动 =====
init();
