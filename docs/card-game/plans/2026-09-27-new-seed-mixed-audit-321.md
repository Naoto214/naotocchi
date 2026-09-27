# 321 横断監査計画と実施記録

1. 320保存stateのraw/canonical・event/state/hashを照合。
2. 2件の必須たまご交換を手札全件で列挙し、116 seeded fallbackを検証。
3. 01-Bの開始時responseと02-Bの通常行動候補を盤上・手札別に監査。
4. 専用テストRED→GREEN、canonical JSON一致、README・報告・計画・専用テスト・生成JSONをGitHub保存し、remote HEAD/treeとPR #259を確認。

実施：交換8件／10件、唯一response-pass1件、通常行動5件。独立balance標本0。
