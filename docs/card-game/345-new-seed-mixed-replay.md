# 345 新seed混合4経路の再生

[345計画](plans/2026-09-28-new-seed-mixed-replay-345.md)。[344選択](344-new-seed-mixed-choice.md)を[342保存state](data/proxy-new-seed-mixed-replay-342-20260928.json)へ適用し、[345保存state](data/proxy-new-seed-mixed-replay-345-20260928.json)に各event/snapshotと前後game/continuation hashを保存した。

01-AはE-first-dateを時1で手札から起動域へ移し、盤上こいびとA-017#1を対象に連鎖をbuildingへ。起動後の優先者はA、効果は未解決でそだち+5・ドローは未適用。01-Bは3枠目へ時0でC-chickenを配置し配置後response入口。02-Aは開始時、02-Bは配置後の唯一passを適用し、相手優先者へ。4経路でdecision/event/snapshot各4、completed0、独立balance標本0。

次は起動者Aの連鎖response、配置後response2件、開始時response1件を監査する。全proxy回帰・CI成功は未確認。
