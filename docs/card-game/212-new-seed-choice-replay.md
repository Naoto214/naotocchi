# 212 新seed4経路選択再開

[212 TDD計画](plans/2026-09-25-new-seed-choice-replay-212.md)。211の選択を209の保存stateから再実行。01-AはC-chicken連鎖中のresponse-pass、02-AはP-cliff_goat配置、01-B/02-Bは通常pass。各経路で新decision/event/snapshotを1件ずつ記録し、元state/hashから新game/continuation hashまで検証した。次は01-Aの次優先者response、02-Aの配置後response、01-B/02-Bのターン終了responseの候補横断監査。

新decision4、新event4、新snapshot4、completed0、独立balance標本0。カード本文・数値・登録区分変更0。専用2件PASS、保存JSONのcanonical bytes一致。全proxy回帰とCI成功は未確認。
