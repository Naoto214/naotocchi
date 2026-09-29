# 394 混合4経路の選択・終了監査と再生

1. GitHub保存393のraw SHA256と4経路の前状態hashを照合。
2. 01-Aの通常候補を既存381で完全列挙し、365・325のW-countryside費用証拠と107・114比較を適用。01-Bのturn_start連鎖中応答と02-Aの配置後次優先者応答を完全列挙。
3. 02-Bは既存375の六段階終了証明を393までのevent/snapshot/hash・成長履歴で延長し、次盤上源を分類。
4. 01-A通常pass、01-B/02-A応答pass、02-B終了・ドローを再生。専用テストRED→GREEN、正準JSON、event/snapshot各5のhash連鎖を検証してGitHubへ保存。

全proxy回帰・CI成功は未確認。独立balance標本0。
