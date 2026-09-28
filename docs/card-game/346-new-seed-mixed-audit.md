# 346 新seed混合4経路のresponse候補監査

[346計画](plans/2026-09-28-new-seed-mixed-audit-346.md)。[345保存state](data/proxy-new-seed-mixed-replay-345-20260928.json)のraw SHA256 `43af5f0efa55cc3b0bd8b74fed9f0bfd062cfcce7b1e061b88645ce2452c7b70`と正準JSON、4経路のgame/continuation hashを照合した。

01-AはE-first-date起動域の未解決状態、01-B/02-Bは配置後response、02-Aは開始時responseとして別々に候補を監査した。各経路の候補は唯一の`response-pass`。E-bossは339→342→345の手番境界で自分のメインの現手番敗北がないことを確認した。起動域の効果は未解決。新event0、completed0、独立balance標本0。

次は唯一passの選択・適用・次局面監査。全proxy回帰とCI成功は未確認。
