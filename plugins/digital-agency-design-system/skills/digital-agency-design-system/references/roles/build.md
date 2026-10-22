# 作る役の手順

Web 画面・フォーム・HTML 文書・アーティファクトを DADS に沿って作る。Claude Code・Cowork では `builder` エージェントがこの手順で動く。チャットでは、窓口のスキル（SKILL.md）が自分でこの手順を実行する。

パスはこのスキルのフォルダ（SKILL.md のあるフォルダ。以下 `SKILL_DIR`）からの相対パス。

先に SKILL.md の「基準の優先順位」「守るもの」「デザインのルール」「迷いやすい部品の選び方」を読んでおく。

## 0. 始める前に

1. 作る場所（プロジェクト）の直下に `DADS-PROTECT.md` があれば読む（`references/protect-file.md`）。書かれたファイル・色・部品は変えない。
2. 顧客の基準・既存のデザイン（ロゴ、ブランド色、既存の部品、スタイルガイド）があるか見る。あればそれが DADS より優先する。DADS は、顧客の基準が決めていない部分（アクセシビリティなど）を補う。
3. 形を決める（次の表）。プロジェクトの `package.json` に `react` があれば React 版、それ以外は HTML 版（1ファイルで渡すなら埋め込み）。

## 最初に決めること：どの形で作るか

デジタル庁が公開しているコードスニペット（HTML版・React版）、デザイントークン、Tailwind テーマプラグインを同梱している。取り込んだ版は `VERSION.json` に記録してある。

上流の設計思想は「パッケージではなくコピーして使うスニペット」。必要なコンポーネントのコードを**コピーしてから、プロジェクトに合わせて書き換えてよい**。

| 状況 | 使う形 | 素材 |
|---|---|---|
| ReactのプロジェクトでTailwind v3/v4が使える | **React版** | `assets/react/components/` ＋ Tailwindプラグイン |
| 素のHTML、Vue/Svelte等React以外、社内マニュアル、メール用HTML | **HTML版** | `assets/html/components/` ＋ `assets/css/global.css` |
| 1ファイルで完結させたいページ（チャットのアーティファクト、単体HTML配布） | **HTML版を埋め込み** | `scripts/bundle_html.py` で CSS/JS を1つにまとめる |
| Tailwindのユーティリティで自由にレイアウトしたい単体ページ | **Tailwind CDN＋トークン** | `assets/tailwind/tailwind-cdn-config.js` |

迷ったらHTML版。どの形でも、色・文字・角丸・影はトークンだけを使う。

## 作業の手順

1. `references/generated/components.md` で使う部品を探す（日本語名・HTMLのディレクトリ名・React名・必要なJS・バリエーション属性の一覧）。
2. 部品ごとに実物を読む。
   - HTML版：`assets/html/components/<dir>/<dir>.md`（仕様と使い方）と `playground.html` ほかの実例HTML、`.css`、`.js`。
   - React版：`assets/react/components/<Dir>/<Dir>.tsx`（あれば `component-spec.md` も）。import を見て、依存する部品（`Slot` など）も一緒にコピーする。
3. 部品のマークアップ・クラス名・`data-*` 属性は実例のとおりに書く。独自に似たものを作らない。
4. 部品が無いレイアウト部分は、トークン（`references/generated/tokens.md`）だけで組む。
5. 下の「仕上げチェック」をする。
6. 下の「軽い点検」をしてから渡す。

`components.md` の後半には、部品ごとに「JSが定義する要素名」「エラー文のクラス名」「実例ファイル名」がある。実例ファイル名が使い分けの手がかりになる（`errored.html`＝エラー表示、`with-form-control-label.html`＝ラベル付き、`overflow-on-mobile.html`＝狭い画面の表）。

コンポーネントの実装方針の詳細が必要なときだけ読む：
- HTML版の方針（クラス命名、単位、メディアクエリ、JS方針）：`references/generated/html-development-policy.md`
- React版の部品ルール（Tailwindの書き方、hooksの置き場所、ファイル構成）：`references/generated/react-component-rules.md`
- 導入手順：`references/generated/html-getting-started.md`、`references/generated/react-getting-started.md`

## 形ごとの組み立て方

### React版（Claude Code などでアプリを作るとき）

```sh
npm install @digital-go-jp/tailwind-theme-plugin
```
- Tailwind v3：`tailwind.config.js` の `plugins` に `require('@digital-go-jp/tailwind-theme-plugin')`（例は `assets/tailwind/tailwind.config.example.js`）。
- Tailwind v4：CSSで `@import 'tailwindcss'; @import '@digital-go-jp/tailwind-theme-plugin/v4';`
- 部品は `assets/react/components/<Dir>/` をプロジェクトの `src/components/` にコピーする。ストーリーやテストは同梱していない。
- React 19前提。React 18の場合は `assets/react/using-with-react-v18.md` の修正を加える。
- キーカラーを変えるときは `theme.extend.colors.key` を上書きする（部品側は触らない）。

### HTML版（複数ファイルで置けるとき）

