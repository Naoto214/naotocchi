# 332 新seed混合局面の選択

[332計画](plans/2026-09-28-new-seed-mixed-choice-332.md)。[331補正監査](331-new-seed-mixed-audit-correction.md)と[329保存state](data/proxy-new-seed-mixed-replay-329-20260928.json)のraw/canonical・境界hashを照合し、[選択JSON](data/proxy-new-seed-mixed-choice-332-20260928.json)に4経路の選択を保存した。

01-Aは通常行動4候補からpass、02-Aはこいびと枠占有を反映した2候補からpassを既存107/114優先順位で選択。01-Bは証明済み必須終了、02-Bはseeded fallbackによるたまご交換を選択。

新event0、completed0、独立balance標本0。次は4経路の選択を再生し、event/snapshot/hashを検証する。全proxy回帰・CI成功は未確認。
