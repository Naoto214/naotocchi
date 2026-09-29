# 366 新seed混合4経路の選択適用

[366計画](plans/2026-09-29-new-seed-mixed-replay-366.md)。[365選択](365-new-seed-mixed-choice.md)を[363保存state](data/proxy-new-seed-mixed-replay-363-20260929.json)の4経路に適用し、[保存state](data/proxy-new-seed-mixed-replay-366-20260929.json)へevent/snapshot各4件と前後game/continuation hashを記録した。保存stateのraw SHA256は`4e34c2df05979c9625720f22eb031003cc3d0db30e6d43cd1e4ee51f394ce2fc`。

| 経路 | 適用結果・次の監査入口 |
| --- | --- |
| 01-A | 通常passから終了前`turn_end_response`。 |
| 01-B | E-first-dateを時1で起動域へ移し、盤上こいびとA-017#1を対象に連鎖building。優先者A、効果未解決。 |
| 02-A/B | 開始時response-passから各Bの`normal_action`。 |

新decision4、event/snapshot各4、completed0、独立balance標本0。次は01-Aの終了前response、01-Bの連鎖中response、02-A/Bの通常行動候補を横断監査する。全proxy回帰とCI成功は未確認。
