# 357 新seed混合4経路の選択適用

[357計画](plans/2026-09-29-new-seed-mixed-replay-357.md)。[356選択](356-new-seed-mixed-choice.md)から[354保存state](data/proxy-new-seed-mixed-replay-354-20260929.json)の4経路を再生し、[保存state](data/proxy-new-seed-mixed-replay-357-20260929.json)へevent/snapshot各6件と前後game/continuation hashを記録した。保存stateのraw SHA256は`366224785a8f0e65f227797ea1ad020447ddb2577bd663c846da30f60d8cf404`。

| 経路 | 適用結果・次の監査入口 |
| --- | --- |
| 01-A | C-boxを時0で配置し、`post_placement_response`。 |
| 01-B | 終了前response-passを適用し、`turn_end`。 |
| 02-A/B | 必須終了と次手番ドローを適用し、各`egg_exchange_choice`。 |

新decision2、event/snapshot各6、completed0、独立balance標本0。次は配置後response、終了集合、必須たまご交換の4経路を横断監査する。全proxy回帰とCI成功は未確認。
