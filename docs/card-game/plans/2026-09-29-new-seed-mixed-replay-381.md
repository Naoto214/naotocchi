# 381 新seed混合4経路の候補監査・選択再生計画と実施記録

1. 380の保存stateのraw SHA256と4経路の前後game/continuation hashを照合する。
2. 01-Aの配置後responseと01-B／02-A／02-Bの通常行動を、盤上源・占有枠・stable ID・除外理由ごとに監査する。
3. 01-Aの唯一pass、01-BのW-countryside／I-poop1対pass、02-Bのメイン誕生対pass、02-AのC-box無料配置対有償2件を既存107/114/116で選択・適用する。
4. 専用テストRED→GREEN、監査・再生正準JSON一致、event/snapshot各4と前後game/continuation hashを検証する。
5. README・報告・計画・専用テスト・生成JSONを作業ブランチへ保存し、remote HEAD/treeとPR状態を再取得する。

全proxy回帰・CI成功は未確認。独立balance標本0。次は新stateの4局面を監査する。
