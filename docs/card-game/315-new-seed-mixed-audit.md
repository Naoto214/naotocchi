# 315 新seed混合局面の横断監査

[315計画](plans/2026-09-27-new-seed-mixed-audit-315.md)。[314保存state](data/proxy-new-seed-mixed-replay-314-20260927.json)のraw/canonical・event/state/hashを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-315-20260927.json)に4経路の候補集合と除外根拠を保存した。

01-Aと02-Aのターン終了response、02-Bの開始時responseは、現手札・盤上・こいびとの本文と状態を照合し、それぞれ唯一の`response-pass`。01-BはAの手札9件を必須たまご交換候補として完全列挙し、116 seeded fallback契約へ接続した。

新event0、completed0、独立balance標本0。次は3件の唯一passと01-Bのseeded交換を選択する。全proxy回帰・CI成功は未確認。
