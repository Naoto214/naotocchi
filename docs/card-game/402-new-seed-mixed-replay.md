# 402 Aの4ターンをまとめて再生

[402計画](plans/2026-09-30-new-seed-mixed-replay-402.md)。401保存state raw SHA256 `78840ee72e3ab907c79cfa74869a52e8d0d633a071850efe38da2bf59e209cdb`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-402-20260930.json) raw SHA256 `68961372f3d1e7cf9ed39926e2e0e412b1b5c734cd8d4ca2292c3616f4877508`。[保存state](data/proxy-new-seed-mixed-replay-402-20260930.json) raw SHA256 `c9ab8f8515a1baa4823e088d488b35835809bbd619673e6ed268044f0f21ec2e`。

| 経路 | 再生内容 | 次局面 |
| --- | --- | --- |
| 01-A | Aの交換、開始時2応答、通常pass、終了前pass、六段階終了・Bドロー（7 event） | seq135、R8、Bのたまご交換 |
| 01-B | Aの交換、開始時2応答、通常pass、終了前pass、六段階終了・Bドロー（7 event） | seq144、R9、Bのたまご交換 |
| 02-A | Aの交換、開始時2応答、通常pass、終了前pass、六段階終了・Bドロー（7 event） | seq129、R8、Bのたまご交換 |
| 02-B | Aの交換、開始時C-chickenのseeded起動、2応答・能力解決、通常pass、終了前pass、六段階終了・Bドロー（9 event） | seq143、R9、Bのたまご交換 |

必須交換は116 seeded fallback。C-chicken/passの比較は既存応答fallbackを最後まで評価した。通常行動は全合法候補を列挙し、107・114の確定時残量比較でpassを一意に確定、116は不要と記録した。P-anglerfishは既存156・391の盤上能力分類scopeを再利用した。E-fateful-transformは既存166のメイン不在条件で除外。実遷移のturn_start、盤上と手札、通常行動主体を保持した。

新decision21、event/snapshot各30、completed0、独立balance標本0。専用2テストRED→GREEN、監査/再生の正準JSON、全中間event/snapshotと前後game/continuation hash連鎖、六段階終了を確認した。次のBの交換候補も完全列挙済み。過去state/hash、カード本文・数値・登録区分・保護対象は非変更。

全proxy回帰は401の安全区切りで開始したが、この保存時点では実行中で完了結果未取得。CI成功は未確認。既知117期待190/実際263、119/120設計データ件数、112 catalog参照問題を新規failureと区別する。403へ続行する。
