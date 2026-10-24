# digital-agency-design-system（配布用）

Web 画面や HTML の文書、PowerPoint の資料を、誰が作っても品質の下限を割らないようにするための Claude のプラグインです。
デジタル庁デザインシステム（DADS）を土台に、作る・審査する・直すの3つを手伝います。
審査はページを実際に表示して、アクセシビリティ（JIS X 8341-3・WCAG 2.2 AA）、DADS への準拠、表示、文言を点検します。PowerPoint の資料は、テクバン独自の Office 基準（スライド編）で点検し、直したものを別名で保存します。

このリポジトリは配布専用です。開発は別の場所で行い、更新のたびにここへ自動で反映されます（直接編集しないでください）。

## 入れ方（Claude デスクトップアプリ）

1. 左下の自分の名前 →「設定」→ 設定の左のメニューの「プラグイン」
2. 右上の「＋ 追加」→「マーケットプレイスを追加」→「リポジトリから追加」
3. URL に `kishi-satoshi/digital-agency-design-system-dist` を入れて「同期」
4. 表示された digital-agency-design-system を「インストール」

Claude Code では次の 2 行です。

```
/plugin marketplace add Kishi-Satoshi/digital-agency-design-system-dist
/plugin install digital-agency-design-system@digital-agency-design-system-dist
```

説明書: https://kishi-satoshi.github.io/digital-agency-design-system-dist/

テクバン社内での利用を目的としたものです。デジタル庁デザインシステムを個人がプラグインにしたもので、デジタル庁の公式配布物ではありません。
上流はいずれも MIT ライセンス（著作権者：デジタル庁）で、ライセンス文は `plugins/digital-agency-design-system/skills/digital-agency-design-system/assets/licenses/` にあります。
審査は事前点検であり、JIS X 8341-3 への適合を表明するものではありません。
