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

export {
    getJSON, putJSON, deleteKey, listKeys,
};
