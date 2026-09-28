# 335 新seed混合局面の選択

[335計画](plans/2026-09-28-new-seed-mixed-choice-335.md)。[334監査](334-new-seed-mixed-audit.md)と[333保存state](data/proxy-new-seed-mixed-replay-333-20260928.json)のraw/canonical・境界hashを照合し、[選択JSON](data/proxy-new-seed-mixed-choice-335-20260928.json)に4経路の選択を保存した。

01-A・02-A・02-Bは各局面で唯一合法の`response-pass`。01-Bはseeded fallback契約に従って必須たまご交換候補から選択。

新event0、completed0、独立balance標本0。次は4件を適用しevent/snapshot/hashを検証する。全proxy回帰・CI成功は未確認。
