# 07. 正式カード・証拠の保護結果と検証

## 変更したもの（このPR全体）
| 種別 | パス | 内容 |
|---|---|---|
| 既存ファイルの変更 | `prototypes/card-game/rulebook-content.mjs` | 第8章に「発動コスト」の説明を1項目追加（+1項目・197字） |
| 既存ファイルの変更 | `tools/pages/allowlist.json` | 上のファイルのレビュー済みハッシュ1行のみ（`5171a6ce…` → `b04e2ea0…`） |
| 新規 | `prototypes/card-game/tests/activation-cost-explanation.test.mjs` | 2件 |
| 新規 | `prototypes/card-game/followup-20261028/` | 本資料一式 |

## 変更していないもの（`git status` で変更0を確認）
正式452枚の本文・効果・数値（`full-catalog.mjs`、`cards.mjs`、`rules.mjs`、`main-rules.mjs`、`remaining-rules.mjs`）、ゲームエンジン（`engine.mjs`）、CPU判断（`cpu-policy.mjs`）、保存形式（`records-match.mjs`）、カード画像・アート（`ui-art.mjs`、`art-pilot/`、`ui-assets/`）、`rulebook-sources.mjs`（出典ハッシュ保持）、`docs/card-game/`（番号付き裁定の原本）、`docs/card-game-design-current.md`、`docs/content-provenance-20261021/`（過去版の出典表）、`prototypes/card-game/evidence/`、PR #459 の `full-audit-20261028/`、他の調査ディレクトリ。固定400戦の再実行・新しい大量対戦は行っていません。

## ハッシュ変更の過去版／現行版の区別
- `rulebook-content.mjs`: 過去版 `5171a6ceb6f53e51cefca1e0b5250b9e3222234a964410a1eb599dd6b73b2bd7`（#456 時点の main）／現行 `b04e2ea0594df99ab1c9b7375980920613628df75fae6b34e32f3a398ca4b451`。
- 過去版のハッシュを保持する `learning-evidence/rarity-alignment/runtime-integrity.json` は**過去の証拠として不変更**（その時点の版の記録）。現行値は `tools/pages/allowlist.json` に1か所だけある。
- 検証器は弱めていません。更新したのは、公開用パッケージャの「ランタイムのソースが変わったら見直す」ための期待ハッシュ1行だけです。パッケージャはこの状態で正常終了（ローカル検証のみ、デプロイなし）、`tests/pages` は16件すべて成功。

## 検証結果
| 検証 | 結果 |
|---|---|
| カードゲーム node テスト全67ファイル（`tests/*.test.mjs`） | **469/469 成功**（[ログ](evidence/card-game-node-tests-469.log)）。新規2件を含む |
| `tests/pages`（Pages公開ゲートの単体テスト） | 16/16 成功 |
| `tools/pages/package.py`（ローカルのみ） | 正常終了。4,057ファイル |
| 実画面QA | 84セル（20枚×幅＋横向き）で面の見切れ0。詳細は `04` |

- 実行していないテスト: ブラウザ・DOM系（`*.dom.mjs`、`*.browser.mjs`、`*.cjs`）の既存スイート。表示QAは今回の専用スクリプトで実施しました。
- 検証は、PR #459 の先頭に main `85a59bb3`（#458）を取り込んだ作業木でも実施し（469/469）、その後、差分を #459 だけの上に載せ直しています。#458 はカードゲームのファイルを含まず、結果に影響しません。

## 見つかった別件（本PRでは触れていません）
main `85a59bb3`（PR #458 のマージ後）では、`tools/pages/allowlist.json` の `index.html` と `ui.css` のレビュー済みハッシュが現在のファイルと一致せず、`package.py` が「runtime source changed」で停止し、`tests/pages/test_naopoyo_publication.py` が1件失敗します（新しいメニュー見出しの文言）。カードゲームとは無関係で、他の作業の範囲のため手を付けていません。公開（デプロイ）前に、その作業の側で確認が必要です。
