# 251 新seedターン終了履歴証明

[251計画](plans/2026-09-26-new-seed-turn-end-proof-251.md)。250保存state/hash・eventの連鎖を203/233の既存契約と照合。01-A、01-B、02-Aのターン終了六段階は過去の保存履歴からすべて証明できた。02-Bは通常行動phaseで保持。250の02-B停止理由ラベル `unproved_next_priority_response_candidates` は実際のphaseと一致しないため、251の `stop_label_correction` に `phase_is_normal_action` を記録し、250保存済みstate/hash/eventを変更していない。

生成データ：[251 JSON](data/proxy-new-seed-turn-end-proof-251-20260926.json)。専用テストをRED→GREENで実行、canonical bytesを確認。新event 0、対戦完走 0、独立balance標本 0。次は02-B通常行動候補を横断監査し、証明済み3経路のターン終了遷移を進める。全proxy回帰とCI成功は未確認。
