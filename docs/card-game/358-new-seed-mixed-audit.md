# 358 新seed混合4経路の候補・終了集合監査

[358計画](plans/2026-09-29-new-seed-mixed-audit-358.md)。[357保存state](data/proxy-new-seed-mixed-replay-357-20260929.json)のraw SHA256 `366224785a8f0e65f227797ea1ad020447ddb2577bd663c846da30f60d8cf404`、正準JSONと経路別hashを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-358-20260929.json)へ証拠を保存した。

| 経路 | 監査結果 |
| --- | --- |
| 01-A | 配置後responseは唯一の`response-pass`。 |
| 01-B | 294から357までの履歴をたどり、現局面のターン終了6段階が完全。 |
| 02-A | 必須たまご交換11候補を列挙。 |
| 02-B | 必須たまご交換9候補を列挙。 |

新event0、completed0、独立balance標本0。次は01-Aの唯一pass、01-Bの必須終了、02-A/Bの既存seeded fallbackを選択する。全proxy回帰とCI成功は未確認。
