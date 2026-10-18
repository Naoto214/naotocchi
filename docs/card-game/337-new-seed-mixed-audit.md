# 337 新seed混合局面の横断監査

[337計画](plans/2026-09-28-new-seed-mixed-audit-337.md)。[336保存state](data/proxy-new-seed-mixed-replay-336-20260928.json)のraw/canonicalとevent/snapshot/hashを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-337-20260928.json)に4経路の候補と証明を保存した。

01-A・02-Aは318の証明から336までの履歴をつなぎ、既存6段階完全性契約で必須ターン終了を証明。01-B・02-Bの開始responseは現手札・盤上・こいびとの本文と状態を照合し、各局面で唯一の`response-pass`。

新event0、completed0、独立balance標本0。次は証明済み終了2件と唯一pass2件を選択する。全proxy回帰・CI成功は未確認。
