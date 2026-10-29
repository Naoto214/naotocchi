# かえるのおうちがえり（G-frogger-road）の対象選択の修正（2026-10-29、Draft・本人の別承認までマージしない）

正式裁定どおり、**発動中のかえる自身を対象にできない**ようにしました。ほかの準備枠の札は従来どおり選べます。基準は main `7a59eff0`（PR #473 たこやきやさんの修正のマージ後）。**mainマージ・本番Pages更新はしていません。**

- 発見：PR #473 の調査（`prototypes/card-game/takoyaki-self-target-fix-20261029/evidence/frogger-observation.json`）。
- 修正の方法は #473（たこやきやさん）と同じです。総合報告：[REPORT.md](REPORT.md)
- 注：カード名は「かえるのおうちがえり」です（以前の報告で「かえるのみち」と誤って書いていました）。

## 1. 正式本文・裁定・実装

| 項目 | 内容 |
|---|---|
| 正式本文（変更なし） | 自分が通常のセカイ変更を行った時に発動できる。自分の準備枠のカード1枚を対象とする。このターン、そのカードは相手のカード効果では手札にも捨て札にも移らない。（時1・しかける） |
| 裁定 81（G-frogger-road の接続） | 初配置・効果による配置では条件を満たさない。**自身は発動領域へ移るので対象にできない。**装備先離脱に伴う基本ルールの捨て札行きは防がない。 |
| 後の文書による変更 | なし |
| 修正前の実装 | `remaining-rules.mjs` の誘発が汎用の `target:'ownPrepared'` を使い、かえる自身も候補に入っていた |

## 2. 修正（実行ソース2ファイル）

| ファイル | 変更 |
|---|---|
| `remaining-rules.mjs` | かえるの誘発を版で分ける（#473 と同じ形）。index 0：`ownPrepared`（hotseat-2〜5、旧挙動）／index 1：`ownPreparedOther`（hotseat-6）。条件・効果は同じ。**あわせて、たこやきやさんの新しい誘発を hotseat-6 でも有効にする**（下記） |
| `engine.mjs` | 新規対戦の版を `hotseat-6` に。`RULE_VERSIONS` に hotseat-5 を残す |

- `ownPreparedOther`（#473 で追加済み）をそのまま使い、`effects.mjs` は変更していません。
- **見つけた問題（修正済み）**：#473 で、たこやきの新しい誘発を `onlyVersions:['hotseat-5']` と限定していたため、版を hotseat-6 に上げると、たこやきの誘発が消えることが既存テスト（#473 のテスト）で分かりました。今の本番（hotseat-5）には影響しません。このPRで、たこやきの新しい誘発を `['hotseat-5','hotseat-6']` にし、「すべての版で、たこやき・かえるの誘発がちょうど1つずつ有効」を確かめるテストを追加しました（わざと元に戻すと失敗することを確認）。
- 版の確認をしていた既存テスト（ぴょんぴょんジャンプ・こいびと・たこやき）は、版番号を固定せず「最新の版」「hotseat-5 以降のすべての版」で確かめる形にしました（旧版の確認内容は同じ）。

## 3. 保存の互換

- 新しい版 `hotseat-6`。旧保存（hotseat-2〜5）は保存の版のまま旧挙動で再生し、新しい版へ変換しません。hotseat-1 の旧エンジンはかえるを含みません。
- 修正前エンジン（main `7a59eff0`、hotseat-5）で作った実際の対戦の保存2件（自分自身を対象にした操作を含む1件、ほかの札を対象にした1件）を `tests/frogger-hotseat5-saves.json` に固定し、最終状態のhashまで一致することを確認しています。自分自身を対象にした保存を hotseat-6 として読ませると拒否されます。
- main との比較（`evidence/compat-summary.json`）：旧保存11件と、かえる・たこやき入りデッキのCPU同士の小規模対戦24戦（hotseat-2〜5×初級・中級×seed3）で、操作列と状態が全件一致（版の切り替え用の項目 `onlyVersions` を除く）。旧版の対戦では自分自身を対象にした発動が計30回あり、旧挙動のまま再生されます。

## 4. ファイル

| ファイル | 内容 |
|---|---|
| `tests/frogger-self-target.test.mjs`（新規） | RED/GREEN の直接テスト14件（うち「すべての版で誘発が1つずつ」のガード1件は修正後に追加） |
| `tests/frogger-hotseat5-saves.json`（新規） | 修正前エンジンで作った hotseat-5 の保存2件（`tools/make-hotseat5-saves.mjs`） |
| `tests/takoyaki-self-target.test.mjs`・`doodle-jump.test.mjs`・`lover-text-fix.test.mjs` | 版番号の固定をやめ、最新の版・以降のすべての版で確かめる形に |
| `tools/pages/allowlist.json` | 変更した実行ソース2件のレビュー済みhashだけ |
| `evidence/red.log` | 修正前の main で 13件中5件が想定どおりの理由で失敗（ガードテストは修正後に追加） |
| `evidence/card-game-node-tests.log` | 修正後の回帰 |
| `evidence/compat-*.json` | main との保存互換の比較（`tools/compat-replay.mjs`・`tools/compat-compare.py`） |
| `evidence/ui-prefix-hotseat6.json`・`ui/` | 実画面の確認（`tools/find-trigger-prefix.mjs`・`tools/ui-qa.cjs`） |

## 5. 参考（このPRでは変更なし）

- 実画面で、かえるの誘発の選択肢では、持ち主にも自分の伏せ札が「しかけたカード」と表示されます（例：「しかけたカードの能力を発動 → おべんとうばこ」）。カード詳細には「かえるのおうちがえり」と出ます。修正前の旧保存でも同じ表示で、今回の修正とは関係のない既存の表示です。
