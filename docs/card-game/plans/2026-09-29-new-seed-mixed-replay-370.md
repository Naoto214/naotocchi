# 370 新seed混合4経路の再生計画と実施記録

1. remote 369のHEAD/treeとPR #259、369選択・366保存stateのraw SHA256を確認する。
2. 専用テストRED→GREEN。01-Aは357の終了前pass、01-Bは348のturn_start連鎖最初のpass、02-A/Bは290の通常passを適用する。起動域を通常行動用zone検証に通さない。
3. 4経路のevent/snapshot、前後game/continuation hash、正準JSONを検証し、README・報告・計画・テスト・生成JSONを保存する。
4. 次局面を監査する。既存正本で一意に選べる限り継続する。

全proxy回帰とCI成功は未確認。独立balance標本0。
