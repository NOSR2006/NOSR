/**
 * RNG 持久化 API — /api/rng
 * GET  → 加载用户 RNG 状态 + 图鉴
 * POST → 批量同步 Roll 结果
 *
 * 鉴权: middleware 已验证 JWT，request.user = { role, sub, uid }
 */

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

// ===== 加载状态 =====
export async function onRequestGet(context) {
    const { request, env } = context;
    const user = request.user;
    if (!user?.uid) return json({ error: 'Not authenticated' }, 401);

    const db = env.NOSR_DB;
    const uid = user.uid;

    // 并行读取 rng_state 和 collection
    const [state, collectionRows] = await Promise.all([
        db.prepare('SELECT total_rolls, pity_counters, updated_at FROM rng_state WHERE user_id = ?')
            .bind(uid).first(),
        db.prepare('SELECT tier, count, first_found_at, best_roll FROM collection WHERE user_id = ?')
            .bind(uid).all()
    ]);

    // 构造 hits 对象
    const hits = {};
    for (const row of collectionRows.results) {
        hits[row.tier] = row.count;
    }

    // 收集 first_found 信息
    const firstFound = {};
    for (const row of collectionRows.results) {
        firstFound[row.tier] = {
            best_roll: row.best_roll,
            first_found_at: row.first_found_at
        };
    }

    return json({
        total: state?.total_rolls || 0,
        pity: state ? JSON.parse(state.pity_counters) : [],
        hits,
        firstFound,
        serverTime: state?.updated_at || 0
    });
}

// ===== 批量同步 =====
export async function onRequestPost(context) {
    const { request, env } = context;
    const user = request.user;
    if (!user?.uid) return json({ error: 'Not authenticated' }, 401);

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    const { rolls, clientTotal } = body;
    // rolls: [{ rollNumber, tier, level, denom, isNew }]

    if (!Array.isArray(rolls) || rolls.length === 0) {
        return json({ error: 'No rolls to sync' }, 400);
    }

    const db = env.NOSR_DB;
    const uid = user.uid;

    // 获取当前服务端状态
    const state = await db.prepare(
        'SELECT total_rolls, pity_counters FROM rng_state WHERE user_id = ?'
    ).bind(uid).first();

    const serverTotal = state?.total_rolls || 0;

    // 过滤掉已经同步过的 rolls（rollNumber <= serverTotal）
    const newRolls = rolls.filter(r => r.rollNumber > serverTotal);
    if (newRolls.length === 0) {
        return json({ success: true, synced: 0, total: serverTotal });
    }

    // 使用 batch 写入
    const statements = [];
    const now = Math.floor(Date.now() / 1000);

    for (const roll of newRolls) {
        // 插入 roll_log
        statements.push(
            db.prepare(
                'INSERT INTO roll_log (user_id, roll_number, tier, level, denom, is_new, rolled_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).bind(uid, roll.rollNumber, roll.tier, roll.level, roll.denom, roll.isNew ? 1 : 0, now)
        );

        // upsert collection
        if (roll.isNew) {
            statements.push(
                db.prepare(
                    'INSERT INTO collection (user_id, tier, count, first_found_at, best_roll) VALUES (?, ?, 1, ?, ?)'
                ).bind(uid, roll.tier, now, roll.rollNumber)
            );
        } else {
            statements.push(
                db.prepare(
                    'INSERT INTO collection (user_id, tier, count) VALUES (?, ?, 1) ' +
                    'ON CONFLICT(user_id, tier) DO UPDATE SET count = count + 1'
                ).bind(uid, roll.tier)
            );
        }
    }

    // 更新 rng_state（使用 clientTotal 或 serverTotal + newRolls.length，取较大值）
    const newTotal = Math.max(clientTotal || 0, serverTotal + newRolls.length);
    const pityJson = body.pity ? JSON.stringify(body.pity) : (state?.pity_counters || '[]');

    statements.push(
        db.prepare(
            'INSERT INTO rng_state (user_id, total_rolls, pity_counters, updated_at) VALUES (?, ?, ?, ?) ' +
            'ON CONFLICT(user_id) DO UPDATE SET total_rolls = ?, pity_counters = ?, updated_at = ?'
        ).bind(uid, newTotal, pityJson, now, newTotal, pityJson, now)
    );

    // 批量执行
    await db.batch(statements);

    return json({
        success: true,
        synced: newRolls.length,
        total: newTotal
    });
}
