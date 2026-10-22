// 審査の道具の本体。audit.sh から呼ばれる（直接呼ばない）。
// ページを読み取り専用で表示し、axe-core・はみ出し・文字200%・フォーカス順・トークン外の色・JS エラーを記録する。
// 結果は result.json（機械向け）と summary.md（審査役が読む日本語の要約）、スクショ（PNG）。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(HERE, "../..");
const DEPS = process.env.DADS_AUDIT_DEPS;
const require = createRequire(path.join(DEPS, "package.json"));
const { chromium } = require("playwright");
const axePath = require.resolve("axe-core/axe.min.js");
const axeSource = fs.readFileSync(axePath, "utf-8");
const axeJa = JSON.parse(fs.readFileSync(path.join(path.dirname(axePath), "locales/ja.json"), "utf-8"));
const axeVersion = require("axe-core/package.json").version;
const pwVersion = require("playwright/package.json").version;

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, a) => (i % 2 === 0 ? [...acc, [v.replace(/^--/, ""), a[i + 1]]] : acc), []),
);
const QUICK = args.quick === "1";
const OUT = path.resolve(args.out);
const MAX_TABS = Number(args["max-tabs"] || 80);
const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 375, height: 812 };
const MAX_SHOT_HEIGHT = 12000;

function targetUrl(t) {
  if (/^https?:\/\//i.test(t)) return t;
  if (/^file:\/\//i.test(t)) return t;
  if (fs.existsSync(t)) return pathToFileURL(path.resolve(t)).href;
  console.error(`開けません（URL でもファイルでもありません）: ${t}`);
  process.exit(2);
}
const URL_ = targetUrl(args.target);

// DADS のトークンの色（tokens.css から読む）。白と黒も許す
function tokenColors() {
  const css = fs.readFileSync(path.join(SKILL_DIR, "assets/css/tokens.css"), "utf-8");
  const set = new Set(["rgb(255, 255, 255)", "rgb(0, 0, 0)"]);
  for (const m of css.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
    const h = m[1];
    set.add(`rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`);
  }
  for (const m of css.matchAll(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/g)) {
    set.add(`rgba(${m[1]}, ${m[2]}, ${m[3]}, ${Number(m[4])})`);
  }
  return [...set];
}

// WCAG のタグ → レベルと達成基準番号
function wcagInfo(tags) {
  const sc = tags
    .filter((t) => /^wcag\d{3,4}$/.test(t))
    .map((t) => {
      const d = t.slice(4);
      return d.length === 3 ? `${d[0]}.${d[1]}.${d[2]}` : `${d[0]}.${d[1]}.${d.slice(2)}`;
    });
  let level = null;
  if (tags.some((t) => /^wcag2(1|2)?a$/.test(t))) level = "A";
  else if (tags.some((t) => /^wcag2(1|2)?aa$/.test(t))) level = "AA";
  else if (tags.some((t) => /^wcag2(1|2)?aaa$/.test(t))) level = "AAA";
  const severity = level === "A" ? "致命的" : level === "AA" ? "重要" : "軽微";
  return { sc, level, severity };
}

async function runAxe(page) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async (ja) => {
    window.axe.configure({ locale: ja });
    const r = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
      resultTypes: ["violations", "incomplete"],
    });
    const pick = (v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      description: v.description,
      helpUrl: v.helpUrl,
      tags: v.tags,
      nodes: v.nodes.slice(0, 8).map((n) => ({ target: n.target.join(" "), html: n.html.slice(0, 200), summary: n.failureSummary })),
      count: v.nodes.length,
    });
    return { violations: r.violations.map(pick), incomplete: r.incomplete.map(pick) };
  }, axeJa);
}

// 画面幅からはみ出している要素（横スクロールの原因）
async function overflow(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    const sel = (el) => {
      const parts = [];
      for (let e = el; e && e.nodeType === 1 && parts.length < 4; e = e.parentElement) {
        let s = e.tagName.toLowerCase();
        if (e.id) { s += `#${e.id}`; parts.unshift(s); break; }
        if (e.classList.length) s += "." + [...e.classList].slice(0, 2).join(".");
        parts.unshift(s);
      }
      return parts.join(" > ");
    };
    const inScroller = (el) => {
      for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
        const o = getComputedStyle(e).overflowX;
        if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
      }
      return false;
    };
    const items = [];
    if (sw > vw + 1) {
      for (const el of document.body.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= vw + 1 || inScroller(el)) continue;
        if (el.parentElement && el.parentElement.getBoundingClientRect().right > vw + 1 && !inScroller(el.parentElement)) continue;
        items.push({ selector: sel(el), right: Math.round(r.right) });
        if (items.length >= 10) break;
      }
    }
    return { viewport: vw, scrollWidth: sw, horizontalScroll: sw > vw + 1, elements: items };
  });
}

