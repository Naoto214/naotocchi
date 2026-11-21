# なおとっち　ホーム移動・公平性 VERSION 10

基準は [Draft PR #579](https://github.com/Naoto214/naotocchi/pull/579) の `be5db6804bf0bee872080bae49cb714f295a461b`。森28体でいったん歩いた住民が長く経路を得られないときの足元、進もうとした方向、周囲の住民が道を譲れる余地を調べる本人限定の比較です。

V8、V9、V10を同じ背景・名簿・時刻から比較します。初期配置の比較は森28体の新規開始で選択できます。「住民の移動記録」では歩行と道譲りを分けて観察できます。

[測定結果と採用判断の材料](RESULTS.md) ／ [V8・V9・V10の本人限定試遊](https://naotocchi-cast-size.kerzion214.chatgpt.site/v10/)

## 同じ条件で比較する

[森・28体・乱数937・V9の調整配置で開始](https://naotocchi-cast-size.kerzion214.chatgpt.site/v10/?arm=v10&region=forest&count=28&seed=937&seats=reference&time=day)では、上のV9・V10ボタンで同じ足位置から再開する。住民をドラッグするか、「設定」内の「住民の移動記録」で個体ごとの経路を追える。[従来の配置から開始](https://naotocchi-cast-size.kerzion214.chatgpt.site/v10/?arm=v10&region=forest&count=28&seed=937&seats=original&time=day)

[過去の犬の385秒](https://naotocchi-cast-size.kerzion214.chatgpt.site/v10/episode.html)ではV9で実際に出た78件の要求を順に確認できる。[個体別の10分記録](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/v10/forest.html)では測定時の幅・世帯・配置を選び、同じ住民の前半と後半を比較できる。

## 計測を再現する

試遊版のゲームデータの組み立てには、各段階のコミットを指定している。[連続再生のビルド手順](../../.github/workflows/home-mobility-v10-fairness.yml)が参照するV9の出力を使う。以下はリポジトリのルートから実行する例。

```sh
node comparisons/home-mobility-v10/build.cjs /tmp/naotocchi-v10 --baseline /tmp/naotocchi-v9
MOBILITY_GAME=/tmp/naotocchi-v9/game node --test comparisons/home-mobility-v10/*.test.mjs
python comparisons/home-mobility-v10/verify-source.py --game /tmp/naotocchi-v10/game --out /tmp/naotocchi-v10-legacy.json
```

[森の道譲り・元の目標・再探索](MOVEMENT.md) ／ [初期席・保存・入力](SEATS.md) ／ [13地域の操作試験](MATRIX.md) ／ [Linux WebKitの性能測定](PERF.md)
