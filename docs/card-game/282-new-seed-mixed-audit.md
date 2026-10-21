# 282 新seed混合局面候補監査

[282計画](plans/2026-09-27-new-seed-mixed-audit-282.md)。281の保存state、event、前後hashとcanonical JSONを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-282-20260927.json)に4経路の現在局面を記録した。新event0、completed0、独立balance標本0。

| 経路 | 局面 | 証明済み候補・処理 |
| --- | --- | --- |
| 01-A | BのC-cat_friend配置後response | response-passのみ |
| 01-B | Aのたまご交換後開始response | response-passと盤上C-chicken能力起動（一般stable ID） |
| 02-A | AのI-c_coin2連鎖解決 | 起動域の単一リンクをresolve_item。公開前 |
| 02-B | C-box配置後Bのresponse | response-passのみ |

01-BのC-chickenはたまご交換を終えた開始response窓で判定する。01-A/02-BのC-cat_friendは対象の捨て札なかまがなく、能力を起動できない。盤上の他の能力は各窓の時機を本文と照合した。02-Aのコインはまだ公開・解決していない。

次は107/114/116の既存契約で選択し、stateへ適用する。全proxy回帰・CI成功は未確認。
