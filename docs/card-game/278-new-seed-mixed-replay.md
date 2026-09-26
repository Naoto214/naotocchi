# 278 新seed混合局面再生

[278計画](plans/2026-09-27-new-seed-mixed-replay-278.md)。277の選択と保存state/hashを照合し、[再生JSON](data/proxy-new-seed-mixed-replay-278-20260927.json)に4経路5件のeventとsnapshot、各前後hashを保存した。

01-Aは2回目の開始response passを経て通常行動入口。01-Bは証明済みターン終了と次手番ドローを適用し、たまご交換入口。02-Aはコイン起動中Aのpassで次の優先者B。02-BはC-boxを手札から空きなかま枠へ時0で配置し、配置後response入口。

completed0、独立balance標本0。次は4経路の現在局面で合法候補と必要な終了条件を横断監査する。全proxy回帰・CI成功は未確認。
