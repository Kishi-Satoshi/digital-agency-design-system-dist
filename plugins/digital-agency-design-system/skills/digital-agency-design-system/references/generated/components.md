# コンポーネント一覧（自動生成）

scripts/update.sh で再生成される。手で編集しない。
- HTML版: `assets/html/components/<dir>/`（`<dir>.md` が仕様と使い方、`*.html` が実例、`*.css`/`*.js` が実装）
- React版: `assets/react/components/<Dir>/`（`<Dir>.tsx` が実装、`component-spec.md` があれば設計メモ。「storiesに実装例」の部品は部品化されておらず、`<Dir>.stories.tsx` 内のJSXをマークアップ例として使う）
- JS列が空でないHTMLコンポーネントは Custom Element（`<dads-*>`）としてJSの読み込みが必要。

| 名前 | HTML dir | CSS | JS | React dir | React依存 | バリエーション |
|---|---|---|---|---|---|---|
| アコーディオン | accordion | accordion.css | - | Accordion | - | - |
| 引用ブロック | blockquote | blockquote.css | - | Blockquote | - | - |
| パンくずナビゲーション | breadcrumb | breadcrumb.css | - | Breadcrumbs | Slot | - |
| ボタン | button | button.css | - | Button | Slot | `data-type`=`solid-fill`, `outline`, `text`; `data-size`=`lg`, `md`, `sm`, `xs` |
| 日付ピッカー/カレンダー | calendar | calendar.css | calendar.js | Calendar（storiesに実装例） | - | - |
| カード | card | card-example-1.css card-example-2.css card-example-3.css card-example-4.css card-example-5.css card-example-6.css | - | Card | - | - |
| カルーセル | carousel | carousel-single.css carousel.css | carousel.js | Carousel | Disclosure | `breakpoint-rem`=数値（例：`64`）; `data-js-unit`=文字列（例：`スライド`） |
| チェックボックス | checkbox | checkbox.css | - | Checkbox | - | `data-size`=`sm`, `md`, `lg` |
| チップラベル | chip-label | chip-label.css | - | ChipLabel | - | `data-style`=`text`, `outlined`, `filled-1`, `filled-2`; `data-color`=`gray`, `blue`, `light-blue`, `cyan`, `green`, `lime`, `yellow`, `orange`, `red`, `magenta`, `purple` |
| 日付ピッカー | date-picker | date-picker.css date-picker.stories.css | date-picker.js | DatePicker | - | `data-type`=`consolidated`, `separated`; `data-size`（controls要素）=`sm`, `md`, `lg` |
| 説明リスト | description-list | description-list.css | - | Dl | - | `data-marker`=`bullet`, `custom` |
| ディスクロージャー | disclosure | disclosure.css | - | Disclosure | - | - |
| ディバイダー | divider | divider.css | - | Divider | - | `data-color`=`solid-gray-420`, `solid-gray-536`, `black`; `data-style`=`solid`, `dashed`; `data-width`=`1`, `2`, `3`, `4` |
| ドロワー | drawer | drawer.css | - | Drawer（storiesに実装例） | - | `data-placement`=`left`, `right` |
| 緊急時バナー | emergency-banner | emergency-banner.css | - | EmergencyBanner | - | - |
| ファイルアップロード／ドロップエリア | file-upload | file-upload.css file-upload.stories.css | file-upload.js | FileUpload | - | `max-files`=数値; `max-file-size`=サイズ文字列（例：`5MB`）; `max-total-size`=サイズ文字列（例：`10MB`） |
| フォームコントロールラベル | form-control-label | form-control-label.css | - | FormControlLabel | - | `data-size`=`sm`, `md`, `lg` |
| ハンバーガーメニューボタン | hamburger-menu-button | hamburger-menu-button.css hamburger-menu-icon-button.css | - | HamburgerMenuButton | - | - |
| 見出し | heading | heading.css | - | Heading | - | `data-size`=`64`, `57`, `45`, `36`, `32`, `28`, `24`, `20`, `18`, `16`; `data-chip`=（属性の有無）; `data-rule`=`8`, `6`, `4`, `2` |
| 水平メニュー | horizontal-menu | horizontal-menu.css | - | HorizontalMenu | - | - |
| 画像 | image | image.css | - | Image | - | - |
| インプットテキスト | input-text | input-text.css | - | Input | - | `data-size`=`sm`, `md`, `lg` |
| ランゲージセレクター | language-selector | language-selector.css language-selector.stories.css | language-selector.js | LanguageSelector | - | - |
| リンク | link | link.css | - | Link | Slot | - |
| 箇条書きリスト | list | list.css | - | List | - | `data-spacing`=`4`, `8`, `12`; `data-marker`=`number` |
| メニューリスト | menu-list | menu-list.css | - | MenuList | - | `data-type`=`standard`, `box`; `data-size`=`regular`, `small` |
| メニューリストボックス | menu-list-box | menu-list-box.css menu-list-box.stories.css | menu-list-box.js | MenuListBox | - | `data-size`=opener; `data-style`=opener; `data-text-weight`=opener |
| モーダルダイアログ | modal-dialog | modal-dialog.css | - | ModalDialog | - | - |
| ノティフィケーションバナー | notification-banner | notification-banner.css | - | NotificationBanner | - | `data-style`=`standard`, `color-chip`; `data-type`=`success`, `error`, `warning`, `info-1`, `info-2` |
| ページナビゲーション | page-navigation | page-navigation.css | - | PageNavigation | Button Slot | - |
| プログレスインジケーター | progress-indicator | progress-indicator.css progress-indicator.stories.css | progress-indicator.js | ProgressIndicator | - | `data-type`=`stacked`, `inlined`, `stacked-underlay`; `intent`=`explicit`, `passive`; `value`=`0`〜`100`の数値; `announce-interval`=秒単位の正の数値 |
| ラジオボタン | radio | radio.css | - | Radio | - | `data-size`=`sm`, `md`, `lg` |
| リソースリスト | resource-list | resource-list.css | - | ResourceList | Slot | `data-style`=`list`, `frame`; `data-interaction`=`whole` |
| 検索ボックス | search-box | search-box.css | - | SearchBox | Button | `data-size`=`lg`（デフォルト）, `md`, `sm` |
| セレクトボックス | select | select.css | - | Select | - | `data-size`=`sm`, `md`, `lg` |
| ステップナビゲーション | step-navigation | step-navigation.css | - | StepNavigation | Slot | `data-orientation`=`horizontal`, `vertical`; `data-size`=`normal`, `small` |
| スイッチ | switch | switch-mode.css switch-on-off.css | switch-mode.js switch-on-off.js | Switch | - | - |
| タブ | tab | tab.css | tab-aria.js tab.js | Tab | - | `data-position`=`top`（デフォルト）, `bottom`, `left`, `right` |
| テーブル／データテーブル | table | table.css | scroll-shadow.js | Table（storiesに実装例） | - | - |
| テキストエリア | textarea | textarea.css | textarea-counter.js | Textarea | - | - |
| 目次 | toc | toc.css | - | （HTML版のみ） | - | `data-border`=なし（デフォルト）, `dotted`, `solid` |
| ユーティリティーリンク | utility-link | utility-link.css | - | UtilityLink | Slot | - |

