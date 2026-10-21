# 308 新seed混合4経路の再生

[308計画](plans/2026-09-27-new-seed-mixed-replay-308.md)。307選択・306監査・305保存stateのraw/canonicalと境界hashを照合し、[再生JSON](data/proxy-new-seed-mixed-replay-308-20260927.json)に各経路のevent・snapshot・前後game/continuation hashを保存した。

| 経路 | 適用event | 次局面 |
| --- | --- | --- |
| 01-A | Bの連鎖中response-pass | C-chickenリンクの解決入口。効果未解決 |
| 01-B | Bのnormal pass | ターン終了response入口 |
| 02-A | Bの配置後response-pass | A優先の配置後response入口 |
| 02-B | Aのターン終了response-pass | 証明待ちターン終了入口 |

新event/snapshot各4、選択記録4、completed0、独立balance標本0。次は連鎖解決の現stateと残るresponse・ターン終了を横断監査する。全proxy回帰・CI成功は未確認。
