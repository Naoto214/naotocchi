# 303 新seed混合局面の候補横断監査

[303計画](plans/2026-09-27-new-seed-mixed-audit-303.md)。[302保存state](data/proxy-new-seed-mixed-replay-302-20260927.json)のraw/canonical、4経路のstate/hashを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-303-20260927.json)に合法候補と除外根拠を保存した。専用テストはREDからGREENへ進めた。

| 経路 | 入口 | 証明済み合法候補 |
| --- | --- | --- |
| 01-A | C-chicken盤上能力起動中、A優先response | `response-pass` |
| 01-B | Bのpass後、A優先response | `response-pass` |
| 02-A | B通常行動 | `candidate-place-companion-B-013#1`、`candidate-place_world-B-022#1`、`candidate-play-main-B-001#1-birth`、`pass` |
| 02-B | B通常行動 | `candidate-play-main-B-001#1-birth`、`pass` |

01-AのC-chickenは起動域のリンクで既に起動中であり、同じresponseで再起動する候補ではない。01-Bは相手手番で発動条件を満たさない。両経路の手札・盤上・こいびと候補を本文と現stateに照らして除外した。02-A/Bは既存210契約の12完全性条件をすべて満たす。新event0、completed0、独立balance標本0。全proxy回帰・CI成功は未確認。

次は唯一候補の01-A/B response-passと、02-A/Bの通常行動を107/114/116の比較順で選択し、各局面を再生する。
