# 275 新seed混合再生

[275計画](plans/2026-09-27-new-seed-mixed-replay-275.md)。274選択・273候補と272保存state/hashを照合し、各経路1件のevent/snapshotを[生成JSON](data/proxy-new-seed-mixed-replay-275-20260927.json)へ保存した。

01-Aは開始時responseの最初のpass、01-Bは終了前responseの2回目のpassでターン終了入口。02-AはAの手札ラッキーコインを時1で起動域へ移し、公開と効果は未実行。02-Bは閉じた別経路のラッキーコインを解決し、山札上のメイン`M-antlion-03`を公開して山札下へ移し、Aのそだちを+5、コインを捨て札へ移して通常行動入口へ戻した。公開情報は274の選択に用いず、解決処理内だけで参照した。

新decision3、新event/snapshot各4、game/continuation hash連結を確認。completed0、独立balance標本0。次は4経路の現在局面を横断監査する。全proxy回帰・CI成功は未確認。
