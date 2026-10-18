# 133 132停止点の横断監査と独立再開

[横断監査・設計とTDD計画](plans/2026-09-23-132-stops-cross-audit-and-133-design.md)に基づき、132の4停止原本を読取専用入力として三つの独立契約を接続した。伏せる道具は発動せず時を支払う通常行動、P-desert_scorpionは終了時の条件付き誘発、R10は手番順を保って後攻終了時だけ最終比較する。本文・数値・登録区分、旧停止state/hashは非変更。

| 経路 | 132→133 seq | 新decision／event／snapshot | 結果 |
| --- | ---: | ---: | --- |
| order-01-a-first | 74→105 | 21／31／32 | R9 Aの盤上C-bat候補分類で真正停止 |
| order-01-b-first | 69→113 | 30／44／45 | 同じ盤上分類で真正停止 |
| order-02-a-first | 113→121 | 5／8／9 | R10 B後攻終了、20対20の引き分け |
| order-02-b-first | 112→121 | 6／9／10 | R10 A後攻終了、20対20の引き分け |

予定4／完了2／真正停止2。新decision62・event92・snapshot96。完了2件もseeded fallback経路なので独立balance標本0。01の次の不足は、相手ターンに使う盤上C-bat能力と通常行動候補の一般的な分類境界。未到達盤面の処理は推測実装しない。

[保存計画](data/proxy-cross-restart-plan-133-20260923.json)、[評価](data/proxy-cross-restart-evaluation-133-20260923.json)、[4経路の結果](data/proxy-cross-restart-stops-133/)、[実装](tools/proxy_cross_restart_133.py)、[専用テスト](tools/test_proxy_cross_restart_133.py)。117旧テストの期待190対実際263の差は別件。PR #259はDraft・open・未マージ、main未マージを維持する。
