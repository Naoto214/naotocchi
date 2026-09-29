# 378 新seed混合4経路の選択・再生

[378計画](plans/2026-09-29-new-seed-mixed-replay-378.md)。[377監査](377-new-seed-mixed-audit.md)と[376保存state](data/proxy-new-seed-mixed-replay-376-20260929.json)を照合し、[保存JSON](data/proxy-new-seed-mixed-replay-378-20260929.json)へ4経路の選択と遷移を記録した。保存JSONのraw SHA256は`9d2a82b3a51d538f1a1a904301f6236d5b22715accceb0454ff35638528944ae`。

| 経路 | 新event | 次局面 |
| --- | --- | --- |
| 01-A | seq104、Bの唯一response-pass | 次優先者Aのturn_start response |
| 01-B | seq106、A-012#1のC-box無料配置 | 配置後response |
| 02-A | seq96、seeded fallbackでB-003を山札下へ交換 | Bのturn_start response |
| 02-B | seq108、seeded fallbackでB-038を山札下へ交換 | Bのturn_start response |

01-Bは既存107/114/116の安全な無料配置を使い、W-countrysideとI-poop1の有償行動を確定時の残り時で比較した。C-chickenは先の開始時へ遡って起動していない。新decision/event/snapshot各4、completed0、独立balance標本0。専用テストRED→GREEN、正準JSON一致、各前後game/continuation hashを確認した。過去のstate/hash・カード本文は非変更。全proxy回帰とCI成功は未確認。次は4局面の候補を監査する。
