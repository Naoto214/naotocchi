# 377 新seed混合4経路の候補監査

[377計画](plans/2026-09-29-new-seed-mixed-audit-377.md)。[376保存state](data/proxy-new-seed-mixed-replay-376-20260929.json)のraw SHA256 `28d83e00893ff02e4785b4a07a1527e18480911e9a6c2faa41ea0538586dbfd2`と前後game/continuation hashを照合した。[監査JSON](data/proxy-new-seed-mixed-audit-377-20260929.json)のraw SHA256は`2825840a4c117b7084c5e777b3f407d507df96e085fca5e8cb9120db7f631173`。

| 経路 | 次局面 | 合法候補 |
| --- | --- | --- |
| 01-A | Bのturn_start response | `response-pass`のみ。手札のC-chickenを盤上源に含めない |
| 01-B | Aのnormal_action | `candidate-place-companion-A-012#1`、`candidate-place_world-A-021#1`、`candidate-set_item-A-034#1`、`pass` |
| 02-A | Bの必須たまご交換 | 10件。保存JSONの候補・stable IDを参照 |
| 02-B | Bの必須たまご交換 | 10件。保存JSONの候補・stable IDを参照 |

01-Bの盤上C-chicken `A-015#1` は、既に過ぎたturn_startへ遡及して起動しない。連鎖後のpriority_actor=Bを通常行動主体に使わない。01-Aの盤上instance IDは保存JSONで `B-011#1=C-bat`、`B-013#1=C-cat_friend` と確認した。引き継ぎ文のID対応は逆だが、盤上のカード種の集合は一致する。

新event/snapshot 0、completed 0、独立balance標本0。専用テストRED→GREEN、正準JSON一致を確認。全proxy回帰とCI成功は未確認。次は4経路の選択を既存契約に従って行い、可能な連続遷移をまとめて検証する。
