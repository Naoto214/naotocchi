# 382 新seed混合4経路response監査・再生

[382計画](plans/2026-09-29-new-seed-mixed-replay-382.md)。[381保存state](data/proxy-new-seed-mixed-replay-381-20260929.json)のraw SHA256 `49ba48872c54f43955e01196ada16d27d20e1b8a5c08dd55e3a0a280304af1fe`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-382-20260929.json)のraw SHA256は`169378bec3dba0cecb2c5656ffe57915829994a25ef0e8607ebd58c64be79ad3`。[保存JSON](data/proxy-new-seed-mixed-replay-382-20260929.json)のraw SHA256は`deebc73285e12d16829060c7f76457a171df10b9b3c28af51df18482817c8faa`。

| 経路 | 新event | 次局面 |
| --- | --- | --- |
| 01-A | seq108、Aの配置後response-pass | Bのnormal_action。通常行動主体はB |
| 01-B | seq110、Bの終了前response-pass | Aのturn_end入口 |
| 02-A | seq100、Aの配置後response-pass | 次優先者Aの配置後response |
| 02-B | seq112、Aの終了前response-pass | Bのturn_end入口 |

4機会の合法候補は各`response-pass`のみ。新decision/event/snapshot各4、completed0、独立balance標本0。専用テストRED→GREEN、監査・再生の正準JSON一致、各前後game/continuation hashを確認。過去のstate/hash・カード本文は非変更。全proxy回帰とCI成功は未確認。次は01-B／02-Bの六段階終了証明と01-A／02-Aの現局面を監査する。
