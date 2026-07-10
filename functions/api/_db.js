/**
 * _db.js — D1 数据访问层
 * 封装 users / user_profiles 表操作
 */

/**
 * 根据用户名查找用户
 * @returns {object|null} { id, username, password_hash, salt, role, created_at }
 */
export async function findUserByUsername(db, username) {
    const row = await db
        .prepare('SELECT id, username, password_hash, salt, role, created_at FROM users WHERE username = ?')
        .bind(username)
        .first();
    return row;
}

/**
 * 根据 ID 查找用户
 */
export async function findUserById(db, id) {
    const row = await db
        .prepare('SELECT id, username, role, created_at, last_login FROM users WHERE id = ?')
        .bind(id)
        .first();
    return row;
}

/**
 * 创建新用户
 * @returns {object} { id, username, role }
 */
export async function createUser(db, username, passwordHash, salt, role = 'user') {
    const result = await db
        .prepare('INSERT INTO users (username, password_hash, salt, role) VALUES (?, ?, ?, ?)')
        .bind(username, passwordHash, salt, role)
        .run();

    const userId = Number(result.meta.last_row_id);

    // 同时创建 profile 行
    await db
        .prepare('INSERT INTO user_profiles (user_id, display_name) VALUES (?, ?)')
        .bind(userId, username)
        .run();

    return { id: userId, username, role };
}

/**
 * 更新最后登录时间
 */
export async function updateLastLogin(db, userId) {
    await db
        .prepare('UPDATE users SET last_login = unixepoch() WHERE id = ?')
        .bind(userId)
        .run();
}

/**
 * 获取用户资料
 */
export async function getUserProfile(db, userId) {
    const row = await db
        .prepare(`
            SELECT u.id, u.username, u.role, u.created_at, u.last_login,
                   p.display_name, p.avatar_url, p.bio
            FROM users u
            LEFT JOIN user_profiles p ON p.user_id = u.id
            WHERE u.id = ?
        `)
        .bind(userId)
        .first();
    return row;
}
