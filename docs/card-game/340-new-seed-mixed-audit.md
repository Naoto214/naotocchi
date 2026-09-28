# 340 新seed混合局面の横断監査

[340計画](plans/2026-09-28-new-seed-mixed-audit-340.md)。[339保存state](data/proxy-new-seed-mixed-replay-339-20260928.json)のraw/canonicalとevent/snapshot/hashを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-340-20260928.json)に4経路の候補を保存した。

01-Aの必須たまご交換は10候補、02-Aは9候補。01-Bの開始responseは手札・盤上・こいびとの本文と状態を照合して唯一の`response-pass`。02-Bの通常行動はC-box配置、M-antlion-01誕生、passの3候補を完全監査。

新event0、completed0、独立balance標本0。次は交換候補のseeded選択と02-B通常行動の既存優先順位比較を行う。全proxy回帰・CI成功は未確認。
