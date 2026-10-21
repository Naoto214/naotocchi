# 258 新seedresponse適用

[258計画](plans/2026-09-26-new-seed-mixed-replay-258.md)。257の選択4件を255保存stateから適用。01-A・01-B・02-Aは開始時responseの次優先者へ、02-Bは `turn_end` へ進んだ。01-Aの能力を選ばなかったseed結果も決定記録に保持した。

生成データ：[258 JSON](data/proxy-new-seed-mixed-replay-258-20260926.json)。新decision4、event/snapshot各4、対戦完走0、独立balance標本0。専用テストとcanonical bytes一致を確認。次は次優先者3経路のresponse候補と02-B終了履歴を監査する。全proxy回帰とCI成功は未確認。
