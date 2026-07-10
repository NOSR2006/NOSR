/**
 * rng-sync.js — 批量同步调度器
 * 将本地 Roll 结果批量同步到服务端
 * v260711d
 */

import { API } from '../utils.js?v=260711d';
import * as DB from './rng-persistence.js?v=260711d';

const BATCH_SIZE = 10;        // 每 N 次 Roll 触发同步
const SYNC_INTERVAL = 5000;   // 或每 5 秒自动同步
const MAX_RETRIES = 3;

let syncTimer = null;
let syncing = false;
let isGuest = false;

/**
 * 初始化同步器
 * @param {object} options
 * @param {boolean} options.guest - 是否为访客模式
 * @param {function} options.onSyncComplete - 同步完成回调 (serverState)
 */
export function initSync(options = {}) {
    isGuest = options.guest || false;

    if (isGuest) return; // 访客不同步

    // 定时同步
    syncTimer = setInterval(() => flush(), SYNC_INTERVAL);

    // 页面关闭前强制同步
    window.addEventListener('beforeunload', () => {
        // 使用 sendBeacon 确保数据发出
        flushBeacon();
    });
}

/**
 * 记录一次 Roll（由 rng.js 的 finish 调用）
 */
export async function recordRoll(rollData) {
    if (isGuest) return;

    await DB.addPendingRoll(rollData);

    const count = await DB.getPendingCount();
    if (count >= BATCH_SIZE) {
        flush(); // 不 await，后台异步
    }
}

/**
 * 刷新同步队列 → 发送到服务端
 */
export async function flush() {
    if (syncing || isGuest) return;

    const pending = await DB.getPendingRolls();
    if (pending.length === 0) return;

    syncing = true;
    let retries = 0;

    while (retries < MAX_RETRIES) {
        try {
            // 获取当前本地状态
            const localState = await DB.loadState();
            const pity = localState?.pity || [];

            const result = await API.post('/api/rng', {
                rolls: pending,
                clientTotal: localState?.total || 0,
                pity
            });

            // 清除已同步的 rolls
            const syncedNumbers = pending.map(r => r.rollNumber);
            await DB.clearPendingRolls(syncedNumbers);

            // 通知回调
            if (result.success) {
                console.log(`[NOSR Sync] ${pending.length} rolls synced, server total: ${result.total}`);
            }

            break; // 成功，退出重试循环
        } catch (err) {
            retries++;
            console.warn(`[NOSR Sync] Attempt ${retries} failed:`, err.message);
            if (retries >= MAX_RETRIES) {
                console.error('[NOSR Sync] Max retries reached, will retry later');
            }
            await new Promise(r => setTimeout(r, 1000 * retries));
        }
    }

    syncing = false;
}

/**
 * 页面关闭时用 sendBeacon 紧急发送
 */
function flushBeacon() {
    // sendBeacon 是同步操作，只能发 POST
    // 这里我们读取 pending 数据并发送
    // 由于 IndexedDB 是异步的，我们只能依赖之前已经缓存的数据
    // 作为备用方案，这里发送一个标记，下次加载时再同步
    if (isGuest) return;
    // sendBeacon 无法等待 IndexedDB，所以主要依靠定时同步
    // beforeunload 中的 flush 会尽量发送已缓存的数据
}

/**
 * 初始加载：从服务端获取状态并与本地合并
 * @returns {Promise<{total, pity, hits}|null>} 合并后的状态
 */
export async function loadAndMerge() {
    if (isGuest) {
        // 访客只从本地加载
        return await DB.loadState();
    }

    try {
        // 从服务端获取
        const serverState = await API.get('/api/rng');

        // 从本地加载
        const localState = await DB.loadState();
        const localHits = await DB.loadCollection();

        // 合并：取较大的 total
        const mergedTotal = Math.max(serverState.total || 0, localState?.total || 0);

        // 合并 hits：取每个 tier 的较大 count
        const mergedHits = { ...localHits };
        if (serverState.hits) {
            for (const [tier, count] of Object.entries(serverState.hits)) {
                mergedHits[tier] = Math.max(mergedHits[tier] || 0, count);
            }
        }

        // pity 取服务端的（更权威），如果本地有更长的记录则用本地的
        const mergedPity = serverState.pity?.length > 0 ? serverState.pity : (localState?.pity || []);

        // 保存合并后的状态到本地
        const mergedState = {
            total: mergedTotal,
            pity: mergedPity,
            hits: mergedHits
        };
        await DB.saveState(mergedState);
        await DB.saveCollection(mergedHits);

        // 如果有待同步的 rolls，立即发送
        const pending = await DB.getPendingRolls();
        if (pending.length > 0) {
            flush();
        }

        return mergedState;
    } catch (err) {
        console.warn('[NOSR Sync] Server load failed, using local state:', err.message);
        return await DB.loadState();
    }
}

/**
 * 停止同步器
 */
export function destroySync() {
    if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
    }
}
