# 318 新seed混合局面の横断監査

[318計画](plans/2026-09-27-new-seed-mixed-audit-318.md)。[317保存state](data/proxy-new-seed-mixed-replay-317-20260927.json)のraw/canonical・event/state/hashを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-318-20260927.json)に4経路の証明と候補集合を保存した。

01-A・02-Aのターン終了は、それぞれ294・291の証明から317までのevent/snapshot/hash履歴をつなぎ、既存6段階完全性契約で必須終了を証明した。01-Bと02-Bの開始時responseは、手札・盤上・こいびとの発動条件を照合し、ともに唯一の`response-pass`。

新event0、completed0、独立balance標本0。次は証明済み終了2件と唯一pass2件を選択する。全proxy回帰・CI成功は未確認。
