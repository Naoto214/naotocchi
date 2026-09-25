# 211 新seed4経路選択監査

[211 TDD計画](plans/2026-09-25-new-seed-choice-audit-211.md)。209の保存state/hashと210の完全候補を再検証し、01-Aは連鎖response唯一pass、02-Aは時0のP-cliff_goat配置をsafe_free_developmentで選択。01-B/02-BはW-deepsea（時2）とM-antlion-01誕生（時1）に現在確定する成長がなく、107/114の時残量比較でpassが両者に優先。Bの手札はそれぞれ6/7枚、盤上メインなし。02-BのP-cliff_goatはセカイ初配置では誘発しないことを本文で検証した。

元JSONのraw SHA、canonical bytes、4経路のgame/continuation hash、候補完全性を照合。新event0、completed0、独立balance標本0。保存stateへの適用は次のチェックポイント。196以降の全proxy回帰は未取得であり、CI成功も未確認。
