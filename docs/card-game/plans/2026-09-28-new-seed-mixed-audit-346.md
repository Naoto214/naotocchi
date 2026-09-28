# 346 新seed混合4経路response監査計画と実施記録

1. 345保存stateのraw SHA256・正準JSON・各経路のgame/continuation hashを照合する。
2. 連鎖中の01-A、配置後01-B/02-B、開始時02-Aの手札・盤上・条件付き候補を監査する。E-bossは339→342→345の手番境界を照合する。
3. 専用テストRED→GREEN、生成JSON一致、README・報告・計画を保存しremote HEAD/treeとPR #259を再確認する。

新event0、独立balance標本0。選択と適用は後続チェックポイントで行う。
