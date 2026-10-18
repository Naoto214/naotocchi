# 315 横断監査計画と実施記録

1. 314保存stateのraw/canonical・event/state/hashを照合。
2. 2件のターン終了responseと1件の開始時responseを手札・盤上・こいびと別に本文と照合。
3. 01-Bの必須たまご交換を116 seeded fallback契約で完全列挙。
4. 専用テストRED→GREEN、canonical JSON一致、README・報告・計画・専用テスト・生成JSONをGitHub保存し、remote HEAD/treeとPR #259を確認。

実施：response3局面は唯一pass、01-B交換は9候補。独立balance標本0。
