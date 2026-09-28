# 348 新seed混合4経路のpass再生

[348計画](plans/2026-09-28-new-seed-mixed-replay-348.md)。[347選択](347-new-seed-mixed-choice.md)の唯一pass4件を[345保存state](data/proxy-new-seed-mixed-replay-345-20260928.json)へ適用し、[348保存state](data/proxy-new-seed-mixed-replay-348-20260928.json)に各event/snapshotと前後game/continuation hashを保存した。

01-Aは既存142のturn_start連鎖遷移でAのpass後にBへ優先権を移し、E-first-dateは起動域で未解決のまま。01-Bは配置後passでAへ優先権が移動。02-A/Bは2回目のpassで通常行動入口へ。4経路でdecision/event/snapshot各4、completed0、独立balance標本0。

次は01-A/Bの次優先者responseと02-A/Bの通常行動候補を横断監査する。全proxy回帰・CI成功は未確認。
