# 392 新seed連鎖解決・終了前応答

[392計画](plans/2026-09-29-new-seed-mixed-replay-392.md)。[391保存state](data/proxy-new-seed-mixed-replay-391-20260929.json)のraw SHA256 `af88cefada0cc9af04d06140b99fe3fa3bb042ba7b634315d52d591362b3d906`を照合。[392保存state](data/proxy-new-seed-mixed-replay-392-20260929.json)のraw SHA256 `71406f4ab5fc6d8192af89dfda43e0954380fdbcf243d5b3355f7730107b4916`。

| 経路 | 処理 | 次局面 |
| --- | --- | --- |
| 01-A | `turn_start`連鎖のC-chicken A-015#1を既存196の効果で解決、seq117 | Aのnormal_action |
| 01-B | state/hash維持、eventなし | Aのturn_start応答 |
| 02-B | Bの終了前応答を現在stateから列挙し、唯一`response-pass`を終了専用遷移で適用、seq122 | turn_end |
| 02-A | state/hash維持、eventなし | Aの配置後応答 |

02-Bの手札・盤上候補の除外理由とstable IDは保存stateの`response_audit`に記録。通常pass遷移は終了前応答をnormal_actionに戻すため使用せず、既存290の終了専用遷移で確認した。01-Aは起動域のまま効果解決し、開始時窓をafter_normal_actionへ書き換えていない。新decision1、event/snapshot各2、completed0、独立balance標本0。専用テストRED→GREEN、正準JSON一致、各event/snapshotの前後game/continuation hash連鎖を確認。過去state/hash・カード本文は非変更。全proxy回帰・CI成功は未確認。次は01-B/02-Aの応答、01-A通常行動、02-B終了を横断監査する。