## HTML版の詳細（JSが定義する要素・エラー文のクラス・実例ファイル）

実例ファイル名が使い分けの手がかりになる（例：`errored.html` はエラー表示、`overflow-on-mobile.html` は狭い画面で横スクロールする表）。

### アコーディオン（`accordion`）
- 実例: `playground.html`, `stacked.html`

### 引用ブロック（`blockquote`）
- 実例: `multiple-paragraphs.html`, `playground.html`, `with-list.html`

### パンくずナビゲーション（`breadcrumb`）
- 実例: `plain.html`, `with-home-icon.html`, `with-visible-label.html`

### ボタン（`button`）
- 実例: `all-buttons-using-button.html`, `all-buttons-using-link.html`, `as-link.html`, `disabled-link.html`, `disabled.html`, `playground.html`, `with-icon.html`

### 日付ピッカー/カレンダー（`calendar`）
- JS: `calendar.js` → `<dads-calendar>`
- 実例: `playground.html`

### カード（`card`）
- 実例: `example-1.html`, `example-2.html`, `example-3.html`, `example-4.html`, `example-5.html`, `example-6.html`

### カルーセル（`carousel`）
- JS: `carousel.js` → `<dads-carousel>`, `<dads-carousel-step-nav>`
- 実例: `container.html`, `key-visual-multi.html`, `key-visual-single.html`

