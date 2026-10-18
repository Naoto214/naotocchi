# 370 新seed混合4経路のpass再生

[370計画](plans/2026-09-29-new-seed-mixed-replay-370.md)。[369選択](369-new-seed-mixed-choice.md)を[366保存state](data/proxy-new-seed-mixed-replay-366-20260929.json)へ適用した。[保存JSON](data/proxy-new-seed-mixed-replay-370-20260929.json)には各経路のevent/snapshot各1件と前後game/continuation hashを収める。369選択のraw SHA256は`b886dbe495790f56e40df87e59240d86894e7b784eeb2cbeda13ee6854f7e273`。

| 経路 | event seq | 遷移 | 次の入口 |
| --- | ---: | --- | --- |
| 01-A | 100 | 終了前response-pass | turn_end。終了集合の証拠確認 |
| 01-B | 103 | 連鎖最初のresponse-pass | turn_start連鎖building。B優先、連続pass1。E-first-date未解決 |
| 02-A | 92 | Aの通常pass | turn_end_response。B優先 |
| 02-B | 104 | Aの通常pass | turn_end_response。B優先 |

新decision/event/snapshot各4件、completed0、独立balance標本0。過去state/hashとカード本文は非変更。次は4局面を横断監査する。全proxy回帰とCI成功は未確認。
