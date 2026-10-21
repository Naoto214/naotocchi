# 355 新seed混合4経路監査計画と実施記録

1. 354保存stateのraw SHA256・正準JSONと4経路のgame/continuation hashを照合する。
2. 01-Aの通常行動を既存179で列挙し、01-Bの終了前responseは手札・盤上の対象と発動時点を確認する。
3. 02-A/Bは既存の終了条件と現在までのevent/snapshot/hash鎖を確認し、現盤面の能力なし・発動時点を分類して6段階の終了集合を監査する。
4. 専用テストRED→GREEN、生成JSON・報告・README・計画を保存し、remote HEAD/treeとPR #259を再確認する。

新event0、独立balance標本0。全proxy回帰とCI成功は未確認。
