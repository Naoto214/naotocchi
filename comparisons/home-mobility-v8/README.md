# なおとっち・ホームの移動と描画 VERSION 8

[本人限定で森・28体を開く](https://naotocchi-cast-size.kerzion214.chatgpt.site/v8/?arm=v8&region=forest&count=28&time=day)

V6・V7・V8を切り替えると、同じ背景、同じ28体、同じ初期位置に戻る。「最初から」で同じ版を再生し直せる。「設定」で13地域・4時間帯・1〜28体を選べる。

森で「設定 → 住民の移動記録 → 移動を記録する」を開き、タヌキなど観察したい住民を選ぶ。歩行指示の件数、実際の最初の一歩、到着、近くの住民、重なり、道譲りを個体別に確認できる。記録は開始した時点から集計する。病気や会話などでホームの進行が止まった時間も表示する。退避歩行の合計には従来の8〜24pxの退避、短い退避、道譲り後の退避を含む。

## 検証記録

- [比較結果と採用判断の材料](RESULTS.md)
- [足元からの退避・順次道譲りの再現手順](MOVEMENT.md)
- [28体のタッチ試験の再現手順](TOUCH.md)
- [比較用ゲームの構成と各ファイルのハッシュ](evidence/package.json)

基準はDraft PR #576の `e1f4a743684ce4ce8760a713d309483cedb9c50f`。ローカルで比較する場合は、そのコミットから生成した配布ディレクトリを指定する。

```sh
node comparisons/home-mobility-v8/build.cjs /tmp/naotocchi-v8 --baseline /tmp/naotocchi-v7
python -m http.server 8388 --bind 127.0.0.1 --directory /tmp/naotocchi-v8
```

ブラウザーで `http://127.0.0.1:8388/v8/` を開く。試遊設定と診断表示はこの比較ページで使用する。
