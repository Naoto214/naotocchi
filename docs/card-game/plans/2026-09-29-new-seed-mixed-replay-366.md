# 366 新seed混合4経路の再生計画と実施記録

1. 365選択・364監査・363保存stateのraw SHA256、正準JSON、経路境界を照合する。
2. 01-Aの通常pass、01-Bの対象付きE-first-date開始時起動、02-A/Bの2回目の開始時response-passを既存手順で適用する。01-Bの連鎖中window_kindは`turn_start`、優先者は起動者A、効果は未解決で保持する。
3. event/snapshot各4件の前後game/continuation hashと正準JSONを専用テストRED→GREENで検証する。README・報告・計画・専用テスト・生成JSONをGitHub保存しremote HEAD/treeとPR #259を再確認する。

独立balance標本0。全proxy回帰とCI成功は未確認。