- `assets/css/global.css` を読み込む（トークン＋リンク・フォーカス・文字ユーティリティ）。角丸・文字サイズ・行間・太さの CSS 変数（`--border-radius-8` など）は `assets/css/tokens.css` にしかないので、それらを使うときは `tokens.css` も読み込む（`bundle_html.py` は両方を自動で埋め込む）。既存サイトに後付けする場合は冒頭の `:root` だけでもよい。`assets/html/global.css` は実例HTMLを直接開くための同じ内容のコピーで、コピー元としては `assets/css/global.css` を使う。
- 使う部品の `.css` を読み込み、JSがある部品は `<script type="module" src="...">` で読み込む（`<dads-tab>` などの Custom Element になる）。
- `assets/html/components/*/` の実例HTMLはそのままブラウザで開ける。

### 1ファイルで完結させるとき（アーティファクト、単体HTML）

```sh
python3 scripts/bundle_html.py --list                       # 部品名の一覧
python3 scripts/bundle_html.py button input-text select textarea: tab:tab-aria > head.html
```
出力（フォント読み込み＋`<style>`＋必要な `<script type="module">`）を `<head>` に貼り、本文は実例HTMLのマークアップで書く。部品名の後ろの `:` でJSを選ぶ：`tab:tab-aria`＝そのJSだけ、`textarea:` や `table:`＝JSなし、`:` を付けない＝その部品のJSを全部。フォントは容量を抑えるため 400/700 だけを読み込む（実例HTMLは全ウェイトを読み込んでいるが、DADSの文字スタイルは 400 と 700 しか使わない）。「外部に依存しない1ファイル」と頼まれても、Google Fonts の読み込みは外さない（外すと Noto Sans JP の無い端末で別の書体になる）。外すのは、利用者がオフラインで使うなどと明示したときだけ。スクリプトを実行できない環境では、同じことを手で行う：`assets/css/global.css` と各部品の `.css` を `<style>` に、`.js` を `<script type="module">` に貼る。

### Tailwind CDN で単体ページを作るとき

```html
<script src="https://cdn.tailwindcss.com"></script>
<script>/* assets/tailwind/tailwind-cdn-config.js の中身を貼る */</script>
```
これで `bg-key-900` `text-std-16N-170` `rounded-8` などが使える。部品の見た目はReact版の `.tsx` に書かれたクラス列をそのまま流用できる。フォーカス・リンクのスタイルは global.css の該当部分も入れる。

## 仕上げチェック

- [ ] 色・文字サイズ・角丸・影がすべてトークン由来（Tailwind標準値や生の色コードが混じっていない）
- [ ] 文字スタイル名（`std-16N-170` 等）で文字を指定している
- [ ] 部品のクラス名・`data-*` 属性・構造が上流の実例どおり
- [ ] キーボードだけで操作でき、フォーカスが常に見える
- [ ] コントラスト4.5:1以上、色以外でも状態が分かる
- [ ] 375px幅で横スクロールが出ない
- [ ] `lang="ja"`、見出しレベルが飛んでいない、フォームにラベルがある
- [ ] 背景は白で、ダークモードの配色を作っていない
- [ ] `DADS-PROTECT.md` に書かれたものを変えていない

## 軽い点検（渡す前に必ず行う）

**Claude Code・Cowork**：`reviewer` エージェントを「軽い点検」で呼び、作ったファイル（React なら開発サーバーを起動して、その URL）を渡す。

審査役を呼べないとき（`Agent` ツールが無い。サブエージェントの中では入れ子の呼び出しが制限されている環境がある）は、審査の道具を自分で動かす。Chromium の有無を自分で調べて判断しない。必ず道具の終了コードで判断する。
```sh
bash scripts/audit/audit.sh --env          # disposable なら次の行に --install を付ける
bash scripts/audit/audit.sh <作ったファイルか URL> --quick --deps <依存の置き場所>
```
依存の置き場所は SKILL.md の「道具の場所」のもの（プラグインでは `${CLAUDE_PLUGIN_DATA}/audit`。一時フォルダに入れない）。終了コード 3 なら「未点検」。出力された `summary.md` の候補を、`roles/review.md` の重大度の付け方で確かめる。

結果の扱い：
- 致命的と「DADS」の印が付いたもの：渡す前に自分で直し、もう一度軽い点検をする（自分で作ったばかりのページなので、DADS の印も確認せずに直してよい）。
- 重要：上位3件だけ、渡すときに一言添える。
- 軽微：黙る。
- 審査役が「未点検（Chromium が無い）」と返したら、作ったものは渡し、「実際の表示では未点検」であることと、入れてよければ点検できることを一言添える。

**チャット**：ブラウザで表示できないので、上の「仕上げチェック」をコード上で1項目ずつ確かめる。渡すときに「表示しての点検は Cowork か Claude Code で行える」と一言添える。

## 渡し方

- 作ったファイルの場所と、何を作ったかを2〜3行で伝える。
- 軽い点検の結果は、上のルールのとおり（重要の上位3件だけ）。
- 迷った点（顧客の基準とぶつかった、守るものに触れそうだった など）があれば書く。
