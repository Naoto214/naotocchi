# 160 新seed3通常行動再開 TDD計画

1. 159候補監査と158現在stateをそれぞれcanonical再生成で照合する。
2. RED: 01-A/B/02-Bのpassとターン終了前response入口、02-Aターン終了入口保持を先にテストする。
3. 01-Aは既存107/114の時残高比較で有償M-antlionたんじょうとpassを再評価。他の2経路は唯一のpassとして決定する。現物IDによる選択分岐を作らない。
4. 既存通常pass遷移で各decision/event/snapshotを1件作りdual SHAとcanonicalを確認。次のresponse候補と02-Aターン終了は未到達として停止する。
5. 専用・設計・全proxy固定snapshot・diffを検証してGitHubへ保存する。
