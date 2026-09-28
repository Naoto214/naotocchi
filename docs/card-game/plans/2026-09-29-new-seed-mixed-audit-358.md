# 358 新seed混合4経路の監査計画と実施記録

1. 357保存stateのraw SHA256・正準JSONと4経路のgame/continuation hashを照合する。
2. 01-A配置後responseの手札・盤上の発動時点と対象を監査する。01-Bは294の終了集合証明から357までのevent/snapshot/hash鎖をたどり、現盤面の終了6段階を再監査する。
3. 02-A/Bの手札全枚数から必須たまご交換候補を既存116で列挙する。専用テストRED→GREEN、JSON・報告・README・計画をGitHub保存してremote HEAD/treeとPR #259を再確認する。

新event0、独立balance標本0。全proxy回帰とCI成功は未確認。
