# 379 新seed混合4経路response監査・再生

[379計画](plans/2026-09-29-new-seed-mixed-replay-379.md)。[378保存state](data/proxy-new-seed-mixed-replay-378-20260929.json)のraw SHA256 `9d2a82b3a51d538f1a1a904301f6236d5b22715accceb0454ff35638528944ae`を照合し、[監査JSON](data/proxy-new-seed-mixed-audit-379-20260929.json)の4機会で合法候補がそれぞれ`response-pass`のみと確認した。監査JSONのraw SHA256は`5a37fac18d46c5134f9645aa6f55b95aba7ecb39cee8758cbd755a29819e7898`。[保存JSON](data/proxy-new-seed-mixed-replay-379-20260929.json)のraw SHA256は`669b2fb25c6675525b0617daf4e1c2a10c6d4baafb764857e2016c5896e5ecf7`。

| 経路 | 新event | 次局面 |
| --- | --- | --- |
| 01-A | seq105、Aのturn_start response-pass | Bのnormal_action。通常行動主体はB |
| 01-B | seq107、Aの配置後response-pass | 次優先者Bの配置後response |
| 02-A | seq97、Bのturn_start response-pass | 次優先者Aのturn_start response |
| 02-B | seq109、Bのturn_start response-pass | 次優先者Aのturn_start response |

01-AではBのturn_startは過ぎており、AのC-chickenをBの開始時源にしない。01-Bでは配置後のC-chickenを開始時へ遡及しない。新decision/event/snapshot各4、completed0、独立balance標本0。専用テストRED→GREEN、監査・再生の正準JSON一致、各前後game/continuation hashを確認。過去のstate/hashとカード本文は非変更。全proxy回帰とCI成功は未確認。次は4局面を監査する。
