# たこやきやさん（G-takoyaki-grill）の対象選択の修正（2026-10-29）

正式裁定どおり、**発動中のたこやき自身を対象にできない**ようにしました。ほかの準備枠の札は従来どおり選べます。基準は最新 main `f1d3d6b9`（#442 後）。**mainマージ・本番Pages更新はしていません。**

- 発見：PR #468 の証拠 `prototypes/card-game/lunar-submarine-tier1-20261028/evidence/takoyaki-self-target.*`（このPRでは再利用・参照のみで、#468 の変更は取り込んでいません）。
- 総合報告：[REPORT.md](REPORT.md)

## 1. 正式本文・裁定・実装

| 項目 | 内容 |
|---|---|
| 正式本文（変更なし） | 自分のターン終了時に発動できる。自分の準備枠のカード1枚を対象とする。次の自分ターン開始時、対象が自分の準備枠に残っているなら、1枚引き、自分のそだち+5。（時1・しかける） |
| 裁定 87（G-takoyaki-grill の接続） | このしかけ自身は発動領域へ出ているため対象にできない。離れて戻った札は新個体。 |
| 裁定 88 X06 | たこやきは発動領域へ出てから対象を確認するため自身を対象にできない。 |
| 後の文書による変更 | なし（87・88 以降にたこやきの対象を変える文書はない。旧検証器 proxy の局面 P97-06 も別の札を対象にしている） |
| 修正前の実装 | `remaining-rules.mjs` の誘発が汎用の `target:'ownPrepared'`（準備枠の全カード）を使い、たこやき自身も候補に入っていた |

## 2. 原因と修正（実行ソース3ファイル）

| ファイル | 変更 |
|---|---|
| `effects.mjs` | 対象種別 `ownPreparedOther`（自分の準備枠のうち、発動元以外）を1つ追加。既存の種別（`ownPrepared` ほか）は変更なし |
| `remaining-rules.mjs` | たこやきの誘発を版で分ける（既存の `onlyVersions` の仕組み、#449 のクモと同じ形）。index 0：`ownPrepared`（hotseat-2〜4、旧挙動）／index 1：`ownPreparedOther`（hotseat-5）。効果・タイミング・条件は同じ |
| `engine.mjs` | 新規対戦の版を `hotseat-5` に。`RULE_VERSIONS` に hotseat-4 を残す |

- 対象指定以外（発動タイミング、発動でたこやきが準備枠→発動領域→捨て札へ移ること、次の開始時の判定、1枚引き・+5）は変えていません。連鎖・応答の処理、共通の対象選択処理、ほかのカードの対象も変えていません。
- 準備枠がたこやきだけの時は対象がないため発動の選択肢が出ず、見送りだけになります（対象を取る誘発の既存の扱いのまま）。
- 同じ書き方の **G-frogger-road かえるのみち**（81 接続「自身は発動領域へ移るので対象にできない」）も、自分自身が候補に入ります（`evidence/frogger-observation.json`）。指示どおり今回は修正していません。直す場合は、同じ `ownPreparedOther` と版の分離で済みます。

## 3. 保存の互換

- 旧保存の操作列には「たこやき自身を対象に発動」が入り得るので、新しい版 `hotseat-5` を設けました。旧保存（hotseat-2〜4）は保存の版のまま、旧挙動で再生します。保存を新しい版へ変換しません。hotseat-1 の旧エンジンはたこやきを含みません。
- 修正前のエンジンで作った実際の対戦の保存2件（自分自身を対象にした操作を含む1件、ほかの札を対象にした1件）を `tests/takoyaki-hotseat4-saves.json` に固定し、最終状態のhashまで一致することを確認しています。自分自身を対象にした保存を hotseat-5 として読ませると拒否されます。
- main との比較（`evidence/compat-summary.json`）：旧保存9件と、たこやき入りデッキのCPU同士の小規模対戦18戦（hotseat-2〜4×初級・中級×seed3）で、操作列と状態が全件一致しました。違いは、発動記録・予約に写るルール定義の写しに、版の切り替え用の項目 `onlyVersions` が加わったことだけです（処理には使われない）。旧版の対戦では、CPUが45回たこやき自身を対象にしており、旧挙動のまま再生されます。

## 4. ファイル

| ファイル | 内容 |
|---|---|
| `tests/takoyaki-self-target.test.mjs`（新規） | RED/GREEN の直接テスト14件 |
| `tests/takoyaki-hotseat4-saves.json`（新規） | 修正前エンジンで作った hotseat-4 の保存2件（`tools/make-hotseat4-saves.mjs`） |
| `tests/doodle-jump.test.mjs`・`tests/lover-text-fix.test.mjs` | 「新規対戦の版＝hotseat-4」の確認を最新の版（hotseat-5）へ更新（説明のコメント各1行を追加。旧版の確認は従来どおり） |
| `tools/pages/allowlist.json` | 変更した実行ソース3件のレビュー済みhashだけ |
| `evidence/red.log` | 修正前の main で 14件中5件が想定どおりの理由で失敗 |
| `evidence/card-game-node-tests.log`・`card-game-dom-tests.log` | 修正後の回帰 |
| `evidence/compat-*.json` | main との保存互換の比較（`tools/compat-replay.mjs`・`tools/compat-compare.py`） |
| `evidence/frogger-observation.json` | 参考の観察（修正なし） |
| `evidence/ui-prefix-hotseat5.json`・`ui/` | 実画面の確認（`tools/find-trigger-prefix.mjs`・`tools/ui-qa.cjs`） |
