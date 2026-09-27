# 311 新seed連鎖解決・ターン終了再生

[311計画](plans/2026-09-27-new-seed-mixed-replay-311.md)。310選択・309監査・308保存stateのraw/canonicalと境界hashを照合し、[再生JSON](data/proxy-new-seed-mixed-replay-311-20260927.json)に4経路計5件のevent/snapshotと前後game/continuation hashを保存した。

| 経路 | 適用event | 次局面 |
| --- | --- | --- |
| 01-A | C-chicken盤上能力解決。A-007#1はメインなので山札上に保持、ドローなし | A通常行動入口 |
| 01-B | Aのターン終了response-pass | 証明待ちターン終了入口 |
| 02-A | Aの配置後response-pass | B通常行動入口 |
| 02-B | Bの証明済みターン終了とAの次手番ドロー | A必須たまご交換入口 |

新event/snapshot各5、completed0、独立balance標本0。次は4経路の通常行動・ターン終了・たまご交換候補を横断監査する。全proxy回帰・CI成功は未確認。
