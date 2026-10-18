# 381 新seed混合4経路の候補監査・選択再生

[381計画](plans/2026-09-29-new-seed-mixed-replay-381.md)。[380保存state](data/proxy-new-seed-mixed-replay-380-20260929.json)のraw SHA256 `1e966556dc0e9841b75c44f69caac4abeb613a59644971d14bc0fbf1570ebbda`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-381-20260929.json)のraw SHA256は`ec10c5dd90921c5503393f5631fa0de4811ddd40627828760a594ec48d1afe49`。[保存JSON](data/proxy-new-seed-mixed-replay-381-20260929.json)のraw SHA256は`49ba48872c54f43955e01196ada16d27d20e1b8a5c08dd55e3a0a280304af1fe`。

| 経路 | 選択・新event | 次局面 |
| --- | --- | --- |
| 01-A | seq107、Bの唯一response-pass | 次優先者Aの配置後response |
| 01-B | seq109、Aの通常pass | Aのターン終了response |
| 02-A | seq99、B-012#1のC-box無料配置 | Bの配置後response |
| 02-B | seq111、Bの通常pass | Bのターン終了response |

01-BではW-countrysideとI-poop1、02-BではM-antlion-01誕生をpassとの確定時収支で比較した。02-Aでは安全な無料C-box配置を有償のM-antlion-01誕生とI-poop1設置より優先した。いずれも既存107/114/116を適用。新decision/event/snapshot各4、completed0、独立balance標本0。専用テストRED→GREEN、正準JSON、前後game/continuation hashを確認。過去のstate/hash・カード本文は非変更。全proxy回帰とCI成功は未確認。次は4局面を監査する。
