# 329 新seed混合局面の再生

[329計画](plans/2026-09-28-new-seed-mixed-replay-329.md)。[328選択](328-new-seed-mixed-choice.md)・[327監査](327-new-seed-mixed-audit.md)・[326保存state](data/proxy-new-seed-mixed-replay-326-20260928.json)のraw/canonicalと境界hashを照合して[保存state](data/proxy-new-seed-mixed-replay-329-20260928.json)を作成。

01-A・02-Aの2回目開始時response-passで通常行動入口、01-Bの終了response-passで終了入口、02-Bは証明済み終了と次手番ドローでたまご交換入口。各event/snapshotと前後game/continuation hashを保存・検証。

新event/snapshot各5、completed0、独立balance標本0。次は4局面を横断監査する。全proxy回帰・CI成功は未確認。
