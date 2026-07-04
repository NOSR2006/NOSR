/**
 * monitor.js — 服务状态监控模块
 */

import { API, $, showToast, escapeHtml } from './utils.js';
import { isAdmin } from './auth.js';

export async function initMonitor() {
    const list = $('#monitorList');
    const addBtn = $('#addMonitorBtn');
    const inputArea = $('#monitorInput');
    const nameInput = $('#monitorNameInput');
    const urlInput = $('#monitorUrlInput');
    const saveBtn = $('#monitorSaveBtn');
    const cancelBtn = $('#monitorCancelBtn');

    async function refresh() {
        list.innerHTML = '<p class="empty-hint" style="padding:1rem">检测中...</p>';
        try {
            const data = await API.monitor.status();
            render(data);
        } catch {
            list.innerHTML = '<p class="empty-hint">无法获取状态</p>';
        }
    }

    function render(data) {
        const { results, summary, targets } = data;

        if (!results || results.length === 0) {
            list.innerHTML = '<p class="empty-hint">暂无监控目标<br><span style="font-size:0.75rem;color:var(--color-text-muted)">点击 + 添加需要监控的服务</span></p>';
            return;
        }

        list.innerHTML = results.map(r => `
            <div class="monitor-item">
                <span class="monitor-status ${r.status}"></span>
                <span class="monitor-name" title="${escapeHtml(r.url)}">${escapeHtml(r.name)}</span>
                <span class="monitor-latency">${r.latency}ms</span>
                ${isAdmin() ? `<span class="monitor-delete" data-delete="${r.id}"><i class="fa-solid fa-xmark"></i></span>` : ''}
            </div>
        `).join('');

        // 汇总信息
        if (summary) {
            const summaryEl = document.createElement('div');
            summaryEl.style.cssText = `
                padding:0.4rem 0.75rem; font-size:0.7rem; color:var(--color-text-muted);
                border-top:1px solid var(--color-border-subtle); margin-top:0.5rem;
                display:flex; gap:1rem;
            `;
            summaryEl.innerHTML = `
                <span style="color:var(--color-success)">● ${summary.online} 在线</span>
                ${summary.degraded ? `<span style="color:var(--color-warning)">● ${summary.degraded} 降级</span>` : ''}
                ${summary.offline ? `<span style="color:var(--color-danger)">● ${summary.offline} 离线</span>` : ''}
            `;
            list.appendChild(summaryEl);
        }

        // 删除按钮事件（限管理员）
        list.querySelectorAll('.monitor-delete').forEach(btn => {
            btn.addEventListener('click', async() => {
                const id = btn.dataset.delete;
                await API.monitor.removeTarget(id);
                showToast('已移除', 'success');
                await refresh();
            });
        });
    }

    addBtn.addEventListener('click', () => inputArea.classList.toggle('hidden'));

    saveBtn.addEventListener('click', async() => {
        const name = nameInput.value.trim();
        const url = urlInput.value.trim();
        if (!name || !url) return;
        try {
            await API.monitor.addTarget({ name, url });
            nameInput.value = '';
            urlInput.value = '';
            inputArea.classList.add('hidden');
            showToast('已添加监控', 'success');
            await refresh();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    cancelBtn.addEventListener('click', () => {
        nameInput.value = '';
        urlInput.value = '';
        inputArea.classList.add('hidden');
    });

    await refresh();

    // 每 60 秒自动刷新
    setInterval(refresh, 60000);
}
