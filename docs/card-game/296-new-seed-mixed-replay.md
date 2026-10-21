# 296 新seed終了・たまご交換再生

[296計画](plans/2026-09-27-new-seed-mixed-replay-296.md)。295選択、294監査、293保存state/hashのraw/canonicalを照合し、[再生JSON](data/proxy-new-seed-mixed-replay-296-20260927.json)へ4経路計6件のevent/snapshotと前後hashを保存した。

01-A/01-Bは証明済みターン終了と次手番2枚ドローを適用し、両経路ともR5の必須たまご交換入口へ。02-A/02-BはB側seed選択済み交換を適用し、それぞれR4/R5の開始時response入口へ進んだ。C-cat_friendは任意起動であり、C-batとは開始時分類を分けた。

新event/snapshot各6、completed0、独立balance標本0。次は必須たまご交換2経路と開始時response2経路を横断監査する。全proxy回帰・CI成功は未確認。
