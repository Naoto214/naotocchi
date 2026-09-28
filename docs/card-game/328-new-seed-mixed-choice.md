# 328 新seed混合局面の選択

[328計画](plans/2026-09-28-new-seed-mixed-choice-328.md)。[327監査](327-new-seed-mixed-audit.md)と[326保存state](data/proxy-new-seed-mixed-replay-326-20260928.json)のraw/canonical・境界hashを照合し、[選択JSON](data/proxy-new-seed-mixed-choice-328-20260928.json)に4経路の選択を保存した。

01-A・01-B・02-Aは各局面で唯一合法の`response-pass`。02-Bは309から326までの履歴と既存6段階完全性契約で証明した必須ターン終了を選択。

新event0、completed0、独立balance標本0。次は4経路へ適用し、各event・snapshot・前後hashを検証する。全proxy回帰・CI成功は未確認。
