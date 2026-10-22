#!/usr/bin/env bash
# デジタル庁デザインシステムの最新版を取得し、スキルの assets/ と references/generated/ を作り直す。
# 必要: git, npm, python3（node があれば Tailwind テーマの JSON/CDN 設定も再生成）
# 使い方: bash scripts/update.sh            # スキル自身を更新
#         DADS_WORK_DIR=/path bash scripts/update.sh   # 作業ディレクトリを指定（省略時は一時ディレクトリ）
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${DADS_WORK_DIR:-$(mktemp -d)}"
mkdir -p "$WORK"
ORG="https://github.com/digital-go-jp"
REPOS=(design-system-example-components-html design-system-example-components-react design-tokens tailwind-theme-plugin)

echo "作業ディレクトリ: $WORK"
TAGS_JSON="{"
for r in "${REPOS[@]}"; do
  rm -rf "${WORK:?}/$r"
  git clone --depth 1 -q "$ORG/$r.git" "$WORK/$r"
  tag="$(git ls-remote --tags --refs --sort=-v:refname "$ORG/$r.git" 2>/dev/null | head -1 | sed 's#.*refs/tags/##' || true)"
  TAGS_JSON+="\"$r\": \"${tag}\","
  echo "  取得: $r ($(git -C "$WORK/$r" rev-parse --short HEAD), 最新タグ: ${tag:-なし})"
done
TAGS_JSON="${TAGS_JSON%,}}"
echo "$TAGS_JSON" > "$WORK/upstream_tags.json"

rm -rf "$WORK/npm" && mkdir -p "$WORK/npm/plugin" "$WORK/npm/tokens"
( cd "$WORK/npm" && npm pack -q @digital-go-jp/tailwind-theme-plugin @digital-go-jp/design-tokens >/dev/null )
tar xzf "$WORK"/npm/digital-go-jp-tailwind-theme-plugin-*.tgz -C "$WORK/npm/plugin"
tar xzf "$WORK"/npm/digital-go-jp-design-tokens-*.tgz -C "$WORK/npm/tokens"

python3 "$SKILL_DIR/scripts/build_skill.py" --src "$WORK" --skill "$SKILL_DIR"
echo "更新完了: $SKILL_DIR"
