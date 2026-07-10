-- NOSR's RNG — D1 初始 schema
-- 用户表 + 用户资料表

CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,
    password_hash TEXT  NOT NULL,           -- PBKDF2-SHA256 结果 (hex)
    salt        TEXT    NOT NULL,           -- 随机 salt (hex)
    role        TEXT    NOT NULL DEFAULT 'user',  -- admin | user
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    last_login  INTEGER
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url  TEXT,
    bio         TEXT DEFAULT '',
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
