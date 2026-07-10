-- NOSR's RNG — Phase 3: RNG 数据持久化
-- rng_state / collection / roll_log

CREATE TABLE IF NOT EXISTS rng_state (
    user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_rolls     INTEGER NOT NULL DEFAULT 0,
    pity_counters   TEXT    NOT NULL DEFAULT '[]',   -- JSON array of pity counter values
    updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS collection (
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier            TEXT    NOT NULL,
    count           INTEGER NOT NULL DEFAULT 1,
    first_found_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    best_roll       INTEGER,                          -- roll number when first found
    PRIMARY KEY (user_id, tier)
);

CREATE TABLE IF NOT EXISTS roll_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    roll_number     INTEGER NOT NULL,
    tier            TEXT    NOT NULL,
    level           INTEGER NOT NULL,
    denom           INTEGER NOT NULL,
    is_new          INTEGER NOT NULL DEFAULT 0,
    rolled_at       INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_collection_user ON collection(user_id);
CREATE INDEX IF NOT EXISTS idx_roll_log_user   ON roll_log(user_id, roll_number DESC);
CREATE INDEX IF NOT EXISTS idx_roll_log_tier   ON roll_log(user_id, tier);
