# VERSION 4 比較ページのローカル再現

基準は正式ホームを含む main のコミット `38b4e9d0`。比較PRの完全なチェックアウトで、リポジトリ直下から以下を実行します。出力先には空のディレクトリを指定してください。

```sh
node --test comparisons/home-beauty-v4/*.test.*
node comparisons/home-beauty-v4/build.cjs /tmp/naotocchi-v4-dist --fresh
python3 -m http.server 8194 --bind 127.0.0.1 --directory /tmp/naotocchi-v4-dist
```

`http://127.0.0.1:8194/` が比較画面です。`--fresh` は正式Pagesのallowlistから素材を複製し、コピー側だけに比較描画器とメモリー内の一時セーブを組み込みます。HTML・CSS・操作パネルも同じビルドで用意します。既に同じ基準版の配信素材が `dist/game` にある環境では `--fresh` を省略できます。

画素比較では、例えば `/game/index.html?region=sea&time=evening&variant=E3&clock=5&compareSplit=1&split=.5` を使います。演出の時計を5秒で固定し、同じ画面の左側にD3、右側にE3を描きます。住民は1組だけで共通の移動V5と時間を使います。速度は本編のモデル更新と演出時間に適用します。視差効果を減らす設定では、各描画器が静止時の表示を使います。

本人限定の配信パッケージは容量に合わせ、従来の比較サイトと同じく、独立したカードゲームの拡大カード原画452点だけを同じmainコミットの原本から必要時に読み込む。海・森の背景、住民、装備、音楽は同梱する。配信コピーを公式allowlistのGit blobと照合し、3,863ファイルの同一性を確認した。差分の5ファイルは比較用の入口・ホーム描画接続・初期化・カード拡大原画の参照先。ゲームリポジトリの正式ファイルはこのPRで編集しない。

旧D3の照合には #563 の `5363cd8f` を別ディレクトリで配信する。例えば両方のサーバーが起動中で、Python・Playwright・NumPy・Chromiumが利用できる環境では次を実行する。

```sh
python comparisons/home-beauty-v4/verify_reference.py http://127.0.0.1:8193 http://127.0.0.1:8194 /tmp/v4-reference.json
python comparisons/home-beauty-v4/verify_sea_strength.py http://127.0.0.1:8194
```
