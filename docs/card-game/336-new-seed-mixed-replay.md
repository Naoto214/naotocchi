# 336 新seed混合局面の再生

[336計画](plans/2026-09-28-new-seed-mixed-replay-336.md)。[335選択](335-new-seed-mixed-choice.md)・[334監査](334-new-seed-mixed-audit.md)・[333保存state](data/proxy-new-seed-mixed-replay-333-20260928.json)のraw/canonicalと境界hashを照合し、[保存state](data/proxy-new-seed-mixed-replay-336-20260928.json)を生成した。

01-A・02-Aの終了response-passでターン終了入口、02-Bの開始response-passで次優先者response入口、01-Bのseededたまご交換で開始response入口へ移行。各event/snapshotと前後game/continuation hashを保存・検証。

新event/snapshot各4、completed0、独立balance標本0。次は4経路を横断監査する。全proxy回帰・CI成功は未確認。