// トークン外の色（文字色・背景色・枠線色）と、フォント
async function dadsStyle(page, tokens) {
  return page.evaluate((tokenList) => {
    const tokens = new Set(tokenList);
    const norm = (c) => c.replace(/\s+/g, " ").trim();
    const found = new Map();
    const sel = (el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : el.classList.length ? "." + [...el.classList].slice(0, 2).join(".") : "");
    for (const el of document.body.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const props = [];
      if (hasText) props.push(["color", cs.color]);
      props.push(["background-color", cs.backgroundColor]);
      if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none") props.push(["border-color", cs.borderTopColor]);
      for (const [prop, val] of props) {
        const v = norm(val);
        if (v === "rgba(0, 0, 0, 0)" || v === "transparent" || tokens.has(v)) continue;
        const key = `${prop}|${v}`;
        const cur = found.get(key) || { property: prop, value: v, count: 0, example: sel(el) };
        cur.count++;
        found.set(key, cur);
      }
    }
    const bodyFont = getComputedStyle(document.body).fontFamily;
    return {
      nonTokenColors: [...found.values()].sort((a, b) => b.count - a.count).slice(0, 30),
      bodyFontFamily: bodyFont,
      usesNotoSansJP: /Noto Sans JP/i.test(bodyFont),
      lang: document.documentElement.getAttribute("lang"),
    };
  }, tokens);
}

// 文字200%：ルートの文字サイズを200%にして、拡大されない文字と、新たに切れる文字を探す
const TEXT_SEL = "p, li, a, button, label, span, h1, h2, h3, h4, td, th, dt, dd";
function clippedNow() {
  // 文字がはみ出して隠れている要素の一覧。見た目を隠す技法（1〜2px の箱）は除く
  const out = [];
  const all = document.body.querySelectorAll("*");
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (!el.textContent.trim() || el.children.length > 3 || el.clientWidth <= 2 || el.clientHeight <= 2) continue;
    const cs = getComputedStyle(el);
    const hides = ["hidden", "clip"];
    const cutX = hides.includes(cs.overflowX) && el.scrollWidth > el.clientWidth + 2;
    const cutY = hides.includes(cs.overflowY) && el.scrollHeight > el.clientHeight + 2;
    if (cutX || cutY) out.push(i);
  }
  return out;
}
async function textZoom(page) {
  const before = await page.evaluate((sel) =>
    [...document.body.querySelectorAll(sel)].slice(0, 400).map((el) => parseFloat(getComputedStyle(el).fontSize)), TEXT_SEL);
  const clippedBefore = await page.evaluate(`(${clippedNow.toString()})()`);
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await page.waitForTimeout(300);
  const clippedAfter = await page.evaluate(`(${clippedNow.toString()})()`);
  const newlyClipped = clippedAfter.filter((i) => !clippedBefore.includes(i));
  return page.evaluate(({ before, sel, newlyClipped }) => {
    const els = [...document.body.querySelectorAll(sel)].slice(0, 400);
    let notScaled = 0;
    const notScaledExamples = [];
    els.forEach((el, i) => {
      const after = parseFloat(getComputedStyle(el).fontSize);
      if (before[i] && el.textContent.trim() && after < before[i] * 1.5) {
        notScaled++;
        if (notScaledExamples.length < 5) notScaledExamples.push(`${el.tagName.toLowerCase()}「${el.textContent.trim().slice(0, 20)}」${before[i]}px`);
      }
    });
    const all = document.body.querySelectorAll("*");
    const clipped = newlyClipped.slice(0, 10).map((i) => `${all[i].tagName.toLowerCase()}「${all[i].textContent.trim().slice(0, 20)}」`);
    const vw = document.documentElement.clientWidth;
    return {
      checkedElements: els.length,
      notScaled,
      notScaledExamples,
      clipped,
      horizontalScroll: document.documentElement.scrollWidth > vw + 1,
    };
  }, { before, sel: TEXT_SEL, newlyClipped });
}

