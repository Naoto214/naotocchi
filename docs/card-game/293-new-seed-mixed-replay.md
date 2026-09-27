# 293 新seed終了境界再生

[293計画](plans/2026-09-27-new-seed-mixed-replay-293.md)。292選択、291監査、290保存stateのraw/canonical・境界hashを照合し、[再生JSON](data/proxy-new-seed-mixed-replay-293-20260927.json)に4経路計6件のevent/snapshotと前後hashを保存した。

01-A/01-Bは終了前response-passを適用し、証明待ちの`turn_end`入口へ。02-A/02-Bは証明済みターン終了と次手番2枚ドローを各2イベントで適用し、02-AはR4、02-BはR5のB側必須たまご交換入口へ進んだ。C-cat_friendは任意起動能力として開始時誘発から除外した。

新event/snapshot各6、completed0、独立balance標本0。次は終了履歴2経路と必須たまご交換2経路を横断監査する。全proxy回帰・CI成功は未確認。
