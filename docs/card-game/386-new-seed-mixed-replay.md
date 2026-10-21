# 386 新seed混合4経路response監査・再生

[386計画](plans/2026-09-29-new-seed-mixed-replay-386.md)。[385保存state](data/proxy-new-seed-mixed-replay-385-20260929.json)のraw SHA256 `ebc7c71eda0ee278672d830e17f9cef51e6151885a596776345ffb2c4b92171a`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-386-20260929.json)のraw SHA256 `b2e00651ae5296b37ce17a13c49db84e92bba4913f87a620e1d78f8e581f728a`。[保存state](data/proxy-new-seed-mixed-replay-386-20260929.json)のraw SHA256 `5399e8ab9d9ec16eb750609212d30102a6258cbff6679b6899301b355861c6a9`。

| 経路 | 監査・選択・新event | 次局面 |
| --- | --- | --- |
| 01-A | 唯一response-pass、seq110 | Aのturn_end入口 |
| 01-B | B-015#1 C-chicken開始時能力とresponse-pass。既存response seeded fallbackでpass、seq114 | A優先のturn_start response |
| 02-A | 唯一response-pass、seq103 | Bのturn_end入口 |
| 02-B | 唯一response-pass、seq116 | B優先のturn_start response |

01-Bではegg_exchange_bottomが開始時窓の起点であり、能力IDは`response-activate-ability-B-015#1`。手札のC-chickenとは混同しない。window_kind=turn_startを維持し、他の盤上源と手札の除外理由を監査した。新decision/event/snapshot各4、completed0、独立balance標本0。専用テストRED→GREEN、正準JSON一致、各前後game/continuation hash連鎖を確認。全proxy回帰・CI成功は未確認。次は終了2経路の六段階証明と残り2経路のresponse候補を監査する。過去state/hash・カード本文は非変更。
