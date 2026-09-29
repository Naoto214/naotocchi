# 390 新seed混合4経路の連鎖応答・終了・再生

[390計画](plans/2026-09-29-new-seed-mixed-replay-390.md)。[389保存state](data/proxy-new-seed-mixed-replay-389-20260929.json)のraw SHA256 `79d87fc508c036d2488f79e4c59ff9facb1e236d851536f4ef19cb69871efdc2`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-390-20260929.json)のraw SHA256 `a84b7fe06ca7be4baf1b17b3e63f913f44edf6c5a158f8957f2255632e7a58b2`。[保存state](data/proxy-new-seed-mixed-replay-390-20260929.json)のraw SHA256 `93d19d3c2e5591ce0a2e1e63603a201c58e0c0944fd9c043a5d6dd8330692473`。

| 経路 | 監査・適用 | 次局面 |
| --- | --- | --- |
| 01-A | 起動済みC-chicken A-015#1を再候補から除外。連鎖中の唯一response-pass、seq115 | B優先のturn_start連鎖応答 |
| 01-B | 383の六段階終了証明から履歴を延長し、Aの終了seq118・Bのドローseq119 | Bのegg_exchange_choice |
| 02-B | 配置後の唯一response-pass、seq120 | Aのnormal_action |
| 02-A | 次優先者Bの唯一response-pass、seq108 | Aのnormal_action |

01-Aの`window_kind=turn_start`を維持し、119のafter_normal_action遷移を起動域に流用していない。01-Bは連続event/snapshot・前後game/continuation hashと六段階終了集合を照合した。新decision3、event/snapshot各5、completed0、独立balance標本0。専用テストRED→GREEN、監査・再生の正準JSON一致、各hash連鎖を確認。過去state/hash・カード本文は非変更。全proxy回帰・CI成功は未確認。次は01-A連鎖応答、01-Bたまご交換、02-A/B通常行動を横断監査する。
