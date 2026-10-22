#!/usr/bin/env bash
# 審査の道具：ページを実際に表示して、axe-core・スクショ・はみ出し・文字200%・フォーカス順を記録する（読み取り専用）。
#
# 使い方:
#   audit.sh <URL またはローカルの HTML> [--out DIR] [--quick] [--install] [--deps DIR] [--max-tabs N]
#   audit.sh --findings DIR        標準入力の内容を DIR/findings.md に書き出す（Write を持たない審査役が使う）
#   audit.sh --env                 使い捨ての実行環境と判断するかを表示する
#
#   --quick    軽い点検（axe-core と 375px のはみ出し、DADS のトークン外の色だけ。スクショなし）
#   --install  Playwright・axe-core・Chromium が無ければ入れて続ける（無ければ入れ方を表示して終了コード 3）
#   --deps     依存を入れるフォルダ（既定: $DADS_AUDIT_DEPS か ~/.cache/dads-audit）。プラグインからは ${CLAUDE_PLUGIN_DATA}/audit を渡す
#   --out      出力先（既定: 一時フォルダ）。result.json・summary.md・スクショ（PNG）を書く
#
# 終了コード: 0 = 記録できた, 2 = 使い方の誤り（出力先に既に記録がある場合も）, 3 = Node・Playwright・Chromium が無い, 4 = ページを開けなかった
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PLAYWRIGHT_VERSION="1.56.1"
AXE_VERSION="4.14.0"
DEPS="${DADS_AUDIT_DEPS:-$HOME/.cache/dads-audit}"
OUT=""
QUICK=0
INSTALL=0
MAX_TABS=80
TARGET=""

is_disposable() {
  # Claude Code のクラウド、サンドボックス（Cowork を含む想定。岸の手元で確認する）、明示の指定
  [ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || [ "${IS_SANDBOX:-}" = "1" ] || [ "${DADS_AUDIT_DISPOSABLE:-}" = "1" ]
}

need() {
  echo "$1" >&2
  echo "" >&2
  echo "入れてよい場合は、同じコマンドに --install を付けて実行し直してください（約 200MB をダウンロードします）。" >&2
  exit 3
}

while [ $# -gt 0 ]; do
  case "$1" in
    --out) OUT="$2"; shift 2 ;;
    --quick) QUICK=1; shift ;;
    --install) INSTALL=1; shift ;;
    --deps) DEPS="$2"; shift 2 ;;
    --max-tabs) MAX_TABS="$2"; shift 2 ;;
    --findings)
      dir="${2:?--findings には出力先のフォルダを指定してください}"
      mkdir -p "$dir"
      cat > "$dir/findings.md"
      echo "$dir/findings.md"
      exit 0 ;;
    --env)
      if is_disposable; then echo "disposable（使い捨ての実行環境。確認せずに入れてよい）"; else echo "personal（各自の PC。入れる前に聞く）"; fi
      for v in CLAUDE_CODE_REMOTE IS_SANDBOX DADS_AUDIT_DISPOSABLE CLAUDE_CODE_ENTRYPOINT; do
        [ -n "${!v:-}" ] && echo "  $v=${!v}"
      done
      exit 0 ;;
    -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
    -*) echo "知らないオプションです: $1" >&2; exit 2 ;;
    *) TARGET="$1"; shift ;;
  esac
done

[ -n "$TARGET" ] || { sed -n '2,17p' "$0" >&2; exit 2; }

command -v node >/dev/null 2>&1 || need "Node.js が見つかりません。https://nodejs.org/ から LTS 版を入れてください。"

# 依存（Playwright と axe-core）
have_deps() {
  [ -f "$DEPS/node_modules/playwright/package.json" ] && [ -f "$DEPS/node_modules/axe-core/axe.min.js" ] &&
    [ "$(node -p "require('$DEPS/node_modules/playwright/package.json').version" 2>/dev/null)" = "$PLAYWRIGHT_VERSION" ] &&
    [ "$(node -p "require('$DEPS/node_modules/axe-core/package.json').version" 2>/dev/null)" = "$AXE_VERSION" ]
}
if ! have_deps; then
  if [ "$INSTALL" = 1 ]; then
    echo "Playwright $PLAYWRIGHT_VERSION と axe-core $AXE_VERSION を $DEPS に入れます..." >&2
    mkdir -p "$DEPS"
    [ -f "$DEPS/package.json" ] || echo '{"private":true}' > "$DEPS/package.json"
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --prefix "$DEPS" --no-audit --no-fund --silent \
      "playwright@$PLAYWRIGHT_VERSION" "axe-core@$AXE_VERSION" >&2
  else
    need "審査に使う Playwright と axe-core が入っていません（入れる先: $DEPS）。"
  fi
fi

# ブラウザ（Chromium）
have_browser() {
  node -e "
    const { chromium } = require('$DEPS/node_modules/playwright');
    process.exit(require('fs').existsSync(chromium.executablePath()) ? 0 : 1);
  " 2>/dev/null
}
if ! have_browser; then
  if [ "$INSTALL" = 1 ]; then
    echo "Chromium を入れます..." >&2
    node "$DEPS/node_modules/playwright/cli.js" install chromium >&2
  else
    need "審査に使うブラウザ（Chromium）が入っていません。"
  fi
fi

[ -n "$OUT" ] || OUT="$(mktemp -d "${TMPDIR:-/tmp}/dads-review-XXXXXX")"
if [ -e "$OUT/result.json" ]; then
  echo "出力先に別の記録が既にあります: $OUT" >&2
  echo "置き場所の名前に対象名を入れて分けてください（例: .dads-review/20261022-160512-request）。" >&2
  exit 2
fi
mkdir -p "$OUT"

DADS_AUDIT_DEPS="$DEPS" node "$HERE/audit.mjs" \
  --target "$TARGET" --out "$OUT" --quick "$QUICK" --max-tabs "$MAX_TABS"
