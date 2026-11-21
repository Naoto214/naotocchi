# なおとっち　ホーム移動比較 VERSION 9

[本人限定で森の28体を試す](https://naotocchi-cast-size.kerzion214.chatgpt.site/v9/) · [検証結果](RESULTS.md) · [実測データ](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/v9/)

V7・V8・V9のボタンで、同じ森・住民・初期位置から再生できます。「設定」で地域、時間帯、人数を選べます。「住民の移動記録」を開き「移動を記録する」を押すと、タヌキ、パンダ、箱を含む各住民の歩いた距離、経路成立率、経路が決まらなかった時間を確認できます。初期配置の比較案は設定から選びます。

## 何を測ったか

自律経路を歩き終えたとき、始点と終点が8 CSS px以上離れ、元の目標までの距離が0.75 CSS pxより多く縮んだ回数を数えます。退避・道譲り・通常歩行を区別し、版の違いで同じ動きの分類が変わる場合に備えて、実際の足取りだけで数え直した結果も残しました。休息・会話・選択画面でホームの時計が停止した実時間は別に記録します。

- [森の全住民と乱数別の結果](FAIRNESS.md)
- [通路の再現試験と待機中の再探索](MOVEMENT.md)
- [既存配置と比較配置の足元](SEATS.md)
- [全13地域のタッチ・安全性・保存復元](MATRIX.md)
- [同じ足取りの描画と、実際に暮らす28体の性能](PERF.md)

## 再現

基準は [Draft PR #578](https://github.com/Naoto214/naotocchi/pull/578) の `6b2e2a22ab3981ac748cc645f5f1f53ce91e4c64`。基準のゲームを構築したディレクトリを `V8_DIST` に指定します。ビルドは旧3,976ファイルのSHA-256を照合します。

```sh
node comparisons/home-mobility-v9/build.cjs V9_DIST --baseline V8_DIST
node comparisons/home-mobility-v9/verify-package.cjs V8_DIST V9_DIST package.json.out
MOBILITY_GAME=V8_DIST/game node --test comparisons/home-mobility-v9/movement.test.mjs comparisons/home-mobility-v9/seats.test.mjs
```

基準一式の構築から再現する場合は、[地域別ワークフロー](../../.github/workflows/home-mobility-v9-matrix.yml) に固定コミットとコマンドがあります。
