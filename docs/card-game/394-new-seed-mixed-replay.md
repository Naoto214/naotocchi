# 394 新seed混合4経路の選択・終了・次手番

[394計画](plans/2026-09-29-new-seed-mixed-replay-394.md)。[393保存state](data/proxy-new-seed-mixed-replay-393-20260929.json)のraw SHA256 `cab4d0ee1b6f43dfac3e8ce0958ab72fb14a61e69f1571ca6200de506614ad51`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-394-20260929.json)のraw SHA256 `4029a3c8549ffc7e1e3abedf926d1f40e92ee9d7ebc5eac00ea27f2695c0be72`。[保存state](data/proxy-new-seed-mixed-replay-394-20260929.json)のraw SHA256 `59960ace78b6edb2c3bf5c01d4c2e5c9d5ed0e766fac052066cc54c6d07222aa`。

| 経路 | 候補・適用 | 次局面 |
| --- | --- | --- |
| 01-A | W-countryside配置、I-poop1設置、passの3候補。107・114の確定時収支でpass、seq118 | turn_end_response |
| 01-B | 起動済みC-chickenを再候補から除外し、唯一`response-pass`、seq122 | B優先のturn_start連鎖応答 |
| 02-B | 375の六段階終了証拠を393まで延長し、終了seq123とBの2枚ドローseq124 | Bのegg_exchange_choice |
| 02-A | Bの配置後応答は唯一`response-pass`、seq111 | Aのnormal_action |

01-Aの通常行動監査では381の既存候補投影を現在stateに適用し、保存pathは01-Aのまま保持した。W-countrysideの時2・ターン終了時条件は325の既存分類を使用。01-Bの`window_kind=turn_start`と起動域を維持。02-Bの盤上C-cat_friend/C-box/P-cliff_goatは開始時誘発ではないことを本文と既存分類で確認。新decision3、event/snapshot各5、completed0、独立balance標本0。専用テストRED→GREEN、監査・再生の正準JSON一致、各event/snapshotの前後game/continuation hash連鎖を確認。過去state/hash・カード本文は非変更。全proxy回帰・CI成功は未確認。次の4経路を引き続き横断監査する。
