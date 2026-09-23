# 124 保存履歴からのターン終了証明と独立再開

117・120・122の保存済みevent/snapshotをraw SHA・連続seq・state/continuation hashで再検証し、各現在stateへ123の6手順と12条件を独立適用した。4経路とも、期限付き効果・予約・100到達履歴がないことを本文分類と保存履歴から証明でき、ターン終了の完全性が成立した。122の停止証拠や123の保存booleanは変更していない。

各経路は独立して、ターン終了、次プレイヤーのターン開始と2枚ドロー、1枚の卵交換を実行した。新しい通常行動機会を121で再列挙したところ、4経路とも `missing_exclusion_reason` で真正停止した。これは次プレイヤーの盤面が空である場合、121の `board_card_action` familyを空集合として説明する既存reason codeがないためである。新規手札の合法候補や選択を推測していない。次の共通契約では、空盤面source inventoryに正本由来の理由と証拠を与える必要がある。特定経路・card copyに依存しない不足である。

| 経路 | 122末尾seq → 124末尾seq | 結果 | 新decision | 新event | 新snapshot | fallback | 独立balance標本 |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| order-01-a-first | 9 → 12 | 真正停止 | 1 | 3 | 4 | seeded | 0 |
| order-01-b-first | 7 → 10 | 真正停止 | 1 | 3 | 4 | seeded | 0 |
| order-02-a-first | 7 → 10 | 真正停止 | 1 | 3 | 4 | seeded | 0 |
| order-02-b-first | 7 → 10 | 真正停止 | 1 | 3 | 4 | seeded | 0 |

合計 planned 4・completed 0・rules-stop 4・decision 4・event 12・snapshot 16・winner 0・独立balance標本 0。各経路の新stopには122原本のraw SHA、再開後の両state hash、全新event/snapshot/decisionと121監査結果を記録した。停止後のpassや行動を実行していない。

使用契約は107・114・116（卵交換のseeded fallback）・119（response履歴の検証）・121（新stateでの候補再列挙）・123（終了6手順）。出力JSONはUTF-8、indent 2、LF、末尾改行1件。専用builderの再生成bytesと保存bytesを直接比較する。112、117、119、120、121、122、123の保護対象は読み取り専用。全proxyの117旧テスト1件（期待190と実測263の差）は別件の既知問題として扱い、修正していない。
