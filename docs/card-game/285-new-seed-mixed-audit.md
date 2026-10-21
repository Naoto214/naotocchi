# 285 新seed混合局面候補監査

[285計画](plans/2026-09-27-new-seed-mixed-audit-285.md)。284の保存state、event、snapshot、前後hashを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-285-20260927.json)に現在の4局面を記録した。新event0、completed0、独立balance標本0。

| 経路 | 局面 | 候補 |
| --- | --- | --- |
| 01-A | Bのなかま配置後、Aの次優先者response | response-passのみ |
| 01-B | Aの開始response、Bの次優先者response | response-passのみ |
| 02-A | Aの通常行動 | I-bowtie装着、M-beetle-01誕生、pass |
| 02-B | Aの通常行動 | I-bond1装着、I-bowtie装着2対象、M-beetle-01誕生、pass |

01-BのC-chickenはAの盤上にあるが、現在の優先者はB。BのC-batは相手のすぐつかう機会ではなく、C-cat_friendには回収対象の捨て札なかまがない。02-AのP-anglerfish、02-BのP-cliff_goatは既存の盤上分類で通常行動候補と区別した。

次は107/114/116の選択契約で候補を比較する。全proxy回帰・CI成功は未確認。
