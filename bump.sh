#!/bin/bash
# NOSR 版本号管理脚本
# 用法: bash bump.sh           → 自动递增当天版本号
#       bash bump.sh v260705c  → 手动指定

set -e
cd "$(dirname "$0")"

# 获取当前版本号
OLD=$(grep -o 'v[0-9]\{6\}[a-z]' index.html 2>/dev/null | head -1)
[ -z "$OLD" ] && OLD="v000000x"
OLD_BARE="${OLD#v}"  # 去掉 v 前缀

if [ -n "$1" ]; then
    NEW="$1"
else
    DATE=$(date +%y%m%d)
    # 找到当天已用的最大字母
    LAST=$(find . \( -name "*.html" -o -name "*.js" -o -name "*.css" \) \
        -exec grep -oh "v${DATE}[a-z]" {} \; 2>/dev/null | sort -u | tail -1 | grep -o '[a-z]$')
    if [ -z "$LAST" ]; then
        NEXT="a"
    else
        NEXT=$(echo "$LAST" | tr 'a-y' 'b-z')
    fi
    NEW="v${DATE}${NEXT}"
fi

NEW_BARE="${NEW#v}"

echo "版本号: $OLD → $NEW"

# 替换所有引用
find . \( -name "*.html" -o -name "*.js" -o -name "*.css" \) | while read f; do
    sed -i "s/${OLD_BARE}/${NEW_BARE}/g" "$f" 2>/dev/null || true
done

COUNT=$(find . \( -name "*.html" -o -name "*.js" -o -name "*.css" \) \
    -exec grep -l "$NEW_BARE" {} \; 2>/dev/null | wc -l)
echo "已更新 $COUNT 个文件"
