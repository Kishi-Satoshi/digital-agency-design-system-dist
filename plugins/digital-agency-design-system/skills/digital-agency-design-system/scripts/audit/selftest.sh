#!/usr/bin/env bash
# 審査の道具の自己点検：fixtures/ のページで、入れた問題が検出され、きれいなページで誤検知が出ないことを確かめる。
# 使い方: bash selftest.sh [--install] [--deps DIR]   （終了コード 0 = 合格）
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$(mktemp -d "${TMPDIR:-/tmp}/dads-selftest-XXXXXX")"
trap 'rm -rf "$OUT"' EXIT

bash "$HERE/audit.sh" "$HERE/fixtures/bad.html" --out "$OUT/bad" "$@" >/dev/null
bash "$HERE/audit.sh" "$HERE/fixtures/good.html" --out "$OUT/good" "$@" >/dev/null
bash "$HERE/audit.sh" "$HERE/fixtures/post-on-load.html" --quick --out "$OUT/post" "$@" >/dev/null

python3 - "$OUT" <<'PY'
import json, sys
out = sys.argv[1]
bad = json.load(open(f"{out}/bad/result.json"))
good = json.load(open(f"{out}/good/result.json"))
post = json.load(open(f"{out}/post/result.json"))
found = {f["source"] for f in bad["findings"]}
expect = {
    "axe:html-has-lang": "lang 属性なし",
    "axe:image-alt": "画像の代替テキストなし",
    "axe:label": "入力欄のラベルなし",
    "axe:color-contrast": "低コントラスト",
    "axe:heading-order": "見出しの飛び",
    "overflow375": "375px のはみ出し",
    "focus:indicator": "フォーカス表示消し",
    "text200:clipped": "文字200%で切れる",
    "text200:px": "px 指定の文字",
    "dads:color": "トークン外の色",
    "dads:font": "Noto Sans JP 以外のフォント",
}
ng = [f"検出されない: {v}（{k}）" for k, v in expect.items() if k not in found]
serious = [f["title"] for f in good["findings"] if f["severity"] in ("致命的", "重要") or f["dads"]]
ng += [f"きれいなページで誤検知: {t}" for t in serious]
if not any(b.startswith("POST ") for b in post["errors"]["blockedRequests"]):
    ng.append("POST の通信を止められていない")
if ng:
    print("不合格"); [print(" -", x) for x in ng]; sys.exit(1)
print(f"合格（問題 {len(expect)} 種を検出、きれいなページの誤検知 0、POST を止めた）")
PY
