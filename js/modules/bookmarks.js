/**
 * bookmarks.js — 快捷入口模块
 */

import { API, $, showToast, escapeHtml } from '../utils.js?v=260709v';
import { isAdmin } from '../auth.js?v=260709v';

export async function initBookmarks() {
    const grid = $('#bookmarksGrid');

    // 内置书签
    const builtin = [
        { id: 'gh', title: 'GitHub', url: 'https://github.com', icon: 'fa-brands fa-github' },
        { id: 'gm', title: 'Gmail', url: 'https://mail.google.com', icon: 'fa-solid fa-envelope' },
        { id: 'cg', title: 'ChatGPT', url: 'https://chatgpt.com', icon: 'fa-solid fa-robot' },
        { id: 'al', title: '网盘', url: 'https://alist.nosr.top', icon: 'fa-solid fa-cloud' },
        { id: 'db', title: '面板', url: 'https://dash.nosr.top', icon: 'fa-solid fa-folder-closed' },
        { id: 'bw', title: '密码', url: 'https://bitwarden.nosr.top', icon: 'fa-solid fa-key' },
    ];

    let customBookmarks = [];

    async function refresh() {
        try {
            const data = await API.bookmarks.list();
            customBookmarks = data.items || [];
        } catch { customBookmarks = []; }
        render();
    }

    function render() {
        const all = [...builtin, ...customBookmarks];

        grid.innerHTML = all.map(bm => `
            <a href="${escapeHtml(bm.url)}" target="_blank" rel="noopener" class="bookmark-item"
               style="position:relative" data-id="${bm.id}">
                <i class="${escapeHtml(bm.icon)}"></i>
                <span>${escapeHtml(bm.title)}</span>
                ${isAdmin() && !builtin.find(b => b.id === bm.id) ?
                    `<span class="bm-delete" data-delete="${bm.id}" title="删除"><i class="fa-solid fa-xmark"></i></span>` : ''}
            </a>
        `).join('');

        // 删除自定义书签
        grid.querySelectorAll('.bm-delete').forEach(btn => {
            btn.addEventListener('click', async(e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = btn.dataset.delete;
                await API.bookmarks.remove(id);
                showToast('已删除', 'success');
                await refresh();
            });
        });
    }

    // 添加书签按钮（在面板头部）
    $('#addBookmarkBtn').addEventListener('click', () => {
        const title = prompt('书签名称：');
        if (!title) return;
        const url = prompt('书签链接：');
        if (!url) return;
        const icon = prompt('图标类名（如 fa-brands fa-github）：', 'fa-solid fa-link');

        API.bookmarks.add({ title, url, icon }).then(() => {
            showToast('已添加', 'success');
            refresh();
        }).catch(err => showToast(err.message, 'error'));
    });

    await refresh();
}