### チェックボックス（`checkbox`）
- 実例: `all-checkboxes.html`, `errored.html`, `indeterminate.html`, `playground.html`, `stacked.html`, `standalone.html`

### チップラベル（`chip-label`）
- 実例: `all-chip-labels.html`, `custom-color.html`, `playground.html`, `with-icon.html`, `without-icon.html`

### 日付ピッカー（`date-picker`）
- JS: `date-picker.js` → `<dads-date-picker>`
- エラー文: `.dads-date-picker__error-text`
- 実例: `disabled.html`, `error.html`, `playground-consolidated-with-calendar.html`, `playground-consolidated.html`, `playground-separated-with-calendar.html`, `playground-separated.html`, `readonly.html`, `with-form-control-label.html`

### 説明リスト（`description-list`）
- 実例: `bullet.html`, `custom-icon-marker.html`, `custom-marker.html`, `without-marker.html`

### ディスクロージャー（`disclosure`）
- 実例: `playground.html`

### ディバイダー（`divider`）
- 実例: `all-dividers.html`, `decorative.html`, `playground.html`

### ドロワー（`drawer`）
- 実例: `left.html`, `right.html`

### 緊急時バナー（`emergency-banner`）
- 実例: `playground.html`

### ファイルアップロード／ドロップエリア（`file-upload`）
- JS: `file-upload.js` → `<dads-file-upload>`
- 実例: `non-expandable.html`, `playground.html`, `single-file.html`, `with-error.html`, `with-existing-files.html`, `with-form-control-label.html`, `without-drop-area.html`

### フォームコントロールラベル（`form-control-label`）
- エラー文: `.dads-form-control-label__error-text`
- 実例: `horizontal.html`, `multiple.html`, `single.html`

### ハンバーガーメニューボタン（`hamburger-menu-button`）
- 実例: `desktop-and-mobile.html`, `icon-button.html`, `mobile-conditional-en.html`, `mobile-conditional.html`, `text-button.html`

### 見出し（`heading`）
- 実例: `basic.html`, `playground.html`, `with-chip.html`, `with-icon.html`, `with-rule.html`, `with-shoulder.html`

### 水平メニュー（`horizontal-menu`）
- 実例: `links-only.html`, `playground.html`, `submenu-button.html`

### 画像（`image`）
- 実例: `borderless.html`, `caption-solid.html`, `full-width.html`, `playground.html`, `with-link.html`, `with-picture-element.html`, `without-caption.html`

### インプットテキスト（`input-text`）
- エラー文: `.dads-input-text__error-text`
- 実例: `basic.html`, `disabled.html`, `errored.html`, `readonly.html`, `with-form-control-label.html`

### ランゲージセレクター（`language-selector`）
- JS: `language-selector.js` → `<dads-language-selector>`
- 実例: `playground.html`

### リンク（`link`）
- 実例: `new-tab.html`, `playground.html`

### 箇条書きリスト（`list`）
- 実例: `bullet.html`, `custom-marker-format.html`, `nested.html`, `numbered-with-links.html`, `numbered.html`

### メニューリスト（`menu-list`）
- 実例: `basic.html`, `has-children.html`, `playground.html`

### メニューリストボックス（`menu-list-box`）
- JS: `menu-list-box.js` → `<dads-menu-list-box>`
- 実例: `playground.html`

