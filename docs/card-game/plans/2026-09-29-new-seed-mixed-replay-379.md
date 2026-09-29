# 379 新seed混合4経路response監査・再生計画と実施記録

1. 378保存stateのraw SHA256と4経路の前後game/continuation hashを照合する。
2. 各responseで手札・盤上の源領域、時点、本文、除外理由を確認し、stable IDを列挙する。
3. 唯一候補response-passを4経路へ適用する。
4. 専用テストRED→GREEN、監査・再生の正準JSON一致、event/snapshot各4とhash連鎖を検証する。
5. README・報告・計画・専用テスト・生成JSONを作業ブランチへ保存し、remote HEAD/treeとPR状態を再取得する。

全proxy回帰・CI成功は未確認。独立balance標本0。次は新stateの通常行動とresponseを監査する。
