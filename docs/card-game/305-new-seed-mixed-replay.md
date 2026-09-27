# 305 新seed混合4経路の再生

[305計画](plans/2026-09-27-new-seed-mixed-replay-305.md)。304選択、303監査、302保存stateのraw/canonicalと境界hashを照合し、[再生JSON](data/proxy-new-seed-mixed-replay-305-20260927.json)に4経路それぞれのevent・snapshot・前後game/continuation hashを保存した。

| 経路 | 適用したevent | 次局面 |
| --- | --- | --- |
| 01-A | C-chicken連鎖中のAのresponse-pass | 連鎖building、B優先response。能力は未解決 |
| 01-B | Aのresponse-pass | Bの通常行動入口 |
| 02-A | Bの時0C-cat_friendなかま配置 | 配置後response入口 |
| 02-B | Bのnormal pass | ターン終了response入口 |

新event/snapshot各4、選択記録4、completed0、独立balance標本0。次は4局面の候補を横断監査する。全proxy回帰・CI成功は未確認。
