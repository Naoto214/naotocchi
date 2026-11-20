# なおとっち・住民の移動比較 VERSION 7

PR #575（`5db9835478eafe526271c6864e0c86ded6324172`）を基準にした本人限定試遊。V5・V6・V7で、同じ背景・住民・初期位置から自律移動とドラッグを比較する。設定の「住民の移動記録」で、個体ごとの移動・待機を追跡できる。

[森・28体の本人限定試遊](https://naotocchi-cast-size.kerzion214.chatgpt.site/v7/?arm=v7&region=forest&count=28&time=day) ／ [原因、比較結果、個体別ログ](RESULTS.md)

## ローカルで再現する

基準版からのビルド手順と各リポジトリの固定コミットは[全13地域の検証ワークフロー](../../.github/workflows/home-mobility-v7-matrix.yml)にある。#575の配布物を用意した環境では、次の操作で同じ試遊版を別ディレクトリに作れる。

```sh
node comparisons/home-mobility-v7/build.cjs /tmp/naotocchi-mobility-v7 --baseline /path/to/drag-v6-dist
python -m http.server 8377 --bind 127.0.0.1 --directory /tmp/naotocchi-mobility-v7
```

ブラウザーで `http://127.0.0.1:8377/v7/` を開く。ビルドは基準版3,948ファイルのハッシュと出力先を検査する。ゲーム本体の配布先とは独立している。
