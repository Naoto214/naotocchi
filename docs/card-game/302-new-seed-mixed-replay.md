# 302 新seed盤上能力起動・response再生

[302計画](plans/2026-09-27-new-seed-mixed-replay-302.md)。301選択、300監査、299保存state/hashのraw/canonicalを照合し、[再生JSON](data/proxy-new-seed-mixed-replay-302-20260927.json)へ4経路4件のevent/snapshotと前後hashを保存した。

01-Aは盤上C-chickenを時0で連鎖起動し、カードを盤上に保ったまま起動域にリンクを追加した。効果の山札公開・ドローは未解決。01-BはBの初回passでA優先の開始時responseへ。02-A/02-BはAの2回目passで応答窓が閉じ、通常行動入口へ進んだ。

新event/snapshot各4、completed0、独立balance標本0。次は01-Aの連鎖相手response、01-Bの次優先者response、02-A/02-Bの通常行動候補を監査する。全proxy回帰・CI成功は未確認。
