# 393 新seed開始時・配置後応答の選択と再生

[393計画](plans/2026-09-29-new-seed-mixed-replay-393.md)。[392保存state](data/proxy-new-seed-mixed-replay-392-20260929.json)のraw SHA256 `71406f4ab5fc6d8192af89dfda43e0954380fdbcf243d5b3355f7730107b4916`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-393-20260929.json)のraw SHA256 `cc3eca5e8d0af9177b4d75e1679a0355a60bf2e37618b2d6bbc47249f25ab154`。[保存state](data/proxy-new-seed-mixed-replay-393-20260929.json)のraw SHA256 `cab4d0ee1b6f43dfac3e8ce0958ab72fb14a61e69f1571ca6200de506614ad51`。

| 経路 | 候補・選択と適用 | 次局面 |
| --- | --- | --- |
| 01-A | state/hash維持 | Aのnormal_action |
| 01-B | Aの開始時応答は盤上能力`response-activate-ability-A-015#1`と`response-pass`の2件。107・114・116を評価し、seeded fallbackで能力起動、seq121 | B優先のturn_start連鎖応答 |
| 02-B | state/hash維持 | turn_end |
| 02-A | Aの配置後応答は`response-pass`のみ。seq110 | B優先のpost_placement_response |

C-chicken A-015#1は手札ではなく盤上源で、起動時の`window_kind=turn_start`を維持した。02-Aは直前の配置を過去の開始時誘発として扱わない。新decision2、event/snapshot各2、completed0、独立balance標本0。専用テストRED→GREEN、監査・再生正準JSON一致、各event/snapshotの前後game/continuation hash連鎖を確認。過去state/hash・カード本文は非変更。全proxy回帰・CI成功は未確認。次は01-A通常行動、01-B連鎖応答、02-B六段階終了、02-A次優先者応答を横断監査する。
