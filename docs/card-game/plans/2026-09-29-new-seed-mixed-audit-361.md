# 361 新seed混合4経路の監査計画と実施記録

1. 360保存stateのraw SHA256・正準JSONと各経路のgame/continuation hashを照合する。
2. 01-Aの次優先者配置後response、02-A/Bの開始時responseを手札・盤上・発動条件から横断監査する。02-AのE-boss条件は357の次手番開始から360のたまご交換までのevent鎖で確認する。
3. 01-Bの必須たまご交換全候補を既存116で列挙する。専用テストRED→GREEN、JSON・報告・README・計画をGitHub保存しremote HEAD/treeとPR #259を再確認する。

新event0、独立balance標本0。全proxy回帰とCI成功は未確認。
