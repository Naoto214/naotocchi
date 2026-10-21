# 306 監査計画と実施記録

1. 305保存event/state/hashとraw/canonicalを照合。
2. 連鎖中・配置後・ターン終了responseの手札・盤上・こいびとを本文と照合。
3. 01-B通常行動を既存210の完全性契約で監査。
4. 専用テストRED→GREEN、canonical JSON一致、README・報告・計画・専用テスト・生成JSONをGitHub保存し、remote HEAD/treeとPR #259を再確認。

実施：response3局面は唯一pass、通常行動1局面は4候補。独立balance標本0。
