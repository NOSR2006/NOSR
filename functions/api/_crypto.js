/**
 * _crypto.js — 密码学工具
 * PBKDF2-SHA256 密码哈希（Cloudflare Workers 兼容）
 */

const PBKDF2_ITERATIONS = 100000;

/**
 * 生成随机 salt（hex 字符串）
 * @param {number} bytes - 字节数，默认 16
 */
export function generateSalt(bytes = 16) {
    const buf = new Uint8Array(bytes);
    crypto.getRandomValues(buf);
    return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * PBKDF2-SHA256 哈希密码
 * @param {string} password - 明文密码
 * @param {string} saltHex  - hex salt
 * @returns {Promise<string>} hex 哈希结果
 */
export async function hashPassword(password, saltHex) {
    const encoder = new TextEncoder();

    // 导入密码作为 PBKDF2 基础密钥
    const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(password),
        'PBKDF2', false, ['deriveBits']
    );

    // PBKDF2 派生 256 位
    const bits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: encoder.encode(saltHex),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    return Array.from(new Uint8Array(bits))
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 验证密码
 * @param {string} password    - 明文密码
 * @param {string} saltHex     - 存储的 salt
 * @param {string} expectedHash - 存储的哈希
 */
export async function verifyPassword(password, saltHex, expectedHash) {
    const hash = await hashPassword(password, saltHex);
    // 时间安全的比较（防止时序攻击）
    if (hash.length !== expectedHash.length) return false;
    let mismatch = 0;
    for (let i = 0; i < hash.length; i++) {
        mismatch |= hash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }
    return mismatch === 0;
}
