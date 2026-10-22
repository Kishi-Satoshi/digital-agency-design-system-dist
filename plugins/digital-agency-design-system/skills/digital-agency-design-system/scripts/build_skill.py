#!/usr/bin/env python3
"""Rebuild the generated parts of the digital-agency-design-system skill from upstream sources.

Usage:
  python3 build_skill.py --src <work dir> --skill <skill dir>

<work dir> must contain:
  design-system-example-components-html/   (git clone)
  design-system-example-components-react/  (git clone)
  design-tokens/                           (git clone)
  tailwind-theme-plugin/                   (git clone)
  npm/plugin/package/dist/...              (npm pack @digital-go-jp/tailwind-theme-plugin, extracted)
  npm/tokens/package/dist/...              (npm pack @digital-go-jp/design-tokens, extracted)

Only files under assets/, references/generated/ and VERSION.json are rewritten.
SKILL.md and the scripts are hand-maintained and left untouched.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import shutil
import subprocess
from pathlib import Path

HTML_REPO = "design-system-example-components-html"
REACT_REPO = "design-system-example-components-react"
TOKENS_REPO = "design-tokens"
PLUGIN_REPO = "tailwind-theme-plugin"
REPOS = [HTML_REPO, REACT_REPO, TOKENS_REPO, PLUGIN_REPO]

HTML_SKIP_SUFFIXES = (".vrt.js", ".test.js", ".unit.js", ".stories.ts", ".mdx")
HTML_KEEP_EXT = {".css", ".js", ".html", ".md", ".svg"}
REACT_SKIP_SUFFIXES = (".stories.tsx", ".test.tsx", ".test.ts")
REACT_KEEP_EXT = {".tsx", ".ts", ".css", ".md", ".svg"}

# HTML dir name -> React dir name, where automatic matching fails
ALIASES = {
    "breadcrumb": "Breadcrumbs",
    "description-list": "Dl",
    "input-text": "Input",
}


def git_info(repo: Path) -> dict:
    def run(*args: str) -> str:
        try:
            return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, check=True).stdout.strip()
        except Exception:
            return ""

    tag = run("describe", "--tags", "--abbrev=0")
    return {
        "commit": run("rev-parse", "HEAD"),
        "date": run("log", "-1", "--format=%cs"),
        "tag": tag or None,
    }


def strip_mdx(text: str) -> str:
    out = []
    for line in text.splitlines():
        s = line.strip()
        if s.startswith(("import ", "export ", "<Meta", "<Unstyled", "</Unstyled", '<div className="prose"', "</div>")):
            continue
        out.append(line)
    return "\n".join(out).strip() + "\n"


def reset_dir(p: Path) -> None:
    if p.exists():
        shutil.rmtree(p)
    p.mkdir(parents=True)


def copy_html_components(src: Path, dst: Path) -> list[dict]:
    comps = []
    for cdir in sorted((src / "src/components").iterdir()):
        if not cdir.is_dir():
            continue
        out = dst / cdir.name
        files = []
        for f in sorted(cdir.iterdir()):
            if f.is_dir() or f.name.endswith(HTML_SKIP_SUFFIXES) or f.suffix not in HTML_KEEP_EXT:
                continue
            out.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, out / f.name)
            files.append(f.name)
        title = cdir.name
        stories = cdir / f"{cdir.name}.stories.ts"
        if stories.exists():
            m = re.search(r'title:\s*"Components/([^"]+)"', stories.read_text(encoding="utf-8"))
            if m:
                title = m.group(1)
        variations = []
        md = cdir / f"{cdir.name}.md"
        if md.exists():
            variations = extract_variations(md.read_text(encoding="utf-8"))
        elements = {}
        for jf in [x for x in files if x.endswith(".js")]:
            els = re.findall(r'customElements\.define\("([a-z0-9-]+)"', (cdir / jf).read_text(encoding="utf-8"))
            elements[jf] = els
        errors = sorted({m for cf in files if cf.endswith(".css")
                         for m in re.findall(r"\.(dads-[a-z0-9-]+__error-text)\b", (cdir / cf).read_text(encoding="utf-8"))})
        comps.append({
            "dir": cdir.name,
            "title": title,
            "elements": elements,
            "errors": errors,
            "css": [x for x in files if x.endswith(".css")],
            "js": [x for x in files if x.endswith(".js")],
            "examples": [x for x in files if x.endswith(".html")],
            "doc": f"{cdir.name}.md" if md.exists() else None,
            "variations": variations,
        })
    return comps


def extract_variations(md: str) -> list[str]:
    """Pull rows of the first markdown table under a heading containing バリエーション."""
    lines = md.splitlines()
    rows: list[str] = []
    in_section = False
    for line in lines:
        if line.startswith("#"):
            if in_section and rows:
                break
            in_section = "バリエーション" in line
            continue
        if in_section and line.startswith("|") and not re.match(r"^\|\s*-", line):
            cells = [c.strip() for c in line.strip("|").split("|")]
            if cells and cells[0] in ("属性", "プロパティ"):
                continue
            if len(cells) >= 2:
                rows.append(f"{cells[0]}={cells[1]}")
    return rows


def copy_react_components(src: Path, dst: Path) -> list[dict]:
    comps = []
    root = src / "src/components"
    for cdir in sorted(root.iterdir()):
        if not cdir.is_dir() or cdir.name == "deprecated":
            continue
        files = []
        story_only = not any(
            f.is_file() and not f.name.endswith(REACT_SKIP_SUFFIXES) and f.suffix in REACT_KEEP_EXT
            for f in cdir.rglob("*")
        )
        for f in sorted(cdir.rglob("*")):
            if f.is_dir() or f.suffix not in REACT_KEEP_EXT:
                continue
            # 実装が stories にしか無い部品（Table など）は stories を実装例として残す
            if f.name.endswith(REACT_SKIP_SUFFIXES) and not (story_only and f.name.endswith(".stories.tsx")):
                continue
            rel = f.relative_to(root)
            (dst / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, dst / rel)
            files.append(str(f.relative_to(cdir)))
        deps = set()
        for f in cdir.rglob("*.ts*"):
            if f.name.endswith(REACT_SKIP_SUFFIXES):
                continue
            for m in re.finditer(r"""from ['"]\.\./([A-Za-z]+)""", f.read_text(encoding="utf-8")):
                if m.group(1) != cdir.name and (root / m.group(1)).is_dir():
                    deps.add(m.group(1))
        comps.append({"dir": cdir.name, "files": files, "deps": sorted(deps), "story_only": story_only})
    return comps


def dump_tailwind_theme(plugin_dist: Path, out_json: Path) -> dict | None:
    script = (
        "const p=require(process.argv[1]);"
        "const m=p.default||p;"
        "process.stdout.write(JSON.stringify((m.config&&m.config.theme)||{},null,1));"
    )
    try:
        res = subprocess.run(["node", "-e", script, str(plugin_dist / "index.cjs.js")], capture_output=True, text=True, check=True)
    except Exception as e:  # node missing or plugin shape changed
        print(f"WARN: could not dump tailwind theme ({e}); keeping previous theme.json if any")
        return json.loads(out_json.read_text()) if out_json.exists() else None
    theme = json.loads(res.stdout)
    out_json.write_text(json.dumps(theme, ensure_ascii=False, indent=1), encoding="utf-8")
    return theme


def write_cdn_config(theme: dict, out: Path) -> None:
    out.write_text(
        "// Tailwind Play CDN (v3) 用のデジタル庁デザインシステム テーマ設定\n"
        "// <script src=\"https://cdn.tailwindcss.com\"></script> の直後に読み込むか、中身をインラインで貼る。\n"
        "// 生成元: @digital-go-jp/tailwind-theme-plugin の theme。手で編集しない（scripts/update.sh で再生成）。\n"
        f"tailwind.config = {{ theme: {json.dumps(theme, ensure_ascii=False)} }};\n",
        encoding="utf-8",
    )


def css_vars(css: str) -> list[tuple[str, str]]:
    return re.findall(r"(--[a-z0-9-]+):\s*([^;]+);", css)


def write_tokens_md(tokens_css: str, theme: dict | None, out: Path) -> None:
    vars_ = css_vars(tokens_css)
    groups: dict[str, list[tuple[str, str]]] = {}
    for name, val in vars_:
        key = "-".join(name.strip("-").split("-")[:3]) if name.startswith("--color-primitive") else "-".join(name.strip("-").split("-")[:2])
        groups.setdefault(key, []).append((name, " ".join(val.split())))
    lines = [
        "# デザイントークン一覧（自動生成）",
        "",
        "scripts/update.sh で再生成される。手で編集しない。",
        "CSS変数は assets/css/tokens.css（または global.css 冒頭）で定義される。",
        "",
        "## CSS変数",
        "",
    ]
    for key, items in groups.items():
        lines.append(f"### {key}")
        lines.append("")
        lines.append(", ".join(f"`{n}`={v}" for n, v in items))
        lines.append("")
    if theme:
        ext = theme.get("extend", theme)
        lines += ["## Tailwind クラスで使えるトークン（tailwind-theme-plugin）", ""]
        colors = ext.get("colors", {})
        lines.append("### 色（`bg-*` `text-*` `border-*` `ring-*` などに付ける）")
        lines.append("")
        for cname, cval in colors.items():
            if isinstance(cval, dict):
                lines.append(f"- `{cname}-{{{','.join(cval.keys())}}}`")
            else:
                lines.append(f"- `{cname}` = {cval}")
        lines.append("")
        for key, label in [
            ("fontSize", "テキストスタイル（`text-*`。サイズ・太さ・行間・字間を一括指定）"),
            ("lineHeight", "行間（`leading-*`）"),
            ("borderRadius", "角丸（`rounded-*`）"),
            ("boxShadow", "エレベーション（`shadow-*`）"),
            ("fontFamily", "フォント（`font-*`）"),
            ("fontWeight", "太さ（`font-*`）"),
            ("screens", "ブレークポイント"),
        ]:
            if key in ext:
                lines.append(f"### {label}")
                lines.append("")
                lines.append(", ".join(f"`{k}`" for k in ext[key].keys()))
                lines.append("")
        other = [k for k in ext.keys() if k not in {"colors", "fontSize", "lineHeight", "borderRadius", "boxShadow", "fontFamily", "fontWeight", "screens"}]
        if other:
            lines.append(f"その他の拡張キー: {', '.join(other)}（詳細は assets/tailwind/theme.json）")
            lines.append("")
    out.write_text("\n".join(lines), encoding="utf-8")


def norm(s: str) -> str:
    return s.replace("-", "").lower()


def write_components_md(html: list[dict], react: list[dict], out: Path) -> None:
    rmap = {norm(c["dir"]): c for c in react}
    used = set()
    lines = [
        "# コンポーネント一覧（自動生成）",
        "",
        "scripts/update.sh で再生成される。手で編集しない。",
        "- HTML版: `assets/html/components/<dir>/`（`<dir>.md` が仕様と使い方、`*.html` が実例、`*.css`/`*.js` が実装）",
        "- React版: `assets/react/components/<Dir>/`（`<Dir>.tsx` が実装、`component-spec.md` があれば設計メモ。「storiesに実装例」の部品は部品化されておらず、`<Dir>.stories.tsx` 内のJSXをマークアップ例として使う）",
        "- JS列が空でないHTMLコンポーネントは Custom Element（`<dads-*>`）としてJSの読み込みが必要。",
        "",
        "| 名前 | HTML dir | CSS | JS | React dir | React依存 | バリエーション |",
        "|---|---|---|---|---|---|---|",
    ]
    for c in html:
        r = rmap.get(norm(ALIASES.get(c["dir"], c["dir"])))
        if r:
            used.add(r["dir"])
        lines.append(
            "| {title} | {dir} | {css} | {js} | {rdir} | {deps} | {var} |".format(
                title=c["title"],
                dir=c["dir"],
                css=" ".join(c["css"]) or "-",
                js=" ".join(c["js"]) or "-",
                rdir=(r["dir"] + ("（storiesに実装例）" if r.get("story_only") else "")) if r else "（HTML版のみ）",
                deps=" ".join(r["deps"]) if r and r["deps"] else "-",
                var="; ".join(c["variations"]) or "-",
            )
        )
    lines += [
        "",
        "## HTML版の詳細（JSが定義する要素・エラー文のクラス・実例ファイル）",
        "",
        "実例ファイル名が使い分けの手がかりになる（例：`errored.html` はエラー表示、`overflow-on-mobile.html` は狭い画面で横スクロールする表）。",
        "",
    ]
    for c in html:
        lines.append(f"### {c['title']}（`{c['dir']}`）")
        if c["elements"]:
            lines.append("- JS: " + "; ".join(f"`{f}` → " + ", ".join(f"`<{e}>`" for e in els) for f, els in c["elements"].items()))
        if c["errors"]:
            lines.append("- エラー文: " + ", ".join(f"`.{e}`" for e in c["errors"]))
        lines.append("- 実例: " + ", ".join(f"`{e}`" for e in c["examples"]))
        lines.append("")
    rest = [c for c in react if c["dir"] not in used]
    if rest:
        lines += ["", "## React版のみ／補助コンポーネント", ""]
        for c in rest:
            lines.append(f"- `{c['dir']}` — 依存: {' '.join(c['deps']) or 'なし'}")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--skill", required=True)
    a = ap.parse_args()
    src, skill = Path(a.src), Path(a.skill)

    for r in REPOS:
        if not (src / r).is_dir():
            raise SystemExit(f"missing {src / r}")
    plugin_dist = src / "npm/plugin/package/dist"
    tokens_dist = src / "npm/tokens/package/dist"

    assets = skill / "assets"
    gen = skill / "references/generated"
    reset_dir(assets)
    reset_dir(gen)

    # CSS
    (assets / "css").mkdir()
    shutil.copy2(src / HTML_REPO / "src/global.css", assets / "css/global.css")
    for f in ("tokens.css", "tokens-simple.css"):
        if (tokens_dist / f).exists():
            shutil.copy2(tokens_dist / f, assets / "css" / f)
    if not (assets / "css/tokens.css").exists():
        shutil.copy2(src / TOKENS_REPO / "examples/tokens.css", assets / "css/tokens.css")
    shutil.copy2(src / TOKENS_REPO / "figma/tokens.json", assets / "css/tokens.figma.json")

    # Tailwind
    tw = assets / "tailwind"
    tw.mkdir()
    for f in plugin_dist.iterdir():
        shutil.copy2(f, tw / f.name)
    theme = dump_tailwind_theme(plugin_dist, tw / "theme.json")
    if theme:
        write_cdn_config(theme, tw / "tailwind-cdn-config.js")
    shutil.copy2(src / REACT_REPO / "tailwind.config.js", tw / "tailwind.config.example.js")

    # Components
    html = copy_html_components(src / HTML_REPO, assets / "html/components")
    # 実例HTMLは ../../global.css を参照するので同じ位置にも置く（ブラウザで直接開けるように）
    shutil.copy2(src / HTML_REPO / "src/global.css", assets / "html/global.css")
    react = copy_react_components(src / REACT_REPO, assets / "react/components")
    v18 = src / REACT_REPO / "docs/using-with-react-v18.md"
    if v18.exists():
        shutil.copy2(v18, assets / "react/using-with-react-v18.md")

    # Upstream docs (as reference)
    docs = {
        "html-development-policy.md": src / HTML_REPO / "src/docs/development-policy.mdx",
        "html-getting-started.md": src / HTML_REPO / "src/docs/getting-started.mdx",
        "react-development-policy.md": src / REACT_REPO / "src/docs/development-policy.mdx",
        "react-getting-started.md": src / REACT_REPO / "src/docs/getting-started.mdx",
    }
    for name, p in docs.items():
        if p.exists():
            (gen / name).write_text(strip_mdx(p.read_text(encoding="utf-8")), encoding="utf-8")
    rules = src / REACT_REPO / ".agents/skills/component-rules/SKILL.md"
    if rules.exists():
        text = re.sub(r"^---.*?---\s*", "", rules.read_text(encoding="utf-8"), flags=re.S)
        (gen / "react-component-rules.md").write_text(text, encoding="utf-8")

    lic = assets / "licenses"
    lic.mkdir()
    for r in REPOS:
        if (src / r / "LICENSE").exists():
            shutil.copy2(src / r / "LICENSE", lic / f"{r}.LICENSE")

    tokens_css = (assets / "css/tokens.css").read_text(encoding="utf-8")
    write_tokens_md(tokens_css, theme, gen / "tokens.md")
    write_components_md(html, react, gen / "components.md")

    def pkg_version(dist: Path) -> str | None:
        pj = dist.parent / "package.json"
        return json.loads(pj.read_text())["version"] if pj.exists() else None

    repos_info = {r: git_info(src / r) for r in REPOS}
    tags_file = src / "upstream_tags.json"
    if tags_file.exists():
        for r, t in json.loads(tags_file.read_text()).items():
            if r in repos_info and t:
                repos_info[r]["tag"] = t
    version = {
        "generated_at": dt.date.today().isoformat(),
        "repos": repos_info,
        "npm": {
            "@digital-go-jp/tailwind-theme-plugin": pkg_version(plugin_dist),
            "@digital-go-jp/design-tokens": pkg_version(tokens_dist),
        },
        "counts": {"html_components": len(html), "react_components": len(react)},
    }
    (skill / "VERSION.json").write_text(json.dumps(version, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(version, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
