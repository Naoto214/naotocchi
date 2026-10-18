# 326 新seed混合局面の再生

[326計画](plans/2026-09-28-new-seed-mixed-replay-326.md)。[325選択](325-new-seed-mixed-choice.md)を[323保存state](data/proxy-new-seed-mixed-replay-323-20260927.json)に適用し、[再生JSON](data/proxy-new-seed-mixed-replay-326-20260928.json)に4件のevent・snapshot・前後game/continuation hashを記録した。

01-A・02-Aは開始時responseを各1回passし、相手へ優先権が移った。01-Bは通常passでターン終了response入口に到達。02-Bは2回目のターン終了response-passで必須ターン終了入口に到達した。

新event4、completed0、独立balance標本0。次は2件の次優先response、01-Bの終了response、02-Bのターン終了を横断監査する。全proxy回帰・CI成功は未確認。
