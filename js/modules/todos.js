/**
 * todos.js — 待办事项模块
 */

import { API, $, $$, showToast, escapeHtml } from './utils.js';
import { isAdmin } from './auth.js';

export async function initTodos() {
    const list = $('#todoList');
    const addBtn = $('#addTodoBtn');
    const inputArea = $('#todoInput');
    const textInput = $('#todoTextInput');
    const prioritySelect = $('#todoPriority');
    const saveBtn = $('#todoSaveBtn');
    const cancelBtn = $('#todoCancelBtn');
    const countEl = $('#todoCount');

    let todos = [];

    async function refresh() {
        try {
            todos = await API.todos.list();
            render();
        } catch { /* offline */ }
    }

    function render() {
        const active = todos.filter(t => !t.completed);
        const done = todos.filter(t => t.completed);

        // 排序：优先级高的在前，然后按创建时间
        const sorted = [
            ...active.sort((a, b) => {
                const pri = { high: 0, medium: 1, low: 2 };
                return (pri[a.priority] || 1) - (pri[b.priority] || 1);
            }),
            ...done.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        ];

        if (sorted.length === 0) {
            list.innerHTML = '<p class="empty-hint">暂无待办事项</p>';
        } else {
            list.innerHTML = sorted.map(todo => `
                <div class="todo-item" data-id="${todo.id}">
                    <div class="todo-check ${todo.completed ? 'done' : ''}" data-action="toggle">
                        ${todo.completed ? '<i class="fa-solid fa-check"></i>' : ''}
                    </div>
                    <span class="todo-text ${todo.completed ? 'done' : ''}">${escapeHtml(todo.text)}</span>
                    ${!todo.completed ? `<span class="todo-priority ${todo.priority}">${priorityLabel(todo.priority)}</span>` : ''}
                    ${isAdmin() ? `<span class="todo-delete" data-action="delete"><i class="fa-solid fa-xmark"></i></span>` : ''}
                </div>
            `).join('');
        }

        countEl.textContent = active.length;
    }

    function priorityLabel(p) {
        return { high: '高', medium: '中', low: '低' } [p] || '中';
    }

    // 事件代理
    list.addEventListener('click', async(e) => {
        const item = e.target.closest('.todo-item');
        if (!item) return;
        const id = item.dataset.id;
        const action = e.target.closest('[data-action]')?.dataset.action;

        if (action === 'toggle') {
            const todo = todos.find(t => t.id === id);
            if (todo) {
                await API.todos.update(id, { completed: !todo.completed });
                await refresh();
            }
        }
        if (action === 'delete' && isAdmin()) {
            await API.todos.remove(id);
            await refresh();
            showToast('已删除', 'success');
        }
    });

    // 添加按钮
    addBtn.addEventListener('click', () => {
        inputArea.classList.toggle('hidden');
        if (!inputArea.classList.contains('hidden')) textInput.focus();
    });

    saveBtn.addEventListener('click', async() => {
        const text = textInput.value.trim();
        if (!text) return;
        await API.todos.add({
            text,
            priority: prioritySelect.value,
        });
        textInput.value = '';
        inputArea.classList.add('hidden');
        await refresh();
        showToast('已添加', 'success');
    });

    cancelBtn.addEventListener('click', () => {
        textInput.value = '';
        inputArea.classList.add('hidden');
    });

    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveBtn.click();
        if (e.key === 'Escape') cancelBtn.click();
    });

    await refresh();
}
