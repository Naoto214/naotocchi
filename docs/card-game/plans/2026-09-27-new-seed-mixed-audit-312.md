# 312 横断監査計画と実施記録

1. 311保存state・294のターン終了証拠のraw/canonical・境界hashを照合。
2. 01-A/02-Aの通常行動を既存210の12完全性検査で監査。
3. 01-Bの294〜311履歴を全event/snapshot/hashで継ぎ、既存6段階契約でターン終了を再証明。
4. 02-Bの必須たまご交換候補を116 seeded fallback契約で完全列挙。
5. 専用テストRED→GREEN、canonical JSON一致、README・報告・計画・専用テスト・生成JSONをGitHub保存しremote HEAD/tree・PR #259を確認。

実施：通常行動2件各3候補、必須終了1件、たまご交換8件。独立balance標本0。
