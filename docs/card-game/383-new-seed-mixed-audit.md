# 383 新seed混合4経路の監査

[383計画](plans/2026-09-29-new-seed-mixed-audit-383.md)。[382保存state](data/proxy-new-seed-mixed-replay-382-20260929.json)のraw SHA256 `deebc73285e12d16829060c7f76457a171df10b9b3c28af51df18482817c8faa`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-383-20260929.json)のraw SHA256は`a77496019987b62cc716170a01e912189379712babe1ae8b70db33bffad5f124`。

| 経路 | 現局面 | 合法候補・証明 |
| --- | --- | --- |
| 01-A | Bのnormal_action | `candidate-place_world-B-020#1`、`candidate-place_world-B-022#1`、`candidate-play-main-B-001#1-birth`、`pass`。盤上P-cat_ceoの占有を保持し、手札P-anglerfishの配置を候補にしない |
| 01-B | Aのturn_end | 358の終了証明から382までのevent/snapshotと前後hashを延長。376のE-first-date解決でAそだち+5、対象A-017#1を確認。六段階集合完備、停止コードなし |
| 02-A | A優先の配置後response | `response-pass`のみ。Bの手番と混同しない |
| 02-B | Bのturn_end | 374の終了証明から382までのevent/snapshotと前後hashを延長。六段階集合完備、停止コードなし |

専用テストRED→GREEN、正準JSON一致、保存stateのgame/continuation hash、履歴の連続event/snapshotと前後hashを確認。新event/snapshotは0、completed0、独立balance標本0。過去state/hashとカード本文は非変更。全proxy回帰・CI成功は未確認。次はこの証明に基づいて必須終了・唯一response-passを適用し、01-Aの4候補を既存選択契約で比較する。
