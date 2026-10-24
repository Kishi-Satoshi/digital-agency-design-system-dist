#!/usr/bin/env bash
# PowerPoint（.pptx）の審査の道具。ファイルを書き換えない（読むだけ）。
# 構造（タイトル・読み上げ順・代替テキスト・表の見出し・リンク・言語・テーマ外の色とフォント）を python-pptx で調べ、
# LibreOffice で PDF にして、実際の文字サイズと文字・背景のコントラストを測る。スライドごとの画像も書き出す。
#
# 使い方:
#   pptx_audit.sh <資料.pptx> [--out DIR] [--install] [--deps DIR]
#
#   --install  Python の部品（python-pptx・pdfminer.six・pypdfium2）が無ければ入れて続ける（無ければ入れ方を表示して終了コード 3）
#   --deps     部品を入れるフォルダ（既定: $DADS_AUDIT_DEPS か ~/.cache/dads-audit）。プラグインからは ${CLAUDE_PLUGIN_DATA}/audit を渡す
#   --out      出力先（既定: 一時フォルダ）。result.json・summary.md・slide-NN.png を書く。既に記録があれば止まる
#
# LibreOffice（soffice）が無いときは、構造の点検だけを行い、文字サイズ・コントラスト・画像は「未点検」とする。
# 終了コード: 0 = 記録できた, 2 = 使い方の誤り（出力先に既に記録がある場合も）, 3 = Python の部品が無い, 4 = ファイルを開けなかった
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
DEPS="${DADS_AUDIT_DEPS:-$HOME/.cache/dads-audit}"
OUT=""
INSTALL=0
TARGET=""
PY_PKGS=("python-pptx==1.0.2" "pdfminer.six==20250506" "pypdfium2==4.30.0")

while [ $# -gt 0 ]; do
  case "$1" in
    --out) OUT="$2"; shift 2 ;;
    --install) INSTALL=1; shift ;;
    --deps) DEPS="$2"; shift 2 ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    -*) echo "知らないオプションです: $1" >&2; exit 2 ;;
    *) TARGET="$1"; shift ;;
  esac
done
[ -n "$TARGET" ] || { sed -n '2,15p' "$0" >&2; exit 2; }
[ -f "$TARGET" ] || { echo "ファイルがありません: $TARGET" >&2; exit 4; }

command -v python3 >/dev/null 2>&1 || { echo "Python 3 が見つかりません。" >&2; exit 3; }
PYDIR="$DEPS/py"
have_py() { PYTHONPATH="$PYDIR" python3 -c "import pptx, pdfminer, pypdfium2" 2>/dev/null; }
if ! have_py; then
  if [ "$INSTALL" = 1 ]; then
    echo "python-pptx・pdfminer.six・pypdfium2 を $PYDIR に入れます..." >&2
    mkdir -p "$PYDIR"
    python3 -m pip install --quiet --disable-pip-version-check --no-warn-conflicts --target "$PYDIR" "${PY_PKGS[@]}" >&2
  else
    echo "審査に使う Python の部品（python-pptx・pdfminer.six・pypdfium2）が入っていません（入れる先: $PYDIR）。" >&2
    echo "" >&2
    echo "入れてよい場合は、同じコマンドに --install を付けて実行し直してください（約 70MB）。" >&2
    exit 3
  fi
fi

[ -n "$OUT" ] || OUT="$(mktemp -d "${TMPDIR:-/tmp}/dads-review-XXXXXX")"
if [ -e "$OUT/result.json" ]; then
  echo "出力先に別の記録が既にあります: $OUT" >&2
  echo "置き場所の名前に対象名を入れて分けてください（例: .dads-review/20261024-101500-提案書）。" >&2
  exit 2
fi
mkdir -p "$OUT"

SOFFICE=""
for c in soffice libreoffice /Applications/LibreOffice.app/Contents/MacOS/soffice "/c/Program Files/LibreOffice/program/soffice.exe"; do
  if command -v "$c" >/dev/null 2>&1 || [ -x "$c" ]; then SOFFICE="$c"; break; fi
done

python3 -I "$HERE/pptx_audit.py" --pydir "$PYDIR" --target "$TARGET" --out "$OUT" --soffice "$SOFFICE" >/dev/null || { echo "記録を作れませんでした" >&2; exit 4; }
echo "$OUT/summary.md"
