# 360 新seed混合4経路の選択適用

[360計画](plans/2026-09-29-new-seed-mixed-replay-360.md)。[359選択](359-new-seed-mixed-choice.md)を[357保存state](data/proxy-new-seed-mixed-replay-357-20260929.json)の4経路に適用し、[保存state](data/proxy-new-seed-mixed-replay-360-20260929.json)へevent/snapshot各5件と前後game/continuation hashを記録した。保存stateのraw SHA256は`6132712c2fe86fd6776cb926ac77d06ce711eb4c27a4eb51b38ad96ca1b3fdbc`。

| 経路 | 適用結果・次の監査入口 |
| --- | --- |
| 01-A | 配置後response-passを適用し、次優先者の`post_placement_response`。 |
| 01-B | 必須終了と次手番ドローを適用し、`egg_exchange_choice`。 |
| 02-A/B | A-027／A-009を山下へ戻し、各`response_window`。 |

新decision3、event/snapshot各5、completed0、独立balance標本0。次は配置後response、たまご交換、開始時responseを監査する。全proxy回帰とCI成功は未確認。
