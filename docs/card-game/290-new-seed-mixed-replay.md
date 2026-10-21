# 290 新seed混合局面再生

[290計画](plans/2026-09-27-new-seed-mixed-replay-290.md)。289選択、288監査、287保存stateのraw/canonicalと境界hashを照合し、[再生JSON](data/proxy-new-seed-mixed-replay-290-20260927.json)に4経路4件のevent、snapshot、前後hashを保存した。

01-A/01-Bの通常passでターン終了前response入口へ移動した。02-A/02-Bの終了前response-passで応答窓を閉じ、証明待ちの`turn_end`入口へ移動した。終了遷移自体はまだ適用していない。

新event/snapshot各4、completed0、独立balance標本0。次は01-A/01-Bの終了前response候補と02-A/02-Bのターン終了履歴を横断監査する。全proxy回帰・CI成功は未確認。
