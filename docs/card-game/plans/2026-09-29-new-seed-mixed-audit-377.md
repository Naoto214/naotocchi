# 377 新seed混合4経路の候補監査計画と実施記録

1. remote 376のHEAD/tree、PR Draft・open・未マージ、保存JSONのraw SHA256を照合する。
2. 保存stateの4経路で現在actor・源領域・盤上カード本文と候補IDを分類する。01-Bではturn_player=Aを採用し、C-chickenの開始時能力を遡及させない。
3. 01-Aのresponse、01-Bの通常行動、02-A/Bの必須たまご交換を既存候補列挙器で検査する。前後game/continuation hashを保存stateと照合する。
4. 専用テストRED→GREEN、正準JSON一致、event/snapshot新規0を確認する。
5. README・報告・計画・専用テスト・生成JSONを作業ブランチへ保存し、remote HEAD/treeとPR状態を再取得する。

全proxy回帰・CI成功は未確認。独立balance標本0。次の選択と遷移は既存契約で一意に進む範囲をまとめる。
