# 324 新seed混合局面の横断監査

[324計画](plans/2026-09-28-new-seed-mixed-audit-324.md)。[323保存state](data/proxy-new-seed-mixed-replay-323-20260927.json)のraw/canonical・event/state/hashを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-324-20260928.json)に4経路の候補と除外根拠を保存した。

01-A・02-Aの開始時responseと02-Bのターン終了responseは、手札・盤上・こいびとを照合していずれも唯一の`response-pass`。02-AのE-bossは、Bの終了（event 73）、Aのターン開始・たまごドロー（74）、たまご交換（75）の連続履歴とカード本文から、このターンの自分のメインの勝負敗北条件を満たさない。01-Bの通常行動はW-countryside配置、I-poop1セット、passの3候補を既存候補完全性契約で列挙した。

新event0、completed0、独立balance標本0。次は3件の唯一passと01-Bの通常行動3候補の優先順位を選択する。全proxy回帰・CI成功は未確認。
