/**
 * KV 数据访问层 — 统一的存储操作
 * 所有数据以 JSON 字符串存储在 Cloudflare KV 中
 */

const KV_PREFIX = 'nosr:';

function kvKey(namespace, key) {
    return `${KV_PREFIX}${namespace}:${key}`;
}

// ===== 通用操作 =====

async function getJSON(env, namespace, key) {
    const raw = await env.NOSR_KV.get(kvKey(namespace, key));
    return raw ? JSON.parse(raw) : null;
}

async function putJSON(env, namespace, key, data) {
    await env.NOSR_KV.put(kvKey(namespace, key), JSON.stringify(data));
}

async function deleteKey(env, namespace, key) {
    await env.NOSR_KV.delete(kvKey(namespace, key));
}

async function listKeys(env, namespace, prefix = '') {
    const fullPrefix = kvKey(namespace, prefix);
    const result = await env.NOSR_KV.list({ prefix: fullPrefix });
    return result.keys.map(k => k.name.replace(`${KV_PREFIX}${namespace}:`, ''));
}

// ===== Todos =====

async function getTodos(env, userId = 'admin') {
    const data = await getJSON(env, 'todos', userId);
    return data || [];
}

async function saveTodos(env, todos, userId = 'admin') {
    await putJSON(env, 'todos', userId, todos);
}

// ===== Notes =====

async function getNotes(env, userId = 'admin') {
    const data = await getJSON(env, 'notes', userId);
    return data || [];
}

async function saveNotes(env, notes, userId = 'admin') {
    await putJSON(env, 'notes', userId, notes);
}

// ===== Bookmarks =====

async function getBookmarks(env, userId = 'admin') {
    const data = await getJSON(env, 'bookmarks', userId);
    return data || { categories: [], items: [] };
}

async function saveBookmarks(env, bookmarks, userId = 'admin') {
    await putJSON(env, 'bookmarks', userId, bookmarks);
}

// ===== RSS Feeds =====

async function getRssFeeds(env, userId = 'admin') {
    const data = await getJSON(env, 'rss_feeds', userId);
    return data || { feeds: [] };
}

async function saveRssFeeds(env, feeds, userId = 'admin') {
    await putJSON(env, 'rss_feeds', userId, feeds);
}

// ===== Monitor Targets =====

async function getMonitorTargets(env, userId = 'admin') {
    const data = await getJSON(env, 'monitor', userId);
    return data || { targets: [] };
}

async function saveMonitorTargets(env, targets, userId = 'admin') {
    await putJSON(env, 'monitor', userId, targets);
}

// ===== 站点配置 =====

async function getSiteConfig(env) {
    return await getJSON(env, 'config', 'site') || {};
}

async function saveSiteConfig(env, config) {
    await putJSON(env, 'config', 'site', config);
}

export {
    getJSON, putJSON, deleteKey, listKeys,
    getTodos, saveTodos,
    getNotes, saveNotes,
    getBookmarks, saveBookmarks,
    getRssFeeds, saveRssFeeds,
    getMonitorTargets, saveMonitorTargets,
    getSiteConfig, saveSiteConfig
};
