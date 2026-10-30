# ボンバー（G-bomber-maze）の対象選択の修正（2026-10-30、Draft・本人の別承認までマージしない）

正式裁定どおり、**発動中のボンバー自身を自分側の対象にできない**ようにしました。自分側はほかの準備枠の札、相手側は従来どおり相手の準備枠の札を選びます。基準は main `e33ec25a`（PR #480 マージ後）。**mainマージ・本番Pages更新はしていません。**

- 発見：PR #470 の調査。修正の方法は #473（たこやきやさん）・#478（かえるのおうちがえり）と同じ「版で分ける」形です。

## 1. 正式本文・裁定・実装

| 項目 | 内容 |
|---|---|
| 正式本文（変更なし） | 相手のターン開始時に発動できる。自分と相手の準備枠のカードを1枚ずつ対象とする。このターン終了時、それぞれを捨て札に置く。（時2・しかける） |
| 裁定 84 P12 | 自身は発動領域なので、自分側は別の準備が必要。終了時に両方を独立して捨て札へ。 |
| 83 接続 | 自身は既に発動領域へ移るため対象にできない。 |
| 修正前の実装 | `remaining-rules.mjs` の誘発が `select` の `zone:'ownPrepared'`（絞り込みなし）を使い、ボンバー自身も候補に入っていた。準備枠がボンバーだけでも発動でき、自分自身を選べた。CPU（中級）も実際に自分自身を選んでいた（RED の CPU テストで確認） |

## 2. 修正（実行ソース4ファイル）

| ファイル | 変更 |
|---|---|
| `selection.mjs` | 選択の絞り込み `excludeSource`（発動元のカードを除く）を追加。指定したカードだけに効き、既存の選択はすべて従来どおり |
| `auto-capabilities.mjs` | 自動進行の事前確認が知っている絞り込みの一覧に `excludeSource`（真偽値）を追加 |
| `remaining-rules.mjs` | ボンバーの誘発を版で分ける。index 0：絞り込みなし（hotseat-2〜6、旧挙動）／index 1：`filter:{excludeSource:true}`（hotseat-7）。条件・効果は同じ。たこやき・かえるの新しい誘発を hotseat-7 でも有効にする |
| `engine.mjs` | 新規対戦の版を `hotseat-7` に。`RULE_VERSIONS` に hotseat-6 を残す |

- 候補の計算はエンジン1か所なので、画面・自動進行・CPU（初級・中級）はすべて同じ候補を使います。
- 自分の準備枠がボンバーだけの時は、誘発は「見送る」だけになり、ボンバーは準備枠に残ります。相手の準備枠が空の時も従来どおり発動できません。

## 3. 保存の互換

- 新しい版 `hotseat-7`。旧保存（hotseat-2〜6）は保存の版のまま旧挙動で再生し、新しい版へ変換しません。過去の操作記録・戦績は変わりません。
- 修正前エンジン（main `e33ec25a`、hotseat-6）で作った実際の対戦の保存2件（自分自身を対象にした操作を含む1件、ほかの札を対象にした1件）を `tests/bomber-hotseat6-saves.json` に固定し、最終状態のhashまで一致することを確認。自分自身を対象にした保存を hotseat-7 として読ませると拒否されます。
- main との比較（`evidence/compat-summary.json`）：旧保存（全 `*saves.json`）と、ボンバー・かえる・たこやき入りデッキのCPU同士の小規模対戦30戦（hotseat-2〜6×初級・中級×seed3）で、操作列と状態が全件一致（版の切り替え用の項目 `onlyVersions` を除く）。

## 4. ファイル

| ファイル | 内容 |
|---|---|
| `tests/bomber-self-target.test.mjs`（新規） | RED/GREEN の直接テスト14件 |
| `tests/bomber-hotseat6-saves.json`（新規） | 修正前エンジンで作った hotseat-6 の保存2件（`tools/make-hotseat6-saves.mjs`） |
| `tools/pages/allowlist.json` | 変更した実行ソース4件のレビュー済みhashだけ |
| `evidence/red.log` | 修正前の main で 14件中7件が想定どおりの理由で失敗 |
| `evidence/card-game-node-tests.log` | 修正後の回帰 544/544 |
| `evidence/card-game-dom-tests.log` | DOM 6/7（`menu.dom.mjs` は main でも失敗する既存の件。別PR（CI・テスト安定化）で修正） |
| `evidence/compat-*.json` | main との保存互換の比較（`tools/compat-replay.mjs`・`tools/compat-compare.py`） |
