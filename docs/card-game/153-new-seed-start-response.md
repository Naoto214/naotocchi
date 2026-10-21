# 153 新seed開始時responseの再開

[153 TDD計画](plans/2026-09-25-new-seed-start-response-153.md)に従い、152保存JSONのraw SHA・再生成・state/hashを検査して3経路を独立再開した。119/138/142の候補選択とresponse遷移を使い、盤上C-chicken/C-batは72本文と144 trigger分類から当該たまご交換eventには誘発しないことを確認した。過去の停止証拠とカード本文は変更していない。

| 経路 | 開始seq | 新event | 最終seq | 現在地 |
|---|---:|---:|---:|---|
| probe-01-a-first | 12 | response-pass ×2 | 14 | 通常行動入口 |
| probe-01-b-first | 12 | response-pass ×2 | 14 | 通常行動入口 |
| probe-02-b-first | 9 | G-hit-blow起動＋response-pass | 11 | BのI-c_coin2選択済み、起動直前 |

02-BではAのG-hit-blow「なかま」宣言を116 response seedで選び、連鎖中の次priorityでBのI-c_coin2が合法になった。Bは`response_seeded_fallback`でその現物を選択した。77本文は山札公開と条件分岐を定めるが、この連鎖でのI-c_coin2起動・解決handlerは未接続なのでeventを捏造せず、seq11のstate/hashで真正停止した。次に本文と既存119/142から一般handlerを監査する。

新decision7、event/snapshot各6、completed0、独立balance標本0、カード本文・数値・登録区分変更0件。全event seq、game/continuation hash連鎖、canonical bytes一致、専用2件PASS、設計データerrors空を確認。全proxyは実行中で結果未確定。
