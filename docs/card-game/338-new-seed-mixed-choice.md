# 338 新seed混合局面の選択

[338計画](plans/2026-09-28-new-seed-mixed-choice-338.md)。[337監査](337-new-seed-mixed-audit.md)と[336保存state](data/proxy-new-seed-mixed-replay-336-20260928.json)のraw/canonical・境界hashを照合し、[選択JSON](data/proxy-new-seed-mixed-choice-338-20260928.json)に4経路の選択を保存した。

01-A・02-Aは既存6段階完全性契約で証明済みの必須ターン終了、01-B・02-Bは各局面の唯一合法候補`response-pass`を選択。

新event0、completed0、独立balance標本0。次は各経路を再生しevent/snapshot/hashを検証する。全proxy回帰・CI成功は未確認。
