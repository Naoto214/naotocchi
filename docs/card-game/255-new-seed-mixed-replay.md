# 255 新seed選択適用

[255計画](plans/2026-09-26-new-seed-mixed-replay-255.md)。254で決めた3件のたまご交換と02-Bの通常passを252保存stateから各1event適用した。01-A・01-B・02-Aは自ターン開始response、02-Bはターン終了responseへ進んだ。02-Bの過去の停止理由ラベルの食い違いは過去state/hash/eventを書き換えず、実際のphaseから処理した。

生成データ：[255 JSON](data/proxy-new-seed-mixed-replay-255-20260926.json)。新decision4、event/snapshot各4、対戦完走0、独立balance標本0。専用テストとcanonical bytes一致を確認。次は4経路のresponse候補を横断監査する。全proxy回帰とCI成功は未確認。
