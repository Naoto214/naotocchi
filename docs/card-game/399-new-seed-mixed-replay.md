# 399 新seed応答3件・終了・次手番

[399計画](plans/2026-09-29-new-seed-mixed-replay-399.md)。[398保存state](data/proxy-new-seed-mixed-replay-398-20260929.json)のraw SHA256 `f050b8e2f416d6720a066e25229b8314dae02ca44c459691964ea6ded0743754`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-399-20260929.json)のraw SHA256 `6e0f6873cd96764092699cceeec62fb7ccae53950d5ee7a9e7df1cc4c5b2dc25`。[保存state](data/proxy-new-seed-mixed-replay-399-20260929.json)のraw SHA256 `c1398339b1e67c04006693bfbd4e99b34e59b32e6689950673765814d09bd4e2`。

| 経路 | 候補・適用 | 次局面 |
| --- | --- | --- |
| 01-A | Aのturn_start応答は唯一`response-pass`、seq124 | Bのnormal_action |
| 01-B | 390の六段階終了証拠を398まで延長。終了seq127、Bの次手番2枚ドローseq128 | Bのegg_exchange_choice |
| 02-B | BのC-chameleon配置後応答は唯一`response-pass`、seq129 | A優先のpost_placement_response |
| 02-A | Bの開始時応答は唯一`response-pass`、seq117 | A優先のturn_start応答 |

02-BのC-chameleon B-014#1は本文と既存の継続能力分類から、起動できる応答候補に含めず、盤上の継続効果を保持した。01-AのC-chicken A-015#1はBのターン開始時に起動しない。新decision3、event/snapshot各5、completed0、独立balance標本0。専用テストRED→GREEN、監査・再生の正準JSON一致、各event/snapshotの前後game/continuation hash連鎖を確認。過去state/hash・カード本文は非変更。全proxy回帰は実行中で結果未取得、CI成功は未確認。次の4経路を横断監査する。
