/**
 * rss.js — RSS 信息流模块
 */

import { API, $, showToast, escapeHtml, timeAgo } from '../utils.js?v=260709v';
import { isAdmin } from '../auth.js?v=260709v';

export async function initRSS() {
    const list = $('#rssList');
    const addBtn = $('#addRssBtn');
    const inputArea = $('#rssInput');
    const urlInput = $('#rssUrlInput');
    const titleInput = $('#rssTitleInput');
    const saveBtn = $('#rssSaveBtn');
    const cancelBtn = $('#rssCancelBtn');

    async function refresh() {
        list.innerHTML = '<p class="empty-hint" style="padding:1rem">加载中...</p>';
        try {
            const data = await API.rss.items();
            render(data);
        } catch {
            list.innerHTML = '<p class="empty-hint">无法加载信息流</p>';
        }
    }

    function render(data) {
        const { items, feeds } = data;

        if (!items || items.length === 0) {
            list.innerHTML = `
                <p class="empty-hint">暂无订阅源</p>
                ${feeds && feeds.length > 0 ? `<p class="empty-hint" style="font-size:0.75rem;color:var(--color-text-muted)">
                    已添加 ${feeds.length} 个源，但暂无内容</p>` : ''}
            `;
            return;
        }

        list.innerHTML = items.slice(0, 30).map(item => `
            <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener" class="rss-item"
               title="${escapeHtml(item.title)}">
                <div class="rss-item-title">${escapeHtml(item.title)}</div>
                <div class="rss-item-meta">
                    <span>${escapeHtml(item.feedTitle || '')}</span>
                    <span>${timeAgo(item.pubDate)}</span>
                </div>
            </a>
        `).join('');

        // 显示订阅源管理（仅管理员）
        if (isAdmin() && feeds?.length > 0) {
            const feedInfo = document.createElement('div');
            feedInfo.style.cssText = `
                padding:0.5rem 0.75rem; font-size:0.7rem; color:var(--color-text-muted);
                border-top:1px solid var(--color-border-subtle); margin-top:0.5rem;
                display:flex; flex-wrap:wrap; gap:0.5rem;
            `;
            feedInfo.innerHTML = feeds.map(f => `
                <span style="display:flex;align-items:center;gap:0.3rem;background:var(--color-bg-input);
                    padding:0.15rem 0.5rem;border-radius:0.5rem;">
                    ${escapeHtml(f.title || f.url)}
                    <span style="cursor:pointer;color:var(--color-danger)" data-delete-feed="${f.id}">
                        <i class="fa-solid fa-xmark"></i>
                    </span>
                </span>
            `).join('');
            list.appendChild(feedInfo);

            feedInfo.querySelectorAll('[data-delete-feed]').forEach(span => {
                span.addEventListener('click', async(e) => {
                    e.preventDefault();
                    const id = span.dataset.deleteFeed;
                    await API.rss.removeFeed(id);
                    showToast('已移除订阅源', 'success');
                    await refresh();
                });
            });
        }
    }

    addBtn.addEventListener('click', () => inputArea.classList.toggle('hidden'));

    saveBtn.addEventListener('click', async() => {
        const url = urlInput.value.trim();
        if (!url) return;
        try {
            await API.rss.addFeed({ url, title: titleInput.value.trim() || undefined });
            urlInput.value = '';
            titleInput.value = '';
            inputArea.classList.add('hidden');
            showToast('订阅源已添加', 'success');
            await refresh();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    cancelBtn.addEventListener('click', () => {
        urlInput.value = '';
        titleInput.value = '';
        inputArea.classList.add('hidden');
    });

    await refresh();
}
