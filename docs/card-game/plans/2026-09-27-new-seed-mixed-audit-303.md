# 303 横断監査計画と実施記録

1. 302の保存JSON・state/hash・起動域を照合する。
2. 01-A/Bのresponse候補を手札・盤上・こいびと別に本文で照合し、C-chickenの起動中／相手手番の違いを保存する。
3. 02-A/Bの通常行動候補を既存の完全性契約で監査する。
4. 専用テストをRED→GREEN、canonical JSONを検証し、README・報告・計画・専用テスト・生成JSONをGitHubに保存する。保存後にremote HEAD/treeとPR #259を確認する。

実施：4経路の候補集合を確定。対戦進行なし。独立balance標本0。
