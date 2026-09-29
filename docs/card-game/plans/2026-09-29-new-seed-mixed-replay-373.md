# 373 新seed混合4経路の再生計画と実施記録

1. 372選択・371監査・370保存stateのraw SHA256と正準JSONを照合する。
2. 01-Aは339の証明済み終了と次手番ドロー、01-Bは351のturn_start連鎖2回目pass、02-A/Bは357の終了前passを適用する。
3. 専用テストRED→GREEN、event/snapshot・前後game/continuation hash・正準JSONを検証する。
4. README・報告・計画・テスト・生成JSONをGitHub保存し、remote HEAD/treeとPR #259を再取得する。次局面を監査する。

全proxy回帰とCI成功は未確認。独立balance標本0。
