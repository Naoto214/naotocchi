# 人数に応じた2.5Dホームのサイズ比較

[最終比較と推奨案](RESULTS.md) ／ [28体の実測一覧](SIZE28.md)

[本人限定の試遊](https://naotocchi-cast-size.kerzion214.chatgpt.site/v4/)では、28体のみずべから始まる。「停止」を押して現行・A・B・Cを切り替えると、同じ住民の表情、奥行き、足の位置を保って大きさを比較できる。「設定」からもり・おうちにも直接移れる。各住民の本体寸法を読み取りたい場合は「現在の実寸を測る」を押す。

| 375px以上・28体 | 全員への追加 | 主人公・恋人 | 仲間 |
|---|---:|---:|---:|
| 現行 | 0% | 120% | 105% |
| A | 10% | 132% | 115.5% |
| B | 15% | 138% | 120.75% |
| C | 20% | 144% | 126% |

この役割別の値は、以前の正式ホームの実表示を100%とした値。主人公の元の描画倍率は基準画像にすでに含まれる。高さには原画の透明余白・奥行きが反映され、同じ120%でも主人公と恋人は違う大きさになる。[実際の1〜28体で確認した倍率と画面幅の境界](POLICY.md)

## 試遊の使い方

- 「同じ配置」では、現行・A・B・Cの切替がその場で反映される。「サイズ別の配置」では、同じ地域・時刻・住民で開始配置を再現する。再生中はどちらも正式ホームの歩行、接触回避、会話、タップ、ドラッグが動く。
- 人数は1〜28の整数で指定できる。1〜18体の追加は両方式とも0%。「段階的に拡大」では19体で目標の10分の1、その後1体につき10分の1ずつ増え、28体で目標に届く。「一度に拡大」では19体で目標に達する。
- 幅はホームの実際のビューポートをCSS pxで測る。320px以下では追加0%、375px以上では目標の全量。中間では幅の進みを `t = (幅 − 320) / 55` として、`t²(3 − 2t)` を追加分に掛ける。両端は傾き0でつながる。サイズを決めるのは人数と幅で、地域切替自体では倍率を変えない。
- 同じ28体をすぐに見比べられる。 [みずべ](https://naotocchi-cast-size.kerzion214.chatgpt.site/v4/?region=river_lake&count=28&time=day&variant=B&curve=linear&layout=fixed&paused=1) ／ [もり](https://naotocchi-cast-size.kerzion214.chatgpt.site/v4/?region=forest&count=28&time=day&variant=B&curve=linear&layout=fixed&paused=1) ／ [おうち](https://naotocchi-cast-size.kerzion214.chatgpt.site/v4/?region=home&count=28&time=day&variant=B&curve=linear&layout=fixed&paused=1)

18体から19体に増えたときの見え方を、同じもり・昼で比較できる。 [18体の現行](https://naotocchi-cast-size.kerzion214.chatgpt.site/v4/?region=forest&count=18&time=day&variant=current&curve=linear&layout=fixed&paused=1) ／ [19体・B段階式](https://naotocchi-cast-size.kerzion214.chatgpt.site/v4/?region=forest&count=19&time=day&variant=B&curve=linear&layout=fixed&paused=1) ／ [19体・B一律](https://naotocchi-cast-size.kerzion214.chatgpt.site/v4/?region=forest&count=19&time=day&variant=B&curve=step&layout=fixed&paused=1)

## 再現

基準はDraft #570 の `a6e257fef32ea2f0664b8c9fbed761f60ab63cb0`。V3までの試遊を作る手順は[前回の記録](../home-cast-size-v3/README.md)にある。既存のV3パッケージを入力にすると、照合後にV4専用ファイル11件を追加する。

```sh
node comparisons/home-cast-size-v4/build.cjs /tmp/cast-v4 --baseline /tmp/cast-v3
node --test comparisons/home-cast-size-v4/policy.test.cjs comparisons/home-cast-size-v4/shell.test.mjs
python comparisons/home-cast-size-v4/verify_protection.py /tmp/cast-v3 /tmp/cast-v4
python -m http.server 8304 --bind 127.0.0.1 --directory /tmp/cast-v4
```

[ブラウザー測定の手順と実行環境](../../.github/workflows/home-cast-size-v4-matrix.yml) ／ [既存資産と保存証拠の照合](PROTECTION.md)

[5地域の比較画像](VISUAL.md) ／ [全52枚の時間帯確認](DAYPARTS.md) ／ [固定・再配置の判断](PLACEMENT.md)
