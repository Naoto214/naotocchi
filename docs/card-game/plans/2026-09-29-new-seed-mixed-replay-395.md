# 395 混合4経路の応答・たまご交換・通常行動

1. GitHub保存394のraw SHA256と4経路の前game/continuation hashを照合。
2. 01-A終了前応答、01-B turn_start連鎖中応答、02-B必須たまご交換、02-A通常行動を完全列挙しstable IDと除外理由を保存。
3. 01-A/01-Bの唯一pass、02-Bの116 seeded fallback交換、02-Aの107・114有料候補対passを適用。
4. 専用テストRED→GREEN、正準JSON、event/snapshot各4と前後hashを検証してGitHub保存。

全proxy回帰・CI成功は未確認。独立balance標本0。
