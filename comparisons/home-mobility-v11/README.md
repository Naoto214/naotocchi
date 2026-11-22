# なおとっち　ホーム移動 VERSION 11

[本人限定で試す](https://naotocchi-cast-size.kerzion214.chatgpt.site/v11/) ／ [通知時の足元を再現](https://naotocchi-cast-size.kerzion214.chatgpt.site/v11/replay.html) ／ [森の歩行地図](https://naotocchi-cast-size.kerzion214.chatgpt.site/v11/space.html) ／ [Draft PR #581](https://github.com/Naoto214/naotocchi/pull/581)

V9・V10・V11を切り替えると、同じ地域・時間帯・人数・乱数でホームを開き直す。森の28体では、「設定」で通常の初期配置とV9の配置案を選べる。V11の「足元の修正のみ」と「足元と目的地選択」は同じレンダラーを使う。各住民が経路を得られなかった時間と、本人が休息や会話を選んだ時間は、本人用の記録画面で区別する。

パンダの再現ページでは、当時の320px幅の森と28体の足元を復元し、パンダを表示する要素を実際に差し替える。森の地図は10分試験で記録した足位置から、各住民がその瞬間に安全に進めた方向を表示する。

## 再現方法

基準はPR #580 の `ed671e26f5599cebf5aa1a8020d50a5f43dbf076`。そこから生成した完全な試遊版を `V10_DIST` に指定する。ビルド時に元の4,016ファイルのSHA-256を照合する。ゲーム本体に比較画面を追加する手順は含まれない。

```sh
node comparisons/home-mobility-v11/build.cjs "$V11_DIST" --baseline "$V10_DIST"
MOBILITY_GAME="$V10_DIST/game" MOBILITY_V10_DIST="$V10_DIST" node --test comparisons/home-mobility-v11/*.test.mjs
python -B comparisons/home-mobility-v11/verify-protected.py --game "$V11_DIST/game" --arm v11 --out /tmp/v11-regression.json
```

検証用ゲーム内の乱数に加え、実際のフレーム・通知時刻が次の住民の判断に影響する。通常再生の記録、同じ世帯状態・入力にそろえた再生、描画する姿勢を固定した測定をそれぞれ保存した。歩行は実際に足元が進んだ距離で評価する。
