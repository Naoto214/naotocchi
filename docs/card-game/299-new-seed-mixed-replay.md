# 299 新seedたまご交換・開始時response再生

[299計画](plans/2026-09-27-new-seed-mixed-replay-299.md)。298選択、297監査、296保存stateのraw/canonical・境界hashを照合し、[再生JSON](data/proxy-new-seed-mixed-replay-299-20260927.json)へ4経路4件のevent/snapshotと前後hashを保存した。

01-A/01-Bは選択済みたまご交換を適用し、R5の自分優先の開始時response入口へ。02-A/02-BはB側の唯一response-passを適用し、次優先者Aのresponse入口へ進んだ。両経路の連鎖は空で、追加のresponse候補は未監査。

新event/snapshot各4、completed0、独立balance標本0。次は4経路の現在の開始時response候補を横断監査する。全proxy回帰・CI成功は未確認。
