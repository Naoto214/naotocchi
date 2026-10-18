# 334 新seed混合局面の横断監査

[334計画](plans/2026-09-28-new-seed-mixed-audit-334.md)。[333保存state](data/proxy-new-seed-mixed-replay-333-20260928.json)のraw/canonicalとevent/snapshot/hashを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-334-20260928.json)に4経路の候補を保存した。

01-A・02-Aの終了responseと02-Bの開始responseは、手札・盤上・こいびとの本文と状態を分類して各局面で唯一の`response-pass`。01-Bは必須たまご交換候補を全手札から列挙した。

新event0、completed0、独立balance標本0。次は3件の唯一passと01-Bのseededたまご交換を選択する。全proxy回帰・CI成功は未確認。
