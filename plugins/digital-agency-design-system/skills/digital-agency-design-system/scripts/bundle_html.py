#!/usr/bin/env python3
"""HTML版コンポーネントを1つのHTMLに埋め込めるよう、CSSとJSをまとめて出力する。

単体で完結する必要があるページ（チャットのアーティファクト、メール添付のHTML、
SharePointに置く単一HTMLのマニュアルなど）で使う。

使い方:
  python3 scripts/bundle_html.py button input-text select tab > /tmp/dads-head.html
  python3 scripts/bundle_html.py --list            # 使えるコンポーネント名の一覧
  python3 scripts/bundle_html.py --tokens-only     # トークン（CSS変数）だけ

部品名の後ろに「:JSファイル名」を付けると、その部品のJSを指定したものだけにする（複数はカンマ区切り、
「:」だけならJSなし）。省略時はその部品のJSを全部入れる。
  tab:tab-aria     → <dads-tab-aria> だけ（アプリ画面向けの矢印キー操作タブ）
  table:           → 普通の表（横スクロール用の scroll-shadow.js を入れない）
  textarea:        → 文字数カウンターなし

出力は <head> 内にそのまま貼れる断片:
  Google Fonts（Noto Sans JP）の読み込み + <style>（global.css + 各コンポーネントCSS）
  + 必要なら <script type="module">（Custom Element の定義）
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMP = ROOT / "assets/html/components"
FONTS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Noto+Sans+Mono:wght@400;700&display=swap" rel="stylesheet">\n'
)


def missing_tokens(global_css: str) -> list[str]:
    """tokens.css にあって global.css に無い CSS 変数の宣言を返す。"""
    have = set(re.findall(r"(--[\w-]+)\s*:", global_css))
    tokens = (ROOT / "assets/css/tokens.css").read_text(encoding="utf-8")
    return [f"  {m.group(1)}: {m.group(2).strip()};" for m in re.finditer(r"(--[\w-]+)\s*:\s*([^;]+);", tokens) if m.group(1) not in have]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("components", nargs="*")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--tokens-only", action="store_true", help="global.css の :root（CSS変数）だけを出力")
    ap.add_argument("--no-fonts", action="store_true")
    a = ap.parse_args()

    names = sorted(p.name for p in COMP.iterdir() if p.is_dir())
    if a.list:
        print("\n".join(names))
        return

    global_css = (ROOT / "assets/css/global.css").read_text(encoding="utf-8")
    if a.tokens_only:
        m = re.search(r":root\s*\{.*?\n\}", global_css, re.S)
        global_css = m.group(0) if m else global_css

    css_parts = [f"/* DADS global.css */\n{global_css}"]
    # global.css に無いトークン（角丸・文字サイズ・行間・太さ）を tokens.css から補う
    missing = missing_tokens(global_css)
    if missing:
        css_parts.append("/* DADS tokens.css（global.css に無い変数） */\n:root {\n" + "\n".join(missing) + "\n}")
    js_parts = []
    for spec in a.components:
        n, sep, jsel = spec.partition(":")
        wanted = None if not sep else {x.strip().removesuffix(".js") for x in jsel.split(",") if x.strip()}
        d = COMP / n
        if not d.is_dir():
            sys.exit(f"unknown component: {n}（--list で一覧）")
        for f in sorted(d.glob("*.css")):
            if f.name.endswith(".stories.css"):
                continue
            css_parts.append(f"/* {n}/{f.name} */\n{f.read_text(encoding='utf-8')}")
        for f in sorted(d.glob("*.js")):
            if wanted is not None and f.stem not in wanted:
                continue
            js_parts.append(f"// {n}/{f.name}\n{f.read_text(encoding='utf-8')}")

    if js_parts:
        print("含めたJS: " + ", ".join(p.splitlines()[0][3:] for p in js_parts), file=sys.stderr)
    out = [] if a.no_fonts else [FONTS]
    out.append("<style>\n" + "\n".join(css_parts) + "\n</style>\n")
    for js in js_parts:  # 別々の module にしてクラス名の衝突を避ける
        out.append('<script type="module">\n' + js + "\n</script>\n")
    sys.stdout.write("".join(out))


if __name__ == "__main__":
    main()
