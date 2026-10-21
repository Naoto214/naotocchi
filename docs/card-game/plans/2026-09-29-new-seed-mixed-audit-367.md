# 367 新seed混合4経路の監査計画と実施記録

1. 366保存stateのraw SHA256・正準JSONと各経路のgame/continuation hashを照合する。
2. 01-Aの終了前responseと01-Bの未解決連鎖中responseを既存138の手札・盤上候補契約で監査する。02-A/BのA通常行動は既存179の列挙器を使い、現局面で不成立の盤上条件を本文に照らして除外する。
3. 専用テストRED→GREEN、JSON・報告・README・計画をGitHub保存しremote HEAD/treeとPR #259を再確認する。

新event0、独立balance標本0。全proxy回帰とCI成功は未確認。
