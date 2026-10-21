# 395 新seed混合4経路の候補・選択・再生

[395計画](plans/2026-09-29-new-seed-mixed-replay-395.md)。[394保存state](data/proxy-new-seed-mixed-replay-394-20260929.json)のraw SHA256 `59960ace78b6edb2c3bf5c01d4c2e5c9d5ed0e766fac052066cc54c6d07222aa`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-395-20260929.json)のraw SHA256 `74d6b15e5e439810ab3d7cff3a785b5bedacf03ee7eaff0a025e10cf7516e9bb`。[保存state](data/proxy-new-seed-mixed-replay-395-20260929.json)のraw SHA256 `f5fabf42c091da4c7e1aceef42d9244783cc580f6798857fec6ef1e2d246cfd6`。

| 経路 | 候補・選択と適用 | 次局面 |
| --- | --- | --- |
| 01-A | Bの終了前唯一`response-pass`、seq119 | turn_end |
| 01-B | Bのturn_start連鎖中唯一`response-pass`、seq123 | C-chicken連鎖解決 |
| 02-B | Bのたまご交換11候補を完全列挙し、116 seeded fallbackで山札下へ、seq125 | Bのturn_start応答 |
| 02-A | AのI-bowtie装着、W-city配置、M-beetle-01誕生、passの4候補。107・114の確定時収支でpass、seq112 | turn_end_response |

01-Bの起動域1件と`window_kind=turn_start`を維持し、119のafter_normal_action遷移を直接使用していない。02-Aの盤上P-anglerfish枠は保持し、既存156の応答能力分類を使用。新decision4、event/snapshot各4、completed0、独立balance標本0。専用テストRED→GREEN、監査・再生の正準JSON一致、各event/snapshotの前後game/continuation hash連鎖を確認。過去state/hash・カード本文は非変更。全proxy回帰・CI成功は未確認。次の終了、連鎖解決、開始時応答、終了前応答を横断監査する。
