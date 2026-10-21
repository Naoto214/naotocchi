# 312 新seed混合局面の横断監査

[312計画](plans/2026-09-27-new-seed-mixed-audit-312.md)。[311保存state](data/proxy-new-seed-mixed-replay-311-20260927.json)と294のターン終了証拠のraw/canonical・event/state/hash履歴を照合し、[監査JSON](data/proxy-new-seed-mixed-audit-312-20260927.json)に4経路の次候補を保存した。

| 経路 | 次機会 | 候補／証明 |
| --- | --- | --- |
| 01-A | A通常行動 | W-countryside配置、I-poop1セット、pass |
| 01-B | B必須ターン終了 | 294〜311のevent/snapshot/hashを継ぎ既存6段階完全性契約を満たす |
| 02-A | B通常行動 | W-deepsea配置、M-antlion-01誕生、pass |
| 02-B | A必須たまご交換 | 現手札8件を候補として116のseeded fallback契約へ接続 |

新event0、completed0、独立balance標本0。次は2経路の通常行動比較、証明済み終了、たまご交換の選択を行う。全proxy回帰・CI成功は未確認。
