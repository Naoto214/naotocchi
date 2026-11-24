# VERSION 5 本人比較の再現

完全なリポジトリを比較PRのコミットでチェックアウトし、リポジトリ直下から実行します。出力先には空のディレクトリを指定します。

```sh
node --test comparisons/home-beauty-v5/*.test.mjs
node comparisons/home-beauty-v5/build.cjs /tmp/naotocchi-home-v5 --fresh
python3 -m http.server 8195 --bind 127.0.0.1 --directory /tmp/naotocchi-home-v5
```

`http://127.0.0.1:8195/` で比較ページが開きます。`--fresh` は公式Pagesの許可リストにある素材を `game/` へ複製します。ビルドは比較用の複製にだけ描画フックを加え、一時セーブをメモリー内に作ります。同じ公式版の素材を配置済みの作業環境では `--fresh` を省略できます。

前版は、もり・うみ・ゆきぐに・とかい・きおくのみずうみがD3、ほか8地域が正式ホームの描画です。8地域の比較では、正式コードから原文のまま抽出した7点のアクセントと正式CSS粒子を使います。左右比較では既存の窓などのクリップに左側の境界を重ね、住民は各1体だけ描画します。照明と接地影は足元のある側の方式に従います。切替と分割は住民の座標を変更しません。

`/game/index.html?region=home&variant=E3&season=winter&time=night&weather=snow&count=4&clock=11&compareSplit=1&split=.5` は、同じ住民4体を残し、原画上の演出時刻を11秒で固定して、左に前版、右にE3を表示します。凍結されるのは演出時間です。通常速度のホーム時間、自律行動、フェードはそのまま進行します。E3の強度・個別スイッチは、8地域の正式版の粒子・アクセントを変更しません。
