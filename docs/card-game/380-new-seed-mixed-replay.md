# 380 新seed混合4経路の候補監査・選択再生

[380計画](plans/2026-09-29-new-seed-mixed-replay-380.md)。[379保存state](data/proxy-new-seed-mixed-replay-379-20260929.json)のraw SHA256 `669b2fb25c6675525b0617daf4e1c2a10c6d4baafb764857e2016c5896e5ecf7`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-380-20260929.json)のraw SHA256は`628504d2ee53d03357b9dea784338ff2bb2aeb9a73c0d71a883d7a2b8f235de7`。[保存JSON](data/proxy-new-seed-mixed-replay-380-20260929.json)のraw SHA256は`1e966556dc0e9841b75c44f69caac4abeb613a59644971d14bc0fbf1570ebbda`。

| 経路 | 選択・新event | 次局面 |
| --- | --- | --- |
| 01-A | seq106、B-015#1のC-chickenを無料配置 | Bの配置後response |
| 01-B | seq108、Bの唯一response-pass | Aのnormal_action。通常行動主体はA |
| 02-A | seq98、Aの唯一response-pass | Bのnormal_action。通常行動主体はB |
| 02-B | seq110、Aの唯一response-pass | Bのnormal_action。通常行動主体はB |

01-Aの合法通常行動はC-chicken配置、W-city／W-deepsea配置、M-antlion-01誕生、passの5件。盤上P-cat_ceoを投影から除去すると、占有中の恋人枠が空と誤認されP-anglerfish配置を偽候補として列挙するため、占有を保持して12検査を通した。C-chickenの安全な無料配置を既存107/114/116で有償3件と比較した。新decision/event/snapshot各4、completed0、独立balance標本0。専用テストRED→GREEN、正準JSON、前後game/continuation hashを確認。過去のstate/hashとカード本文は非変更。全proxy回帰とCI成功は未確認。次は4局面を監査する。
