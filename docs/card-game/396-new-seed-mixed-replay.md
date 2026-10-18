# 396 新seed終了・連鎖解決・開始時応答

[396計画](plans/2026-09-29-new-seed-mixed-replay-396.md)。[395保存state](data/proxy-new-seed-mixed-replay-395-20260929.json)のraw SHA256 `f5fabf42c091da4c7e1aceef42d9244783cc580f6798857fec6ef1e2d246cfd6`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-396-20260929.json)のraw SHA256 `accddb0a21eb09891b4d08bfe7643839f816b4817fb22318f90d922e07e23c94`。[保存state](data/proxy-new-seed-mixed-replay-396-20260929.json)のraw SHA256 `cc42ca786df73a506a2bb9d29e126fdd90a230c77990762d586fd2d25ee97268`。

| 経路 | 監査・適用 | 次局面 |
| --- | --- | --- |
| 01-A | 387の六段階終了証拠を395までの履歴へ延長。終了seq120、Bの次手番ドローseq121 | Bのegg_exchange_choice |
| 01-B | turn_start起動域C-chicken A-015#1を既存196で効果解決、seq124 | Aのnormal_action |
| 02-B | Bの開始時合法応答は唯一`response-pass`、seq126 | A優先のturn_start応答 |
| 02-A | Bの終了前合法応答は唯一`response-pass`、seq113 | turn_end |

01-AのB盤上C-bat/C-chickenの誘発時機、C-cat_friendの起動能力、P-cat_ceoの交際開始誘発を本文と既存分類で分離した。01-Bは起動域にある源を解決し、山札公開・移動を既存196の契約で検査。`window_kind=turn_start`を維持し、after_normal_action用119遷移を直接使用していない。新decision2、event/snapshot各5、completed0、独立balance標本0。専用テストRED→GREEN、監査・再生の正準JSON一致、各event/snapshotの前後game/continuation hash連鎖を確認。過去state/hash・カード本文は非変更。全proxy回帰・CI成功は未確認。次の4経路を横断監査する。
