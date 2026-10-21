# 361 新seed混合4経路の候補監査

[361計画](plans/2026-09-29-new-seed-mixed-audit-361.md)。[360保存state](data/proxy-new-seed-mixed-replay-360-20260929.json)のraw SHA256 `6132712c2fe86fd6776cb926ac77d06ce711eb4c27a4eb51b38ad96ca1b3fdbc`、正準JSONと経路別hashを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-361-20260929.json)に候補・除外根拠を記録した。

| 経路 | 監査結果 |
| --- | --- |
| 01-A | 次優先者の配置後responseは唯一の`response-pass`。 |
| 01-B | 必須たまご交換10候補を列挙。 |
| 02-A/B | 各開始時responseは唯一の`response-pass`。02-AのE-bossは現手番の勝負敗北条件が不成立。 |

新event0、completed0、独立balance標本0。次は3件の唯一passと01-Bの既存seeded fallbackを選択する。全proxy回帰とCI成功は未確認。
