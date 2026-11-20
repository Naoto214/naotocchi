# たこやきやさん（ほか2枚）：発動したしかけ自身を対象に選べる不一致（RED再現・修正案、2026-10-29）

PR #468（重複のためクローズ）で見つけた、正式裁定と実装の不一致を引き継ぐ記録です。基準は main `e3e99b7e`（PR #466 マージ後）。
**ゲーム本体は変更していません。** 修正案はパッチとして置いてあるだけで、当てていません。main へのマージや本番 Pages の更新もしていません。

## 1. 不一致

| | 内容 |
|---|---|
| カード | G-takoyaki-grill たこやきやさん（時1・しかける）「自分のターン終了時に発動できる。自分の準備枠のカード1枚を対象とする。次の自分ターン開始時、対象が自分の準備枠に残っているなら、1枚引き、自分のそだち+5。」 |
| 正式裁定 | [87](../../../docs/card-game/87-play-batch-5-card-text-draft.md) G-takoyaki-grill の接続「このしかけ自身は発動領域へ出ているため対象にできない」。[88](../../../docs/card-game/88-play-batch-5-text-audit.md) X06「たこやきは発動領域へ出てから対象を確認するため自身を対象にできない」 |
| 実装（main） | `remaining-rules.mjs` のたこやきは `target:'ownPrepared'` で、`effects.mjs` の `ownPrepared` は準備枠のすべての札を返す。発動中のたこやき自身も候補に入る |
| 起きること | 準備枠がたこやきだけでも発動でき、対象は自分自身になる。ほかの札があっても、自分自身を対象にする候補が並ぶ |
| 影響 | 自身を対象にすると、次の開始時の1枚・+5は得られない（対象が準備枠に残らないため）。ただし予約を作ること自体は「効果の適用」に当たるので（67 サクラ⑥の裁定）、サクラ⑥など「効果が適用された時」を参照するカードの条件を、準備枠にほかの札がなくても満たせてしまう |

**同じ原因の関連カード2枚（今回見つけたもの）**：準備枠の札を対象にする「しかける」カードは3枚で（`rules.mjs` の全カードを確認）、3枚とも同じ不一致です。

| カード | 正式裁定 | 実装 |
|---|---|---|
| G-frogger-road かえるのおうちがえり | [82](../../../docs/card-game/82-play-batch-2-text-audit.md) P20「自身は発動領域へ出るので対象にならない」 | たこやきと同じ `target:'ownPrepared'` で、自分自身を選べる |
| G-bomber-maze ボンバー | [84](../../../docs/card-game/84-play-batch-3-text-audit.md) P12「自身は発動領域なので、自分側は別の準備が必要」 | 自分側の選択 `select … zone:'ownPrepared'` が自分自身を含む。自分側に別の準備がなくても発動でき、ボンバー自身を「自分側の対象」に選べる |

## 2. 再現（RED）

| ファイル | 内容 |
|---|---|
| [red/self-target.red.test.mjs](red/self-target.red.test.mjs) | 正式裁定どおりなら成功するテスト6件（たこやき・かえる・ボンバー各2件）。`tests/` の外に置いているので、通常の回帰（`tests/*.test.mjs`）や CI には含まれない |
| [red.log](red.log) | main `e3e99b7e` で実行すると**6件すべて失敗**（どれも「自身を対象にする候補がある」「自身しかないのに発動できる」という想定どおりの理由） |
| [evidence/takoyaki-self-target.mjs](evidence/takoyaki-self-target.mjs)・[.json](evidence/takoyaki-self-target.json) | PR #468 で作った証拠の原本（commit `a1c206e4`）。main `e3e99b7e` でも同じ出力が再現する |

実行：`node --test prototypes/card-game/takoyaki-self-target-20261029/red/self-target.red.test.mjs`

## 3. 修正案（当てていません）

[fix-proposal.patch](fix-proposal.patch)（4ファイル、+8／−6行。main `e3e99b7e` に `git apply --check` で当てられることを確認済み）

- `effects.mjs`：対象の種類 `ownPreparedOther` を追加（準備枠の札から、発動元そのものを除く）。
- `remaining-rules.mjs`：たこやきやさん・かえるのおうちがえりの対象を `ownPreparedOther` に変える。ボンバーの自分側の選択に `filter:{excludeSource:true}` を付ける。
- `selection.mjs`：選択の絞り込みに `excludeSource`（発動元を候補から除く）を追加。
- `auto-capabilities.mjs`：自動進行の事前確認が認める絞り込みの一覧に `excludeSource` を追加。これがないと、ボンバーの選択が「確認されていない選択」として止まり、既存テスト48件が失敗する（作業用のコピーで確認）。

作業用のコピーで確かめた結果（本体には反映していません）：

| 確認 | 結果 |
|---|---|
| REDテスト | 6/6 成功（[green-with-proposal.log](green-with-proposal.log)） |
| 既存のカードゲーム回帰 | 494/494 成功（[green-full-with-proposal.log](green-full-with-proposal.log)） |
| Python代表例 | 保存済みの期待値と一致 |

### 正式に直す場合に必要なこと（判断事項）

- **保存の互換（必須）**：この修正では、合法な操作の候補が変わります（自分自身の対象がなくなり、準備枠に別の札がない時は発動の機会そのものがなくなる）。保存は操作列を再生するので、自分自身を選んだ旧保存や、その場面で「見送る」を選んだ旧保存は、再生が止まります。正式に直すなら、ぴょんぴょんジャンプ（PR #452）と同じ方式が必要です。新しい版（例：`hotseat-5`）を作り、旧版（`hotseat-2`〜`hotseat-4`）の保存では今の候補のまま再生します。パッチにはこの版の処理を**まだ入れていません**。
- REDテストを `tests/` へ移して回帰に加え、旧版の保存が今のまま再生されることを確かめるテストを足す。
- CPU：対象の候補が減るだけなので、評価式の変更は不要の見込み（未確認）。
- `tools/pages/allowlist.json`：変更した実行ソース4件のsha256の更新。

## 4. PR #468 から引き継いだもの

- [pr468-archive/README.md](pr468-archive/README.md)：PR #468 の報告書の原本（commit `a1c206e4`）。
- PR #468 のブランチ `claude/lunar-submarine-tier1-test-s92fby`（commit `a1c206e4`）は削除しません。#468 だけが持つ資料（本文変更前の main で作った hotseat-2〜4 の旧保存6件、Python 検証607件の main 比較、Chromium 4幅＋横向きの画面確認）は、そこから参照できます。
- 本文2枚の改訂と Tier 1 のテストは、PR #466 として main に入っています（`docs/card-game/478-lunar-submarine-text-clarification.md`、`prototypes/card-game/tests/tier1-direct.test.mjs`）。
