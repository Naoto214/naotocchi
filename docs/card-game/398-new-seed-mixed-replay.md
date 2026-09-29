# 398 新seed開始時応答・無料配置・たまご交換

[398計画](plans/2026-09-29-new-seed-mixed-replay-398.md)。[397保存state](data/proxy-new-seed-mixed-replay-397-20260929.json)のraw SHA256 `e42a8c66f1c4359297e2db98fef98ebb6c02bf0de41dd8b2af3037cc5c41622c`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-398-20260929.json)のraw SHA256 `50655277af153cb4fd20ccf4dd5588d00aec1646288fdd195282d475b189ed62`。[保存state](data/proxy-new-seed-mixed-replay-398-20260929.json)のraw SHA256 `f050b8e2f416d6720a066e25229b8314dae02ca44c459691964ea6ded0743754`。

| 経路 | 候補・選択と適用 | 次局面 |
| --- | --- | --- |
| 01-A | Bの盤上`response-activate-ability-B-015#1`とpassを列挙。107・114・116 seeded fallbackはpass、seq123 | A優先のturn_start応答 |
| 01-B | Bの終了前唯一`response-pass`、seq126 | turn_end |
| 02-B | BのC-chameleon配置、W-countryside配置、M-antlion-01誕生、passの4候補。107・114で有料2件と比較し、116安全配置でC-chameleon B-014#1を配置、seq128 | post_placement_response |
| 02-A | Bのたまご交換10候補を完全列挙し116 seeded fallbackで山札下へ、seq116 | Bのturn_start応答 |

01-AのC-chickenは盤上源と一般stable IDを維持し、未選択なので起動域に入れない。02-BのC-chameleonは両者のセカイがある間の継続能力で、配置時にそだちや時を増やさない。新decision4、event/snapshot各4、completed0、独立balance標本0。専用テストRED→GREEN、監査・再生の正準JSON一致、各event/snapshotの前後game/continuation hash連鎖を確認。過去state/hash・カード本文は非変更。全proxy回帰・CI成功は未確認。次の4経路を横断監査する。
