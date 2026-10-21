# 314 新seed混合4経路の再生

[314計画](plans/2026-09-27-new-seed-mixed-replay-314.md)。313選択・312監査・311保存stateのraw/canonicalと境界hashを照合し、[再生JSON](data/proxy-new-seed-mixed-replay-314-20260927.json)に4経路計5件のevent/snapshotと前後game/continuation hashを保存した。

| 経路 | 適用event | 次局面 |
| --- | --- | --- |
| 01-A | Aのnormal pass | ターン終了response入口 |
| 01-B | Bの証明済みターン終了とAの次手番ドロー | A必須たまご交換入口 |
| 02-A | Bのnormal pass | ターン終了response入口 |
| 02-B | A-037（E-boss）のたまご交換 | 開始時response入口 |

新event/snapshot各5、completed0、独立balance標本0。次は2件のターン終了response、たまご交換、開始時response候補を監査する。全proxy回帰・CI成功は未確認。
