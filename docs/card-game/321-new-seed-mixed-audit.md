# 321 新seed混合局面の横断監査

[321計画](plans/2026-09-27-new-seed-mixed-audit-321.md)。[320保存state](data/proxy-new-seed-mixed-replay-320-20260927.json)のraw/canonical・event/state/hashを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-321-20260927.json)に4経路の候補と除外根拠を保存した。

01-AはBの必須たまご交換8候補、02-AはAの10候補を完全列挙し、既存116 seeded fallback契約へ接続した。01-BはBの開始時responseで唯一の`response-pass`。02-Bの通常行動は装着3件、M-beetle-01誕生1件、`pass`の計5候補を既存候補完全性契約で監査した。通常行動の優先順位は次の選択で検証する。

新event0、completed0、独立balance標本0。全proxy回帰・CI成功は未確認。
