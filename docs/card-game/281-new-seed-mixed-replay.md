# 281 新seed混合局面再生

[281計画](plans/2026-09-27-new-seed-mixed-replay-281.md)。280の選択と278の保存state/hashを照合し、[再生JSON](data/proxy-new-seed-mixed-replay-281-20260927.json)に4経路4件のevent、snapshot、各前後hashを保存した。

01-AはBのC-cat_friendを配置して配置後response入口。01-BはA-020（W-city）を山札下へ交換し、開始response入口。02-AはBがpassし、起動域のI-c_coin2は未解決のまま連鎖解決入口。02-BはC-box配置後Aがpassし、次優先者のresponse入口。

C-cat_friendは自分のターンの起動能力であり、配置時効果を持たない。捨て札に能力対象もないことを確認し、再生時だけ既存proxyの配置対応表へ本文の分類を登録した。共有表は処理後に復元する。カード本文、278以前のstate/hash、保護対象は変更していない。

新event/snapshot各4、completed0、独立balance標本0。次は4経路の現在局面を監査する。全proxy回帰・CI成功は未確認。
