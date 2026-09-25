# 155 新seed2リンク連鎖解決 TDD計画

1. 154保存JSONをraw SHA、canonical再生成、game/continuation hashで検証する。
2. RED: 02-Bで2回のresponse-pass、I-c_coin2を先に解決、G-hit-blowを後に解決し通常行動へ復帰、01-A/Bの保持を先にテストする。
3. 各priorityの候補を再列挙し、119の2回passと逆順解決を適用する。77本文でI-c_coin2の山札上公開→山下／メインなら+5、メイン以外なら1枚引く処理を検証する。142のG-hit-blow既存解決を外側リンクへ使用する。
4. 連鎖中の全event seq、before/after dual SHA、snapshotと公開情報境界を検査し保存。次checkpointで3経路の通常行動を現在stateから監査する。
