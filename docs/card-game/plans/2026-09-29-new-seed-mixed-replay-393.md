# 393 開始時・配置後応答の監査と適用

1. 392保存state raw SHA256と4経路の前状態hashを照合。
2. 01-Bの開始時、02-Aの配置後を現在stateから合法候補・stable ID・除外理由まで列挙。391の起点eventを照合して、392で保持した局面の誘発時機を確認。
3. 01-Bは107・114・116の応答選択を最後まで適用し、02-Aは唯一passを適用。01-A通常行動・02-Bターン終了はstateを維持して次監査へ。
4. 専用テストRED→GREEN、正準JSON、event/snapshot各2と前後hashを検証してGitHubへ保存。

全proxy回帰・CI成功は未確認。独立balance標本0。
