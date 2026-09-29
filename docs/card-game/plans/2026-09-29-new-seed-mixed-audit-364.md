# 364 新seed混合4経路の監査計画と実施記録

1. 363保存stateのraw SHA256・正準JSONと各経路のgame/continuation hashを照合する。
2. 01-A通常行動を既存179の候補完全性で監査する。01-B開始時responseは既存343と同じ対象・盤上能力・カード本文を現局面に投影する。02-A/Bは現在優先者の手札・盤上条件を監査する。
3. 専用テストRED→GREEN、JSON・報告・README・計画をGitHub保存しremote HEAD/treeとPR #259を再確認する。

新event0、独立balance標本0。全proxy回帰とCI成功は未確認。
