# 287 新seed混合局面再生

[287計画](plans/2026-09-27-new-seed-mixed-replay-287.md)。286選択、285監査、284保存stateのraw/canonicalと境界hashを照合し、[再生JSON](data/proxy-new-seed-mixed-replay-287-20260927.json)に4経路4件のevent、snapshot、前後hashを保存した。

01-A/01-Bでは2回目のresponse-passで応答窓を閉じ、通常行動へ移った。02-A/02-Bでは選択済みの通常passを適用し、ターン終了前のresponse入口へ移った。各経路の次の合法候補集合は未監査。

新event/snapshot各4、completed0、独立balance標本0。次は4経路の現在候補を監査する。全proxy回帰・CI成功は未確認。
