# 387 新seed混合4経路の終了・次優先者応答

[387計画](plans/2026-09-29-new-seed-mixed-replay-387.md)。[386保存state](data/proxy-new-seed-mixed-replay-386-20260929.json)のraw SHA256 `5399e8ab9d9ec16eb750609212d30102a6258cbff6679b6899301b355861c6a9`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-387-20260929.json)のraw SHA256 `aca39f48302087bc427ca6914949e65aaa83b32d113e48f170e7e7ef1f8cc037`。[保存state](data/proxy-new-seed-mixed-replay-387-20260929.json)のraw SHA256 `27509eee70483c9b48b7a063d546312715de2bbaa2325f50a7e3debe5235165d`。

| 経路 | 適用 | 次局面 |
| --- | --- | --- |
| 01-A | Bの終了seq111、Aのドローseq112（A-003#1、A-027#1） | Aのegg_exchange_choice |
| 01-B | Aの唯一response-pass、seq115 | Bのnormal_action |
| 02-A | Bの終了seq104、Aのドローseq105（A-020#1、A-015#1） | Aのegg_exchange_choice |
| 02-B | Bの唯一response-pass、seq117 | Aのnormal_action |

01-Aは371、02-Aは374の六段階終了証明を連続event/snapshot・前後game/continuation hashで現在まで延長。次手番のC-boxは本文「能力なし」を確認して分類した。新decision2、event/snapshot各6、completed0、独立balance標本0。専用テストRED→GREEN、監査・再生の正準JSON一致、全event/snapshotのhash連鎖を確認。全proxy回帰・CI成功は未確認。次はたまご交換2件・通常行動2件の候補を横断監査する。過去state/hash・カード本文は非変更。
