# 376 新seed混合4経路の再生

[376計画](plans/2026-09-29-new-seed-mixed-replay-376.md)。[375選択](375-new-seed-mixed-choice.md)を[373保存state](data/proxy-new-seed-mixed-replay-373-20260929.json)へ適用した。[保存JSON](data/proxy-new-seed-mixed-replay-376-20260929.json)のraw SHA256は`28d83e00893ff02e4785b4a07a1527e18480911e9a6c2faa41ea0538586dbfd2`。375選択JSONは`bdd369048790591a835b3af1bd0d128a844c23334d6076c66e752e5b4ea69724`。

| 経路 | 新event | 次局面 |
| --- | --- | --- |
| 01-A | seq103、B-032を山札下へ交換 | Bのturn_start response入口 |
| 01-B | seq105、E-first-date解決。Aが1枚引き、そだち+5 | Aのnormal_action入口 |
| 02-A | seq94終了、seq95次手番ドロー | Bの必須たまご交換入口 |
| 02-B | seq106終了、seq107次手番ドロー | Bの必須たまご交換入口 |

02-A/Bの次手番Bの盤上はC-cat_friend、02-Bのみ追加C-box、P-cliff_goat。既存本文で開始時以外の能力・誘発と能力なしを分類した。過去のstate/hashやカード本文は非変更。新decision2、event/snapshot各6、completed0、独立balance標本0。各前後game/continuation hashと正準JSONを検証。次は4局面を監査する。全proxy回帰とCI成功は未確認。
