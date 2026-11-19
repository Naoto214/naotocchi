# 28体のホームで標準サイズの上限を比べる

基準は #570 で採用した主人公120%・恋人120%・仲間105%。追加倍率は3役に同じ比率で一度だけ掛ける。幅320・375・390・430の縦画面で、13地域と1・4・10・20・28体を比較する。既存のV2試遊とゲーム本体は以前のURLで利用できる。

[本人限定で試遊する](https://naotocchi-cast-size.kerzion214.chatgpt.site/v3/) ／ [森の28体を等倍で見比べる](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/forest-limit.webp) ／ [13地域・4幅の判定表](LIMITS.md)

| 試作 | 追加倍率 | 主人公・恋人 | 仲間 |
|---|---:|---:|---:|
| 現行 | 0% | 120% | 105% |
| A | 5% | 126% | 110.25% |
| B | 10% | 132% | 115.5% |
| C | 15% | 138% | 120.75% |
| D | 20% | 144% | 126% |

「設定」→「V2の配置」では、その場で倍率を変えても足の位置が変わらない。「固定」で住民を止めれば、同じ表情・立ち位置で比較できる。「サイズ別の配置」では、V5の歩行可能領域と接触判定に候補の初期位置を渡す。倍率の切替時は同じ住民を読み直す。比較対象の原画・装備・環境は共通で、右上の84%切替はV2で廃止した状態を使う。

主人公と恋人の違いを見比べるには、設定の「住民の実寸」で本体の幅と高さを確認できる。仲間は中央値と一人ずつの実寸を表示する。静止した状態を確認したあと「再生」で歩き始め、住民をタップまたはドラッグできる。[28体のみずべ](https://naotocchi-cast-size.kerzion214.chatgpt.site/v3/?region=river_lake&count=28&time=day&extra=20&layout=fixed&paused=1) ／ [4体のとかい・サイズ別配置](https://naotocchi-cast-size.kerzion214.chatgpt.site/v3/?region=city&count=4&time=day&extra=20&layout=optimized&paused=1)

各条件の初期・自律移動後の[本体サイズと輪郭](GEOMETRY.md)、[初期配置の選定](PLACEMENT.md)、[大きさを現行にそろえた配置比較](LAYOUT-ONLY.md)、[タップとドラッグ](interaction.md)、[通常再生時の処理時間](PERFORMANCE.md)、[既存成果物の保護](PROTECTION.md)を個別に記録した。

## 画面の余白と歩ける範囲

森の28体で、ゲーム画面の8 CSS px格子それぞれに主人公の足を置けるか、V5の境界・地形・視認性の判定を照合した。320×568の試遊画面（ゲーム部分は高さ516px）では2,560地点中93地点が通り、通った足元はゲーム内の上端から188〜236pxにあった。390×844（ゲーム部分792px）では4,851地点中688地点、196〜508pxだった。この数は他の住民を避ける経路の有無までは含まない。320px幅の森に余白が見えても、現在のV5ではその手前の芝生へ初期配置を移せない。可動域・背景原画は維持した。将来この帯を見直す場合は、背景の投影、地形、指からゲーム座標への変換を一緒に確かめる必要がある。[地形判定の生データ](evidence/ground.json)

13地域の画面内で実際に足を置ける帯、原画に占める住民の面積、カメラ投影の違いは[足元と画面の余白](FOOTPRINT.md)にまとめた。

## 再現方法

#569の保存コミット `28628cf336a8ed92efe4e9e197ca03298b798a1e` の完全なチェックアウトを用意し、#570のV2保存コミット `7e0a8cd6a506142fbe65b9ca6fd4ff4f855d4e9a` のビルドから再生成する。出力には別々の空ディレクトリを使う。

```sh
node comparisons/home-cast-size-v1/build.cjs /tmp/cast-v1 --reference-checkout ../leaf-reference
node comparisons/home-cast-size-v2/build.cjs /tmp/cast-v2 --baseline /tmp/cast-v1
node comparisons/home-cast-size-v3/build.cjs /tmp/cast-v3 --baseline /tmp/cast-v2
node --test comparisons/home-cast-size-v3/*.test.*
python -m http.server 8303 --bind 127.0.0.1 --directory /tmp/cast-v3
```

ローカルでは `/v3/` を開く。13地域の測定用ワークフローは、比較試作のブランチで明示的に測定を指示したコミットで起動する。保存する成果物は座標、輪郭、入力などの数値記録。試遊の利用範囲は所有者に限定する。

同じ足位置で輪郭と採用目安を再計算する場合は、[340件のブラウザー生記録](evidence/geometry-fixtures.tar.gz)を展開する。原画・試遊画面の画像はこのアーカイブに含めていない。Pythonに Pillow、NumPy、Playwright を用意し、上で生成したゲームとV3のスクリプトを使う。生記録の版は[配置コードと初期位置のハッシュ](evidence/geometry-sources.json)で照合できる。

```sh
trial=comparisons/home-cast-size-v3
mkdir -p /tmp/cast-poses /tmp/cast-reports
tar -xzf "$trial/evidence/geometry-fixtures.tar.gz" -C /tmp/cast-poses
python "$trial/geometry_digest.py" /tmp/cast-poses/fixed /tmp/cast-poses/optimized /tmp/cast-v3/game /tmp/cast-reports
python "$trial/verify_interact_matrix.py" --fixed /tmp/cast-poses/fixed --groups /tmp/cast-poses/optimized --game /tmp/cast-v3/game --require-complete --out /tmp/cast-reports/input-matrix.json
python "$trial/evaluate_limits.py" /tmp/cast-reports/geometry-matrix.json /tmp/cast-reports/input-matrix.json /tmp/cast-reports/limits.json /tmp/cast-reports/LIMITS.md
```
