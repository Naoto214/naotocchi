# 326 再生計画と実施記録

1. 325選択・324監査・323保存stateのraw/canonical・境界hashを照合。
2. 開始時response-pass2件、ターン終了response-pass1件、通常pass1件を適用。
3. 各event/snapshotの前後game/continuation hashを照合。
4. 専用テストRED→GREEN、canonical JSON一致、README・報告・計画・専用テスト・生成JSONをGitHub保存し、remote HEAD/treeとPR #259を確認。

実施：4経路に各1 event・1 snapshot。独立balance標本0。
