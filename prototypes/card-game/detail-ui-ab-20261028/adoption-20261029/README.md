# 改善A案の正式採用（2026-10-29）

本人が改善A案の iPhone Safari 試遊を確認し、正式公開を承認したため、改善A案を正式の CARD GAME に組み込みました。

## 本番に入れたもの

- `prototypes/card-game/style.css` の末尾に、改善A案の CSS 28行（`#card-dialog.card-detail` の中だけに効く）。
  - 試遊版の `variants.css` の `:root[data-detail-variant=a2]` の部分から、比較用の条件だけを外したもの。
  - 横向きの「種類・コスト・レアリティを1行の流れにする」3行（試遊版では A・B 共通の部分）。
- `tools/pages/allowlist.json` の `style.css` のレビュー済みハッシュ1行。

## 本番に入れていないもの

試遊版の A/B 切り替え、「続き ↓」、比較用シナリオ、保存鍵の接頭辞、旧A案・B案の CSS、QA 用スクリプト。`detail-ui-ab-20261028/` は公開許可リストに含まれないため、Pages には配信されません（梱包の確認で 0件）。
JS（`app.mjs` など）・HTML・カード・エンジン・CPU・保存形式は変更していません。

## 確認

| 確認 | 結果 |
|---|---|
| 本番 CSS の表示が、本人が承認した試遊版の改善A案と同じか（5画面 × 8場面、[parity-results.json](parity-results.json)） | **40/40 同一**（本文の行数・割合、押せるボタン、操作帯の高さ、ボタン間隔、画像の面積、スクロール枠、はみ出し） |
| 本番 CSS での操作QA（[ops-results.json](ops-results.json)） | **38/38 PASS**（必須選択・対象指定・応答中のパス・CPU進行・2人対戦の交代・開閉・スクロール初期化・保存復帰・回転・アドレスバー・セーフエリア模擬・戦績/コレクション/マイデッキ） |
| カードゲーム node テスト | 494/494 |
| `tests/browser.cjs`・`tests/release-entry-browser.cjs`（CI と同じ） | 成功 |
| Pages 梱包 `package.py` / `verify.py`、`tests/pages` | 成功（4057ファイル、カード画像904、ハッシュ不一致0）、16/16 |

`tests/ui-layout.cjs` と `tests/deck-ui.cjs`（CI では実行されない）は、main でも同じ箇所で失敗します（デッキ編集の一覧が描画される前に件数を数えるため）。今回の変更とは関係ありません。

スクリーンショット: [screenshots/](screenshots/)（本番 CSS、3択・必須選択・応答中 × 5画面）。
