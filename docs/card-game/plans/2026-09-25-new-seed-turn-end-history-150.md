# 150 新seedターン終了履歴出所 TDD計画

1. 149の保存JSONをraw SHAとcanonical再計算で保護する。135・138・141・145・147・148の保存済みraw SHAを照合する。
2. RED: 3ターン終了経路のevent/snapshot全seq、dual hash、成長100到達0、予約・期限付き効果0、分類不能0をテストする。
3. 各保存済み区間を最初から順に連結し、135のゲームSHAおよび138以降のgame/continuation SHAを再計算する。すべてのeventで成長・予約・activation/pendingを照合し、盤上C-chicken/C-batの本文を検査する。途中の成長100を最終stateから推定しない。
4. 保存JSONを検証し、全proxyと設計検査を実測。150ではターン終了はまだ実行しない。次checkpointで123/124の現在完全性・遷移へ接続する。