// Tab キーでフォーカスを順に移し、順番・名前・フォーカス表示・閉じ込めを記録する
async function focusOrder(page) {
  await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); });
  // 操作できる部品の数（0 なら、Tab で移れなくても問題ではない）
  const interactive = await page.evaluate(() =>
    [...document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.disabled; }).length);
  const steps = [];
  let first = null;
  let repeat = 0;
  let prevKey = null;
  let trap = null;
  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(60);
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
      const shadow = cs.boxShadow && cs.boxShadow !== "none";
      const labelled = el.getAttribute("aria-labelledby");
      const name = (
        el.getAttribute("aria-label") ||
        (labelled && labelled.split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ")) ||
        (el.labels && el.labels[0] && el.labels[0].textContent) ||
        el.getAttribute("alt") || el.getAttribute("title") || el.innerText || el.getAttribute("placeholder") || el.value || ""
      ).replace(/\s+/g, " ").trim().slice(0, 40);
      const s = el.tagName.toLowerCase() + (el.id ? `#${el.id}` : el.classList.length ? "." + [...el.classList].slice(0, 2).join(".") : "");
      return {
        key: s + "|" + Math.round(r.x) + "," + Math.round(r.y + window.scrollY),
        selector: s,
        role: el.getAttribute("role") || el.tagName.toLowerCase(),
        name,
        rect: [Math.round(r.x), Math.round(r.y + window.scrollY), Math.round(r.width), Math.round(r.height)],
        visibleIndicator: Boolean(outline || shadow),
        offscreen: r.width === 0 || r.height === 0 || r.right < 0 || r.left > window.innerWidth,
      };
    });
    if (!info) { if (steps.length) break; else continue; }
    if (first && info.key === first) break; // 一周した
    if (!first) first = info.key;
    repeat = info.key === prevKey ? repeat + 1 : 0;
    prevKey = info.key;
    if (repeat >= 2) { trap = info.selector; break; }
    const { key, ...rest } = info;
    steps.push(rest);
  }
  return {
    steps,
    interactive,
    count: steps.length,
    reachedLimit: steps.length >= MAX_TABS,
    trap,
    noIndicator: steps.filter((s) => !s.visibleIndicator).map((s) => s.selector),
    noName: steps.filter((s) => !s.name).map((s) => s.selector),
    offscreen: steps.filter((s) => s.offscreen).map((s) => s.selector),
  };
}

async function shot(page, file) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const w = page.viewportSize().width;
  const opts = { path: path.join(OUT, file) };
  if (h > MAX_SHOT_HEIGHT) opts.clip = { x: 0, y: 0, width: w, height: MAX_SHOT_HEIGHT };
  else opts.fullPage = true;
  await page.screenshot(opts);
  return file;
}

async function main() {
  const tokens = tokenColors();
  const browser = await chromium.launch();
  const blocked = [];
  const consoleErrors = [];
  const pageErrors = [];
  const failed = [];

  async function open(viewport) {
    const context = await browser.newContext({ viewport, acceptDownloads: false, serviceWorkers: "block", locale: "ja-JP" });
    const page = await context.newPage();
    // 読み取り専用：GET と HEAD 以外の通信は止める
    await page.route("**/*", (route) => {
      const m = route.request().method();
      if (m === "GET" || m === "HEAD") return route.continue();
      blocked.push(`${m} ${route.request().url().slice(0, 120)}`);
      return route.abort();
    });
    page.on("dialog", (d) => d.dismiss().catch(() => {}));
    page.on("console", (msg) => { if (msg.type() === "error" && consoleErrors.length < 20) consoleErrors.push(msg.text().slice(0, 300)); });
    page.on("pageerror", (e) => { if (pageErrors.length < 20) pageErrors.push(String(e.message || e).slice(0, 300)); });
    page.on("requestfailed", (r) => {
      const m = r.method();
      if ((m === "GET" || m === "HEAD") && failed.length < 20) failed.push(`${r.failure()?.errorText || "failed"} ${r.url().slice(0, 120)}`);
    });
    try {
      await page.goto(URL_, { waitUntil: "load", timeout: 45000 });
    } catch (e) {
      console.error(`ページを開けませんでした: ${URL_}\n${e.message}`);
      await browser.close();
      process.exit(4);
    }
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    return { context, page };
  }

  const result = {
    target: args.target,
    url: URL_,
    mode: QUICK ? "quick" : "full",
    checkedAt: new Date().toISOString(),
    tools: { playwright: pwVersion, axeCore: axeVersion },
  };

  // 1280px
  const wide = await open(WIDE);
  result.title = await wide.page.title();
  result.axe = { wide: await runAxe(wide.page) };
  result.dads = await dadsStyle(wide.page, tokens);
  if (!QUICK) {
    result.screenshots = { wide: await shot(wide.page, "wide-1280.png") };
    result.focus = await focusOrder(wide.page);
    await wide.page.reload({ waitUntil: "load" });
    await wide.page.waitForTimeout(500);
    result.textZoom = await textZoom(wide.page);
    result.screenshots.textZoom = await shot(wide.page, "text200-1280.png");
  }
  await wide.context.close();

  // 375px
  const narrow = await open(NARROW);
  result.overflow375 = await overflow(narrow.page);
  if (!QUICK) {
    result.axe.narrow = await runAxe(narrow.page);
    result.screenshots.narrow = await shot(narrow.page, "narrow-375.png");
  }
  await narrow.context.close();
  await browser.close();

  result.errors = { console: consoleErrors, page: pageErrors, failedRequests: failed, blockedRequests: [...new Set(blocked)] };
  result.findings = collect(result);
  fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(OUT, "summary.md"), summary(result));
  console.log(path.join(OUT, "summary.md"));
}

