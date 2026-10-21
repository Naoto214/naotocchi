# 384 新seed混合4経路の部分再生

[384計画](plans/2026-09-29-new-seed-mixed-replay-384.md)。[383監査JSON](data/proxy-new-seed-mixed-audit-383-20260929.json)のraw SHA256 `a77496019987b62cc716170a01e912189379712babe1ae8b70db33bffad5f124`と[382保存state](data/proxy-new-seed-mixed-replay-382-20260929.json)のraw SHA256 `deebc73285e12d16829060c7f76457a171df10b9b3c28af51df18482817c8faa`を照合。[保存JSON](data/proxy-new-seed-mixed-replay-384-20260929.json)のraw SHA256は`ec301d504f1e5d3bba191000a11c4e1e6ff9bedd5a9404e0dac6748d4c7136b2`。

| 経路 | 適用 | 次局面 |
| --- | --- | --- |
| 01-A | 新eventなし。4候補とstateを保持 | Bのnormal_action、seq108 |
| 01-B | seq111終了・seq112次手番ドロー。B-018#1・B-004#1 | Bのegg_exchange_choice |
| 02-A | seq101唯一response-pass | Bのnormal_action |
| 02-B | seq113終了・seq114次手番ドロー。A-020#1・A-015#1 | Aのegg_exchange_choice |

新decision1、event/snapshot各5、completed0、独立balance標本0。専用テストRED→GREEN、正準JSON一致、各event/snapshotの前後game/continuation hash連鎖を確認。次手番の盤上分類ではC-chickenの開始時能力を開始前のinventoryに保持し、後から遡及起動しない。過去state/hash・カード本文は非変更。全proxy回帰・CI成功は未確認。次は01-Aの4候補の既存選択契約、02-Aの通常行動候補、両たまご交換を横断監査する。
