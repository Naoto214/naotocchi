# 309 新seed連鎖解決・ターン終了の横断監査

[309計画](plans/2026-09-27-new-seed-mixed-audit-309.md)。[308保存state](data/proxy-new-seed-mixed-replay-308-20260927.json)と291の既存ターン終了証拠のraw/canonical、event/state/hash履歴を照合し、[監査JSON](data/proxy-new-seed-mixed-audit-309-20260927.json)に4経路の次機会を保存した。

| 経路 | 次機会 | 根拠 |
| --- | --- | --- |
| 01-A | C-chicken盤上能力の解決 | 山札上A-007#1はメインM-antlion-07。なかま以外のため移動・ドローなし、山札上に保持する解決を既存215契約で予見 |
| 01-B | `response-pass`のみ | A優先のターン終了responseを手札・盤上・こいびと別に監査 |
| 02-A | `response-pass`のみ | A優先の配置後responseを同様に監査 |
| 02-B | 証明済み必須ターン終了 | 291以前の証拠と291〜308のevent/snapshot/hash履歴を接続し、既存6段階完全性契約を満たす |

01-Aの能力解決はまだ未適用。新event0、completed0、独立balance標本0。次は2件の唯一pass、証明済み必須ターン終了を選び、能力解決を適用する。全proxy回帰・CI成功は未確認。
