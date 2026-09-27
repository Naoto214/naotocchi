# 320 再生計画と実施記録

1. 319選択・318監査・317保存stateのraw/canonical・境界hashを照合。
2. 2件の必須終了・次手番ドローと2件の唯一response-passを既存遷移器で適用。
3. 次手番の盤上能力をカード本文・発動条件で分類し、event/snapshot/hashを検証。
4. 専用テストRED→GREEN、canonical JSON一致、README・報告・計画・専用テスト・生成JSONをGitHub保存し、remote HEAD/treeとPR #259を確認。

実施：計6 event・6 snapshot。独立balance標本0。
