# 400 新seed横断監査・選択・再生

[400計画](plans/2026-09-29-new-seed-mixed-replay-400.md)。[399保存state](data/proxy-new-seed-mixed-replay-399-20260929.json)のraw SHA256 `c1398339b1e67c04006693bfbd4e99b34e59b32e6689950673765814d09bd4e2`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-400-20260929.json)のraw SHA256 `e2f5469be0427e0294e0cfdd3d221ef62c3fed8dea4f4d6c0e2e2aad5d31908e`。[保存state](data/proxy-new-seed-mixed-replay-400-20260929.json)のraw SHA256 `dd83009fca60289dac8c54a3f7e4316bd886eb326f4baf38375e6ccb790d173a`。

| 経路 | 完全候補と選択 | 適用後 |
| --- | --- | --- |
| 01-A | BのW-city、W-deepsea、pass。107・114の確定時残量でpassが両有料候補に勝つ。116不要 | 通常pass、turn_end_response |
| 01-B | Bの手札10件の必須交換。116 seeded fallback | 1枚を山札下へ戻し、Bのturn_start応答 |
| 02-A | Aのturn_start応答は唯一response-pass | Bのnormal_action |
| 02-B | Aのpost_placement_responseは唯一response-pass | Bのpost_placement_response |

02-Bの候補投影では開始時応答の既存列挙を手札・盤上の時点不成立確認に限定し、原状態の`after_normal_action`応答窓を維持して遷移した。新decision4、event/snapshot各4、completed0、独立balance標本0。専用テストRED→GREEN、監査・再生の正準JSON一致、各event/snapshotの前後game/continuation hash連鎖を確認。過去state/hash・カード本文は非変更。全proxy回帰とCI成功は未確認。次の4経路を横断監査する。
