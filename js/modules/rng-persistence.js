/**
 * rng-persistence.js — IndexedDB 本地存储
 * 离线优先：所有 Roll 结果立即写入 IndexedDB
 * v260711d
 */

const DB_NAME = 'nosr-rng';
const DB_VERSION = 1;

let db = null;

/**
 * 打开 IndexedDB
 */
export async function openDB() {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
            const _db = e.target.result;

            // RNG 状态
            if (!_db.objectStoreNames.contains('state')) {
                _db.createObjectStore('state');  // key-value store
            }

            // Roll 队列（待同步）
            if (!_db.objectStoreNames.contains('pendingRolls')) {
                const store = _db.createObjectStore('pendingRolls', { keyPath: 'rollNumber' });
                store.createIndex('rollNumber', 'rollNumber');
            }

            // 图鉴缓存
            if (!_db.objectStoreNames.contains('collection')) {
                _db.createObjectStore('collection', { keyPath: 'tier' });
            }
        };

        req.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };

        req.onerror = () => reject(req.error);
    });
}

// ===== State 操作 =====

/**
 * 保存 RNG 状态
 */
export async function saveState(state) {
    const _db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = _db.transaction('state', 'readwrite');
        tx.objectStore('state').put(state, 'rng');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * 加载 RNG 状态
 * @returns {Promise<{total, pity, hits}|null>}
 */
export async function loadState() {
    const _db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = _db.transaction('state', 'readonly');
        const req = tx.objectStore('state').get('rng');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

// ===== Pending Rolls 队列 =====

/**
 * 添加待同步的 Roll
 */
export async function addPendingRoll(roll) {
    const _db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = _db.transaction('pendingRolls', 'readwrite');
        tx.objectStore('pendingRolls').put(roll);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * 获取所有待同步的 Rolls
 */
export async function getPendingRolls() {
    const _db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = _db.transaction('pendingRolls', 'readonly');
        const req = tx.objectStore('pendingRolls').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

/**
 * 清除已同步的 Rolls
 */
export async function clearPendingRolls(rollNumbers) {
    const _db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = _db.transaction('pendingRolls', 'readwrite');
        const store = tx.objectStore('pendingRolls');
        for (const num of rollNumbers) {
            store.delete(num);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * 获取待同步数量
 */
export async function getPendingCount() {
    const _db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = _db.transaction('pendingRolls', 'readonly');
        const req = tx.objectStore('pendingRolls').count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// ===== Collection 缓存 =====

/**
 * 保存整个图鉴
 */
export async function saveCollection(hits) {
    const _db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = _db.transaction('collection', 'readwrite');
        const store = tx.objectStore('collection');
        store.clear();
        for (const [tier, count] of Object.entries(hits)) {
            if (count > 0) {
                store.put({ tier, count });
            }
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * 加载图鉴
 * @returns {Promise<Object>} { [tier]: count }
 */
export async function loadCollection() {
    const _db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = _db.transaction('collection', 'readonly');
        const req = tx.objectStore('collection').getAll();
        req.onsuccess = () => {
            const hits = {};
            for (const item of (req.result || [])) {
                hits[item.tier] = item.count;
            }
            resolve(hits);
        };
        req.onerror = () => reject(req.error);
    });
}

// ===== 清理 =====

/**
 * 清除所有本地数据（登出时调用）
 */
export async function clearAll() {
    const _db = await openDB();
    return new Promise((resolve) => {
        const storeNames = ['state', 'pendingRolls', 'collection'];
        const tx = _db.transaction(storeNames, 'readwrite');
        for (const name of storeNames) {
            tx.objectStore(name).clear();
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve(); // ignore errors
    });
}
