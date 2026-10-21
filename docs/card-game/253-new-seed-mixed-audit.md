# 253 新seed次局面横断監査

[253計画](plans/2026-09-26-new-seed-mixed-audit-253.md)。252保存state/hashを照合し、01-A・01-B・02-Aの必須たまご交換候補はそれぞれ手札全体を完全列挙。02-Bの通常行動は `candidate-play-main-B-001#1-birth` と `pass` の2件を完全列挙。250由来の停止理由ラベルの食い違いは `reported_stop_reason_code` と `stop_label_correction` に記録し、過去state/hash/eventを変更していない。

生成データ：[253 JSON](data/proxy-new-seed-mixed-audit-253-20260926.json)。専用テストRED→GREEN、canonical bytes一致。新event0、対戦完走0、独立balance標本0。次に3経路のたまご交換と02-Bの通常選択を比較・適用する。全proxy回帰とCI成功は未確認。
