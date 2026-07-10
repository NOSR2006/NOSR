#!/bin/bash
# dev-sync-db.sh — 同步 D1 迁移到 pages dev 的本地数据库
# 用法: bash dev-sync-db.sh
# 注意: 需在 pages dev 停止时运行

cd "$(dirname "$0")"

SRC_DIR=".wrangler/state/v3/d1/miniflare-D1DatabaseObject"

# 找到两个数据库文件
FILES=($(find "$SRC_DIR" -maxdepth 1 -name "*.sqlite" ! -name "metadata.sqlite" 2>/dev/null))

if [ ${#FILES[@]} -ne 2 ]; then
    echo "找到 ${#FILES[@]} 个数据库文件（期望 2 个），请先运行一次 pages dev 再重试"
    exit 1
fi

# 通过文件大小判断：有 WAL 的是 d1 execute 写的（有数据），没 WAL 的是 pages dev 的（空的）
for f in "${FILES[@]}"; do
    if [ -f "${f}-wal" ]; then
        SRC="$f"
    else
        DST="$f"
    fi
done

if [ -z "$SRC" ] || [ -z "$DST" ]; then
    echo "无法区分源库和目标库，尝试重新运行"
    exit 1
fi

echo "源 (有数据): $(basename $SRC)"
echo "目标 (pages dev): $(basename $DST)"

cp "$SRC" "$DST"
[ -f "${SRC}-wal" ] && cp "${SRC}-wal" "${DST}-wal"
[ -f "${SRC}-shm" ] && cp "${SRC}-shm" "${DST}-shm"

echo "已同步。现在可以启动: npx wrangler pages dev . --d1 NOSR_DB=nosr-db --persist-to=.wrangler/state"
