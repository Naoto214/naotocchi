# 385 新seed混合4経路のcanonical decision pipeline・再生

[385計画](plans/2026-09-29-new-seed-mixed-replay-385.md)。[384保存state](data/proxy-new-seed-mixed-replay-384-20260929.json)のraw SHA256 `ec301d504f1e5d3bba191000a11c4e1e6ff9bedd5a9404e0dac6748d4c7136b2`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-385-20260929.json)のraw SHA256 `3fa75f04d8efc428c4a10e7fe747d90dea16ea59c6ef26f81fe92dea418b990f`。[保存state](data/proxy-new-seed-mixed-replay-385-20260929.json)のraw SHA256 `ebc7c71eda0ee278672d830e17f9cef51e6151885a596776345ffb2c4b92171a`。

01-Aのseq108は383で合法候補4件・stable ID・12検査を完全列挙済み。107/114の優先順で、W-city（時2）、W-deepsea（時2、手札は配置後も6枚かつメイン不在）、M-antlion-01（時1）の各候補とpassを比較した。確定そだち・消費・勝敗の上位項目は同じで、時残量でpassが各候補に一意に勝つ。W-cityの後続山札閲覧は現在の確定そだちを増やさない。116の継続条件（候補完備、stable ID、許可された情報、遷移可能、hash整合）を監査し、**一意選択のためseeded fallbackは発動しない**。比較が未解決の場合は116まで評価する契約を維持する。

| 経路 | 選択と適用 | 次局面 |
| --- | --- | --- |
| 01-A | Bの通常pass、seq109 | Bのturn_end_response |
| 01-B | Bのseededたまご交換 B-001、seq113 | Bのturn_start response |
| 02-A | Bの通常pass、seq102 | Bのturn_end_response |
| 02-B | Aのseededたまご交換 A-032、seq115 | Aのturn_start response |

新decision/event/snapshot各4、completed0、独立balance標本0。専用テストRED→GREEN、監査・再生の正準JSON一致、前後game/continuation hash連鎖を確認。全proxy回帰とCI成功は未確認。次は4経路のresponse候補・盤上源を横断監査する。カード本文・過去のstate/hashは非変更。
