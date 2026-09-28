# 357 新seed混合4経路の再生計画と実施記録

1. 356選択・355監査・354保存stateのraw SHA256、正準JSON、各経路境界を再照合する。
2. 01-Aは既存の時0 C-box配置を適用。01-Bは終了前response-passから`turn_end`へ復帰。02-A/Bは6段階で証明済みの終了と次手番ドローを既存手順で適用する。
3. event/snapshot計6組、連続した前後game/continuation hash、正準JSONを専用テストRED→GREENで検証する。README・報告・計画・専用テスト・生成JSONをGitHub保存してremote HEAD/treeとPR #259を再確認する。

独立balance標本0。全proxy回帰とCI成功は未確認。
