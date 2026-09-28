# 342 新seed混合4経路の再生

[342計画](plans/2026-09-28-new-seed-mixed-replay-342.md)。[341選択](341-new-seed-mixed-choice.md)を[339保存state](data/proxy-new-seed-mixed-replay-339-20260928.json)へ適用し、[342保存state](data/proxy-new-seed-mixed-replay-342-20260928.json)へ各event/snapshotと前後game/continuation hashを保存した。

01-A・02-Aはseededたまご交換を実行して開始時response入口。01-Bは唯一のresponse-passで通常行動入口。02-Bは時0のC-boxをBの空きなかま枠へ配置し、配置後response入口。4経路でevent/snapshot各4、decision4、completed0、独立balance標本0。次は4経路の現在候補を横断監査する。全proxy回帰・CI成功は未確認。
