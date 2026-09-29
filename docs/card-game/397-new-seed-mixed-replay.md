# 397 新seedたまご交換・通常行動・終了

[397計画](plans/2026-09-29-new-seed-mixed-replay-397.md)。[396保存state](data/proxy-new-seed-mixed-replay-396-20260929.json)のraw SHA256 `cc42ca786df73a506a2bb9d29e126fdd90a230c77990762d586fd2d25ee97268`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-397-20260929.json)のraw SHA256 `9a1c50fc188344760e021ea3cfc6d15f3b18e6c9253544d52f328a46f2221e7b`。[保存state](data/proxy-new-seed-mixed-replay-397-20260929.json)のraw SHA256 `e42a8c66f1c4359297e2db98fef98ebb6c02bf0de41dd8b2af3037cc5c41622c`。

| 経路 | 候補・適用 | 次局面 |
| --- | --- | --- |
| 01-A | Bのたまご交換9候補を完全列挙し116 seeded fallbackで山札下へ、seq122 | Bのturn_start応答 |
| 01-B | AのW-countryside配置、I-poop1設置、passを107・114の確定時収支で比較しpass、seq125 | turn_end_response |
| 02-B | Aの次優先者turn_start応答は唯一`response-pass`、seq127 | Bのnormal_action |
| 02-A | 387六段階終了証拠を396まで延長。終了seq114、Bの次手番2枚ドローseq115 | Bのegg_exchange_choice |

02-BのC-boxは能力なし、C-chickenは相手ターン開始時に遡及起動しない。P-cliff_goatは異名セカイ変更条件が不成立。02-AのB盤上C-cat_friend/C-box/P-cliff_goatは開始時誘発として扱わない。新decision3、event/snapshot各5、completed0、独立balance標本0。専用テストRED→GREEN、監査・再生の正準JSON一致、各event/snapshotの前後game/continuation hash連鎖を確認。過去state/hash・カード本文は非変更。全proxy回帰・CI成功は未確認。次の4経路を横断監査する。