// 道具が見つけた問題の候補を、重大度の目安つきで並べる（最終的な判断は審査役が行う）
function collect(r) {
  const out = [];
  const seen = new Set();
  for (const [where, ax] of Object.entries(r.axe)) {
    for (const v of ax.violations) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      const w = wcagInfo(v.tags);
      out.push({ source: `axe:${v.id}`, severity: w.severity, level: w.level, sc: w.sc, dads: false, title: v.help, count: v.count, where, examples: v.nodes.slice(0, 3).map((n) => n.target) });
    }
  }
  const o = r.overflow375;
  if (o.horizontalScroll) out.push({ source: "overflow375", severity: "重要", level: "AA", sc: ["1.4.10"], dads: false, title: "375px 幅で横スクロールが出る", examples: o.elements.slice(0, 3).map((e) => e.selector) });
  if (r.focus) {
    if (r.focus.trap) out.push({ source: "focus:trap", severity: "致命的", level: "A", sc: ["2.1.2"], dads: false, title: "キーボードのフォーカスが抜け出せなくなる", examples: [r.focus.trap] });
    if (r.focus.noIndicator.length) out.push({ source: "focus:indicator", severity: "重要", level: "AA", sc: ["2.4.7"], dads: true, title: "フォーカスしても表示（枠線など）が見えない可能性がある要素", count: r.focus.noIndicator.length, examples: r.focus.noIndicator.slice(0, 3) });
    if (r.focus.offscreen.length) out.push({ source: "focus:offscreen", severity: "重要", level: "AA", sc: ["2.4.11"], dads: false, title: "フォーカスが画面の外や見えない要素に移る", count: r.focus.offscreen.length, examples: r.focus.offscreen.slice(0, 3) });
    if (r.focus.count === 0 && r.focus.interactive > 0) out.push({ source: "focus:none", severity: "致命的", level: "A", sc: ["2.1.1"], dads: false, title: `操作できる部品が ${r.focus.interactive} 個あるのに、Tab キーでフォーカスできない`, examples: [] });
  }
  if (r.textZoom) {
    if (r.textZoom.clipped.length) out.push({ source: "text200:clipped", severity: "重要", level: "AA", sc: ["1.4.4"], dads: false, title: "文字を200%にすると新たに切れる文字がある", count: r.textZoom.clipped.length, examples: r.textZoom.clipped.slice(0, 3) });
    if (r.textZoom.notScaled) out.push({ source: "text200:px", severity: "軽微", level: null, sc: [], dads: true, title: "文字サイズが px 指定で、ブラウザの文字サイズ設定で大きくならない（DADS は rem 指定）", count: r.textZoom.notScaled, examples: r.textZoom.notScaledExamples.slice(0, 3) });
  }
  if (r.dads.nonTokenColors.length) out.push({ source: "dads:color", severity: "軽微", level: null, sc: [], dads: true, title: "DADS のトークンにない色を使っている", count: r.dads.nonTokenColors.length, examples: r.dads.nonTokenColors.slice(0, 3).map((c) => `${c.property} ${c.value}（${c.example}）`) });
  if (!r.dads.usesNotoSansJP) out.push({ source: "dads:font", severity: "軽微", level: null, sc: [], dads: true, title: "本文のフォントが Noto Sans JP ではない", examples: [r.dads.bodyFontFamily.slice(0, 60)] });
  if (r.errors.page.length) out.push({ source: "js:error", severity: "重要", level: null, sc: [], dads: false, title: "JavaScript のエラーが出ている（部品が動かない可能性）", count: r.errors.page.length, examples: r.errors.page.slice(0, 2) });
  const order = { 致命的: 0, 重要: 1, 軽微: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

function summary(r) {
  const L = [];
  const n = (s) => r.findings.filter((f) => f.severity === s).length;
  L.push(`# 審査の道具の記録：${r.title || r.target}`);
  L.push("");
  L.push(`- 対象: ${r.url}`);
  L.push(`- 日時: ${r.checkedAt}`);
  L.push(`- モード: ${r.mode === "quick" ? "軽い点検（axe・375px のはみ出し・トークン外の色）" : "深い審査（全項目）"}`);
  L.push(`- 道具: Playwright ${r.tools.playwright}、axe-core ${r.tools.axeCore}`);
  L.push(`- 候補の数: 致命的 ${n("致命的")}／重要 ${n("重要")}／軽微 ${n("軽微")}（DADS の印 ${r.findings.filter((f) => f.dads).length}）`);
  L.push("");
  L.push("重大度は目安です（WCAG のレベル A＝致命的、AA＝重要、それ以外＝軽微）。誤検知がありうるので、審査役が画面とコードで確かめてから指摘にします。");
  L.push("");
  L.push("## 問題の候補");
  L.push("");
  if (!r.findings.length) L.push("（道具では見つかりませんでした。目で確かめる観点は残っています）");
  for (const f of r.findings) {
    const meta = [f.level ? `WCAG ${f.level}` : null, f.sc.length ? `達成基準 ${f.sc.join(", ")}` : null, f.dads ? "DADS" : null, f.count ? `${f.count} 件` : null].filter(Boolean).join("・");
    L.push(`- **${f.severity}** ${f.title}（${meta || f.source}）`);
    for (const e of f.examples || []) L.push(`  - \`${String(e).replace(/`/g, "'")}\``);
  }
  L.push("");
  L.push("## 確かめたこと");
  L.push("");
  L.push(`- 375px 幅の横スクロール: ${r.overflow375.horizontalScroll ? `あり（ページ幅 ${r.overflow375.scrollWidth}px）` : "なし"}`);
  L.push(`- lang 属性: ${r.dads.lang || "なし"}、本文のフォント: ${r.dads.usesNotoSansJP ? "Noto Sans JP" : r.dads.bodyFontFamily.slice(0, 60)}`);
  if (r.focus) {
    L.push(`- Tab キーで移れた要素: ${r.focus.count} 個${r.focus.reachedLimit ? "（上限で打ち切り）" : ""}（操作できる部品 ${r.focus.interactive} 個）。名前のない要素 ${r.focus.noName.length} 個`);
  }
  if (r.textZoom) {
    L.push(`- 文字200%: 大きくならない文字 ${r.textZoom.notScaled} / ${r.textZoom.checkedElements}、切れる文字 ${r.textZoom.clipped.length}、横スクロール ${r.textZoom.horizontalScroll ? "あり" : "なし"}`);
  }
  const axeIncomplete = Object.values(r.axe).flatMap((a) => a.incomplete.map((i) => i.help));
  if (axeIncomplete.length) L.push(`- axe-core が判断できず人の確認が要る項目: ${[...new Set(axeIncomplete)].slice(0, 8).join("／")}`);
  L.push(`- JS のエラー ${r.errors.page.length} 件、コンソールのエラー ${r.errors.console.length} 件、読み込めなかったファイル ${r.errors.failedRequests.length} 件`);
  if (r.errors.blockedRequests.length) L.push(`- 読み取り専用のため止めた通信: ${r.errors.blockedRequests.length} 件`);
  if (r.screenshots) {
    L.push("");
    L.push("## スクショ");
    L.push("");
    for (const f of Object.values(r.screenshots)) L.push(`- ${f}`);
  }
  L.push("");
  L.push("## 道具では確かめられないこと");
  L.push("");
  L.push("- 文言の分かりやすさ、画像の代替テキストの中身が適切か、見出しの構造が内容に合っているか");
  L.push("- DADS の部品の使い方（クラス名・data 属性・構造が上流の実例どおりか）。コードを読んで確かめる");
  L.push("- 音声読み上げソフトでの実際の読まれ方、ログインや送信の後の画面（読み取り専用のため操作しない）");
  return L.join("\n") + "\n";
}

main().catch((e) => {
  console.error(e.stack || String(e));
  process.exit(1);
});
