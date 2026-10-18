# 320 新seed混合局面の再生

[320計画](plans/2026-09-27-new-seed-mixed-replay-320.md)。[319選択](319-new-seed-mixed-choice.md)を[317保存state](data/proxy-new-seed-mixed-replay-317-20260927.json)に適用し、[再生JSON](data/proxy-new-seed-mixed-replay-320-20260927.json)に6件のevent・snapshot・前後game/continuation hashを記録した。

01-A・02-Aは証明済み終了と次手番のたまごドローを各2件適用。次手番の盤上C-bat・C-cat_friend・P-anglerfishは、カード本文と発動タイミングを照合した。01-Bは開始時responseを1回passして相手Bの優先入口へ、02-Bは2回目のpassで通常行動入口へ到達した。

新event6、completed0、独立balance標本0。次は4経路のたまご交換・response・通常行動候補を横断監査する。全proxy回帰・CI成功は未確認。
