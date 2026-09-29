# 382 新seed混合4経路response監査・再生計画と実施記録

1. 381保存stateのraw SHA256と4経路の前後game/continuation hashを照合する。
2. 各responseで手札・盤上源、時点、除外理由を確認し、stable IDを列挙する。
3. 唯一候補response-passを4経路へ適用し、うち2経路のターン終了responseを閉じる。
4. 専用テストRED→GREEN、監査・再生の正準JSON一致、event/snapshot各4とhash連鎖を検証する。
5. README・報告・計画・専用テスト・生成JSONを作業ブランチへ保存し、remote HEAD/treeとPR状態を再取得する。

全proxy回帰・CI成功は未確認。独立balance標本0。次は2経路の六段階終了証明と残り2局面を監査する。
