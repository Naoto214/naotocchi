# 391 新seed混合4経路の候補監査・再生

[391計画](plans/2026-09-29-new-seed-mixed-replay-391.md)。[390保存state](data/proxy-new-seed-mixed-replay-390-20260929.json)のraw SHA256 `93d19d3c2e5591ce0a2e1e63603a201c58e0c0944fd9c043a5d6dd8330692473`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-391-20260929.json)のraw SHA256 `27f889c68176f450a3d75f04f77178ca08d3da6817b374da454847887b201202`。[保存state](data/proxy-new-seed-mixed-replay-391-20260929.json)のraw SHA256 `af88cefada0cc9af04d06140b99fe3fa3bb042ba7b634315d52d591362b3d906`。

| 経路 | 完全候補・選択と適用 | 次局面 |
| --- | --- | --- |
| 01-A | Bのturn_start連鎖応答は`response-pass`のみ。seq116で連鎖を解決待ちへ | turn_start連鎖解決 |
| 01-B | Aのたまご交換10候補から116のseeded fallbackで`A-007`を山札下へ。seq120 | response_window |
| 02-B | W-city配置とpassを列挙し、107・114の時比較で`pass`。seq121 | turn_end_response |
| 02-A | I-bowtie装着、C-chicken配置、W-city配置、M-beetle-01誕生、passの5候補。107・114で有料3件に勝つ無料C-chickenを116の安全配置として選択。seq109 | post_placement_response |

02-AのP-anglerfish A-016#1は盤上のこいびと枠を占有したまま、既存156の応答能力分類で監査した。C-chickenの開始時能力を配置時に遡及起動していない。01-Aの`window_kind=turn_start`と起動域を保持し、after_normal_action用119遷移は使用していない。新decision4、event/snapshot各4、completed0、独立balance標本0。専用テストRED→GREEN、正準JSON一致、各event/snapshotの前後game/continuation hash連鎖を確認。過去state/hashとカード本文は変更なし。全proxy回帰・CI成功は未確認。次の4経路を横断監査し、既存契約で一意に進める。
