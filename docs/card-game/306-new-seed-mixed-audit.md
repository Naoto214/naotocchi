# 306 新seed混合局面の候補横断監査

[306計画](plans/2026-09-27-new-seed-mixed-audit-306.md)。[305保存state](data/proxy-new-seed-mixed-replay-305-20260927.json)のraw/canonical・event/state/hashを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-306-20260927.json)に4経路の完全候補集合と除外根拠を保存した。

| 経路 | 次の入口 | 合法候補 |
| --- | --- | --- |
| 01-A | C-chicken連鎖中、B優先response | `response-pass` |
| 01-B | B通常行動 | `candidate-place_world-B-020#1`、`candidate-place_world-B-022#1`、`candidate-play-main-B-001#1-birth`、`pass` |
| 02-A | C-cat_friend配置後response | `response-pass` |
| 02-B | ターン終了response | `response-pass` |

01-AのC-chickenリンクは起動域で維持され未解決。各responseで手札・盤上・こいびと候補を現stateと本文に照らして除外した。01-Bの通常行動は既存210の12完全性検査をすべて満たす。新event0、completed0、独立balance標本0。次は唯一のresponse-passと01-Bの通常行動を選択する。全proxy回帰・CI成功は未確認。
