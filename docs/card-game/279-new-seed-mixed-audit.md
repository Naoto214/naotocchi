# 279 新seed混合局面候補監査

[279計画](plans/2026-09-27-new-seed-mixed-audit-279.md)。278の保存state、event、前後hashとcanonical JSONを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-279-20260927.json)に4経路の候補と除外を記録した。新event0、completed0、独立balance標本0。

| 経路 | 現在局面 | 合法候補 |
| --- | --- | --- |
| 01-A | Bの通常行動 | C-cat_friend配置、W-deepsea配置、M-antlion-01誕生、pass |
| 01-B | Aの必須たまご交換 | A-004/005/006/020/029/030/034/039の8枚 |
| 02-A | Aのコイン起動中、Bのresponse | response-passのみ。コインは未解決 |
| 02-B | AのC-box配置後response | response-passのみ。コインは既に解決済み |

02-Aでは手札の条件未成立を除外し、盤上P-cliff_goatは異名のセカイ変更がないことを確認した。02-BではG-animal-shogiの対象が捨て札にないこと、C-boxに能力がないこと、P-cliff_goatの条件が不成立であることを確認した。手札のその他の時機・条件は既存候補列挙器の除外記録に保持した。response検査用の投影は監査中のみで、278のstate/hashには変更を加えていない。

次は107/114/116の既存選択契約で4経路を選択し、証明できるものから再生する。全proxy回帰とCI成功は未確認。
