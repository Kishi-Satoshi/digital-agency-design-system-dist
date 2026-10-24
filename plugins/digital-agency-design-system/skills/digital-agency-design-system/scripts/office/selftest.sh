#!/usr/bin/env bash
# PowerPoint の審査・直す道具の自己点検：fixtures/ の資料で、入れた問題が検出され、きれいな資料で誤検知が出ず、
# 直したあとの再審査で直せるものが消え、元のファイルとスライドマスター・レイアウトが変わらないことを確かめる。
# 使い方: bash selftest.sh [--install] [--deps DIR]   （終了コード 0 = 合格）
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$(mktemp -d "${TMPDIR:-/tmp}/dads-office-selftest-XXXXXX")"
trap 'rm -rf "$OUT"' EXIT
DEPS="${DADS_AUDIT_DEPS:-$HOME/.cache/dads-audit}"
for ((i=1; i<=$#; i++)); do [ "${!i}" = "--deps" ] && { j=$((i+1)); DEPS="${!j}"; }; done

bash "$HERE/pptx_audit.sh" "$HERE/fixtures/bad.pptx" --out "$OUT/bad" "$@" >/dev/null
bash "$HERE/pptx_audit.sh" "$HERE/fixtures/good.pptx" --out "$OUT/good" "$@" >/dev/null
cp "$HERE/fixtures/bad.pptx" "$OUT/deck.pptx"
cat > "$OUT/ops.json" <<'JSON'
[
 {"op":"title-first","slide":1},
 {"op":"alt","slide":1,"shape":7,"text":"申請の流れを示す図"},
 {"op":"table-header","slide":2,"shape":2},
 {"op":"font-size","slide":1,"find":"出典：","pt":12},
 {"op":"color","slide":1,"find":"薄くて読みにくい","theme":"tx1"},
 {"op":"color","slide":1,"shape":5,"theme":"tx1"},
 {"op":"theme-font","slide":1,"shape":5},
 {"op":"lang","lang":"ja-JP"},
 {"op":"replace-text","slide":1,"shape":6,"old":"こちら","new":"申請の手引き（社内ポータル）"},
 {"op":"title","slide":3,"text":"注意事項（1/2）"},
 {"op":"title","slide":4,"text":"注意事項（2/2）"}
]
JSON
python3 -I "$HERE/pptx_fix.py" "$OUT/deck.pptx" "$OUT/ops.json" --pydir "$DEPS/py" >/dev/null
bash "$HERE/pptx_audit.sh" "$OUT/deck.dads-fixed.pptx" --out "$OUT/fixed" "$@" >/dev/null

python3 -I - "$OUT" "$HERE/fixtures/bad.pptx" "$DEPS/py" <<'PY'
import filecmp, json, sys, zipfile
out, original, pydir = sys.argv[1], sys.argv[2], sys.argv[3]
load = lambda n: json.load(open(f"{out}/{n}/result.json", encoding="utf-8"))
bad, good, fixed = load("bad"), load("good"), load("fixed")
ng = []
found = {f["source"] for f in bad["findings"]}
expect = {
    "S1:no-title": "タイトルなし", "S1:duplicate-title": "タイトルの重複", "S2:title-not-first": "読み上げ順",
    "S3:placeholder-alt": "代替テキストが仮の名前", "S6:no-header": "表の見出しなし", "S7:vague-link": "あいまいなリンク",
    "S8:lang": "言語設定の誤り", "S10:color": "テーマ外の色", "S10:font": "テーマ外のフォント",
}
if bad["rendered"]:
    expect.update({"S4:contrast": "低コントラスト", "S9:tiny": "12pt 未満の文字"})
ng += [f"検出されない: {v}（{k}）" for k, v in expect.items() if k not in found]
ng += [f"きれいな資料で誤検知: {f['title']}" for f in good["findings"]]
left = {f["source"] for f in fixed["findings"]} - {"S1:no-title"}
ng += [f"直したあとに残った: {s}" for s in sorted(left)]
if not filecmp.cmp(original, f"{out}/deck.pptx", shallow=False):
    ng.append("元のファイルが変わった")
with zipfile.ZipFile(f"{out}/deck.pptx") as a, zipfile.ZipFile(f"{out}/deck.dads-fixed.pptx") as b:
    for name in a.namelist():
        if name.startswith(("ppt/slideMasters/", "ppt/slideLayouts/", "ppt/theme/")) and a.read(name) != b.read(name):
            ng.append(f"テンプレートの部品が変わった: {name}")
if ng:
    print("不合格"); [print(" -", x) for x in ng]; sys.exit(1)
note = "" if bad["rendered"] else "（LibreOffice が無いため、コントラストと文字サイズは確かめていない）"
print(f"合格（問題 {len(expect)} 種を検出、きれいな資料の誤検知 0、直したあと直せるものは 0、元のファイルとテンプレートは変わらない）{note}")
PY
