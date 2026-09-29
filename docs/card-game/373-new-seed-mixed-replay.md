# 373 新seed混合4経路の再生

[373計画](plans/2026-09-29-new-seed-mixed-replay-373.md)。[372選択](372-new-seed-mixed-choice.md)を[370保存state](data/proxy-new-seed-mixed-replay-370-20260929.json)へ適用した。[保存JSON](data/proxy-new-seed-mixed-replay-373-20260929.json)のraw SHA256は`62df4729d905f256e37c6373913b936b2744b5b8156eb2de7ede09256d11e70a`。選択JSONのraw SHA256は`af55c3a32955c9d858e746e04904cc86b3b7b5d4d56567711eb167ca971f6c16`。

| 経路 | 新event | 次局面 |
| --- | --- | --- |
| 01-A | seq101終了、seq102次手番ドロー | Bの必須たまご交換入口 |
| 01-B | seq104連鎖2回目pass | turn_start連鎖resolving、E-first-dateは起動域で未解決 |
| 02-A | seq93終了前pass | turn_end入口 |
| 02-B | seq105終了前pass | turn_end入口 |

新decision3、event/snapshot各5、completed0、独立balance標本0。各前後game/continuation hashと正準JSONを検証。次は4局面を監査する。過去のstate/hashとカード本文は非変更。全proxy回帰とCI成功は未確認。