### モーダルダイアログ（`modal-dialog`）
- 実例: `fixed-width.html`, `full-width.html`, `inner-scroll-with-fixed-actions.html`, `inner-scroll-with-fixed-both.html`, `inner-scroll-with-fixed-header.html`, `inner-scroll.html`, `playground.html`

### ノティフィケーションバナー（`notification-banner`）
- 実例: `color-chip.html`, `error.html`, `info-1.html`, `info-2.html`, `mobile-compact.html`, `success.html`, `warning.html`

### ページナビゲーション（`page-navigation`）
- 実例: `arrow-button.html`, `first-page.html`, `last-page.html`, `outlined-button.html`, `text-button.html`

### プログレスインジケーター（`progress-indicator`）
- JS: `progress-indicator.js` → `<dads-progress-indicator>`
- 実例: `interactive-demo.html`, `linear-fill.html`, `linear-loop.html`, `spinner-fill.html`, `spinner-loop.html`, `static.html`

### ラジオボタン（`radio`）
- 実例: `all-radios.html`, `errored.html`, `playground.html`, `stacked.html`, `standalone.html`

### リソースリスト（`resource-list`）
- 実例: `multiple-items.html`, `plain-with-inline-link.html`, `plain-with-whole-link.html`, `plain.html`, `selectable-with-inline-interaction.html`, `selectable-with-whole-interaction.html`

### 検索ボックス（`search-box`）
- 実例: `playground.html`, `with-detail.html`, `without-select.html`

### セレクトボックス（`select`）
- エラー文: `.dads-select__error-text`
- 実例: `disabled.html`, `error.html`, `optgroup.html`, `playground.html`, `with-form-control-label.html`

### ステップナビゲーション（`step-navigation`）
- 実例: `as-navigation.html`, `number-only.html`, `playground.html`, `set-step-width.html`, `step-completed.html`, `step-default.html`, `step-editing.html`, `step-error.html`, `step-reached.html`, `step-skipped.html`

### スイッチ（`switch`）
- JS: `switch-mode.js` → `<dads-switch-mode>`; `switch-on-off.js` → `<dads-switch-on-off>`
- 実例: `playground-mode.html`, `playground-on-off.html`, `with-form-control-label-mode.html`, `with-form-control-label-on-off.html`

### タブ（`tab`）
- JS: `tab-aria.js` → `<dads-tab-aria>`; `tab.js` → `<dads-tab>`
- 実例: `basic-aria.html`, `basic-static.html`, `basic.html`, `example.html`, `playground-aria.html`, `playground-static.html`, `playground.html`

### テーブル／データテーブル（`table`）
- JS: `scroll-shadow.js` → `<dads-scroll-shadow>`
- 実例: `border-on-row-and-column.html`, `condensed-table.html`, `example.html`, `first-column-as-header-cell.html`, `first-row-and-column-as-header-cell.html`, `first-row-as-header-cell.html`, `highlight-hovered-row.html`, `indented-rows.html`, `linked-text-in-cell.html`, `overflow-on-mobile.html`, `plain.html`, `playground.html`, `selectable-table.html`, `sortable-header-dense.html`, `sortable-header.html`, `stripe-table.html`, `table-header-with-colspan.html`, `table-header-with-rowspan.html`, `with-caption.html`

### テキストエリア（`textarea`）
- JS: `textarea-counter.js` → `<dads-textarea-counter>`
- エラー文: `.dads-textarea__error-text`
- 実例: `basic.html`, `disabled.html`, `errored.html`, `readonly.html`, `with-counter.html`, `with-form-control-label.html`

### 目次（`toc`）
- 実例: `nested.html`, `playground.html`

### ユーティリティーリンク（`utility-link`）
- 実例: `basic.html`, `multiple.html`, `playground.html`, `with-lead-icon.html`


## React版のみ／補助コンポーネント

- `ErrorText` — 依存: なし
- `SeparatedDatePicker` — 依存: なし
- `Slot` — 依存: なし
