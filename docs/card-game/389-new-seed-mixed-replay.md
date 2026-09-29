# 389 新seed混合4経路response監査・再生

[389計画](plans/2026-09-29-new-seed-mixed-replay-389.md)。[388保存state](data/proxy-new-seed-mixed-replay-388-20260929.json)のraw SHA256 `3c3d5c70ff1b38c740a6278866e15f7d2fd8ec6b2bc0eec2fa53160901018974`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-389-20260929.json)のraw SHA256 `3bf47665c9d69d34ed2284eaef3f76266616cc964221e43a275bfe5d1d32e18c`。[保存state](data/proxy-new-seed-mixed-replay-389-20260929.json)のraw SHA256 `79d87fc508c036d2488f79e4c59ff9facb1e236d851536f4ef19cb69871efdc2`。

| 経路 | 完全合法候補・選択 | 次局面 |
| --- | --- | --- |
| 01-A | A盤上C-chicken A-015#1の開始時能力とresponse-pass。既存応答seedで能力起動、seq114 | turn_startの連鎖構築 |
| 01-B | 唯一response-pass、seq117 | Bのturn_end入口 |
| 02-B | 唯一response-pass、seq119。配置後C-chickenを開始時へ遡及させない | Aの通常行動へ復帰する配置後窓 |
| 02-A | 唯一response-pass、seq107 | B優先のturn_start response |

01-Aでは`response-activate-ability-A-015#1`を使用し、`window_kind=turn_start`を保持。新decision3、event/snapshot各4、completed0、独立balance標本0。専用テストRED→GREEN、監査・再生の正準JSON一致、各前後game/continuation hashを確認。全proxy回帰・CI成功は未確認。次は01-Aの連鎖応答、01-Bの六段階終了、02-A/Bの応答を監査する。過去state/hash・カード本文は非変更。
