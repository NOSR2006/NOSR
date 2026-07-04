/**
 * notes.js — 速记笔记模块
 */

import { API, $, showToast, escapeHtml } from './utils.js';
import { isAdmin } from './auth.js';

export async function initNotes() {
    const list = $('#noteList');
    const addBtn = $('#addNoteBtn');
    const editor = $('#noteEditor');
    const titleInput = $('#noteTitleInput');
    const contentInput = $('#noteContentInput');
    const saveBtn = $('#noteSaveBtn');
    const cancelBtn = $('#noteCancelBtn');

    let notes = [];
    let editingId = null;

    async function refresh() {
        try {
            notes = await API.notes.list();
            render();
        } catch { /* offline */ }
    }

    function render() {
        if (notes.length === 0) {
            list.innerHTML = '<p class="empty-hint">暂无笔记，点击 + 开始记录</p>';
        } else {
            const sorted = [
                ...notes.filter(n => n.pinned),
                ...notes.filter(n => !n.pinned).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
            ];
            list.innerHTML = sorted.map(note => `
                <div class="note-card ${note.pinned ? 'pinned' : ''}" data-id="${note.id}">
                    <div class="note-card-title">${escapeHtml(note.title || '无标题')}</div>
                    <div class="note-card-preview">${escapeHtml(note.content?.slice(0, 60) || '空内容')}</div>
                </div>
            `).join('');
        }
    }

    function openEditor(note = null) {
        editingId = note?.id || null;
        titleInput.value = note?.title || '';
        contentInput.value = note?.content || '';
        editor.classList.remove('hidden');
        titleInput.focus();
    }

    function closeEditor() {
        editingId = null;
        titleInput.value = '';
        contentInput.value = '';
        editor.classList.add('hidden');
    }

    list.addEventListener('click', (e) => {
        if (!isAdmin()) return;
        const card = e.target.closest('.note-card');
        if (!card) return;
        const id = card.dataset.id;
        const note = notes.find(n => n.id === id);
        if (note) openEditor(note);
    });

    addBtn.addEventListener('click', () => openEditor());

    saveBtn.addEventListener('click', async() => {
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        if (!title && !content) return;

        if (editingId) {
            await API.notes.update(editingId, { title, content });
            showToast('已更新', 'success');
        } else {
            const pinned = notes.length === 0; // 第一条自动置顶
            await API.notes.add({ title, content, pinned });
            showToast('已保存', 'success');
        }
        closeEditor();
        await refresh();
    });

    cancelBtn.addEventListener('click', closeEditor);

    contentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cancelBtn.click();
    });

    // 在笔记卡片上双击切换置顶
    list.addEventListener('dblclick', async(e) => {
        if (!isAdmin()) return;
        const card = e.target.closest('.note-card');
        if (!card) return;
        const id = card.dataset.id;
        const note = notes.find(n => n.id === id);
        if (note) {
            await API.notes.update(id, { pinned: !note.pinned });
            await refresh();
        }
    });

    // 右键菜单：删除
    list.addEventListener('contextmenu', async(e) => {
        if (!isAdmin()) return;
        const card = e.target.closest('.note-card');
        if (!card) return;
        e.preventDefault();
        const id = card.dataset.id;
        if (confirm('确认删除这条笔记？')) {
            await API.notes.remove(id);
            showToast('已删除', 'success');
            await refresh();
        }
    });

    await refresh();
}
