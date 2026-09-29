# 363 新seed混合4経路の選択適用

[363計画](plans/2026-09-29-new-seed-mixed-replay-363.md)。[362選択](362-new-seed-mixed-choice.md)を[360保存state](data/proxy-new-seed-mixed-replay-360-20260929.json)の4経路に適用し、[保存state](data/proxy-new-seed-mixed-replay-363-20260929.json)へevent/snapshot各4件と前後game/continuation hashを記録した。保存stateのraw SHA256は`0930f90356ddef5007d7392aee104753807d1f9c27a94eb875d514a879334b18`。

| 経路 | 適用結果・次の監査入口 |
| --- | --- |
| 01-A | 2回目の配置後response-passから`normal_action`。 |
| 01-B | A-030を山下へ戻し、開始時`response_window`。 |
| 02-A/B | 開始時response-pass後、次優先者の`response_window`。 |

新decision4、event/snapshot各4、completed0、独立balance標本0。次は01-Aの通常行動と他3経路のresponse候補を監査する。全proxy回帰とCI成功は未確認。
