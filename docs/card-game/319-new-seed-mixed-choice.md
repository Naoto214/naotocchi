# 319 新seed混合局面の選択

[319計画](plans/2026-09-27-new-seed-mixed-choice-319.md)。[318監査](318-new-seed-mixed-audit.md)と[317保存state](data/proxy-new-seed-mixed-replay-317-20260927.json)のraw/canonical・境界hashを照合し、[選択JSON](data/proxy-new-seed-mixed-choice-319-20260927.json)に4経路の決定を保存した。

01-A・02-Aは既存6段階完全性契約で証明済みの必須ターン終了。01-B・02-Bはそれぞれ唯一合法の`response-pass`を選択した。

新event0、completed0、独立balance標本0。次は4経路の選択を適用してevent・snapshot・hashを検証する。全proxy回帰・CI成功は未確認。
