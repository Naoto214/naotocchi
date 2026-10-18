# 165 TDD計画：次手番4経路のたまご交換

164のraw SHAと再生、交換入口state/hashを確認する。既存116/117の完全合法集合とseed contextを用い、4経路の現在手札（7または8枚）からたまご交換で戻す1枚を選び、山札下へ移す。R1/R2のラウンド値は保存stateから取り、選択候補を特定枚数へ固定しない。交換の後、01に従う開始時誘発／response窓を作り、C-chickenの能力処理を先取りしない。

REDは4 decision/event/snapshotと破損拒否の専用2テスト。GREENでは保存原本、event seq、dual hash、seed proof、canonical bytesを検証する。seeded fallbackを使った経路は完走しても独立balance標本0のまま。
