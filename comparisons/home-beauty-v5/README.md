# なおとっち　ホーム美観 VERSION 5

[本人限定の13地域比較](https://naotocchi-home-e3-atlas.kerzion214.chatgpt.site/)。上部で地域を選び、「分割比較」を押すと左に旧版、右にE3を表示する。境界はドラッグと矢印キーで動かせる。住民と時計は左右で共通。設定の「見どころの条件で再生」で下表の季節・天気・時間に戻せる。

旧版は、うみ・もり・ゆきぐに・とかい・きおくのみずうみが [#563のD3](https://github.com/Naoto214/naotocchi/commit/5363cd8fefa15f8aed93fc403203198d295ac923)、ほか8地域が [正式ホーム](https://github.com/Naoto214/naotocchi/commit/38b4e9d0c8ed4cacdfc1cc6c072a7a9e62e5c053)。うみ・もりの右側には [#566のE3](https://github.com/Naoto214/naotocchi/commit/726fa9e4943a361be0a2d4115548dd5c3f7561a4) を使用する。同地域でD3とE3を並べることで、これまでの採用候補をいつでも確認できる。

## 13地域の見どころ

|地域|開始条件|見る場所|
|---|---|---|
|[おうち](https://naotocchi-home-e3-atlas.kerzion214.chatgpt.site/?region=home&time=evening&season=autumn&weather=rain&variant=E3&compareSplit=1)|秋・夕・雨|中央の窓を伝う雨と、室内の木床に届く光。家具の輪郭と壁は固定。|
|[もり](https://naotocchi-home-e3-atlas.kerzion214.chatgpt.site/?region=forest&time=day&season=summer&weather=sunny&variant=E3&compareSplit=1)|夏・昼・晴|風が森の16か所を順に抜け、枝葉・木漏れ日・林床の陰影が呼応する。#566のE3。|
|[みずべ](https://naotocchi-home-e3-atlas.kerzion214.chatgpt.site/?region=river_lake&time=day&season=summer&weather=sunny&variant=E3&compareSplit=1)|夏・昼・晴|流れが岸と岩を避け、遠くの泡と手前の細い流線が異なる速度で進む。|
|[とかい](https://naotocchi-home-e3-atlas.kerzion214.chatgpt.site/?region=city&time=night&season=autumn&weather=rain&variant=E3&compareSplit=1)|秋・夜・雨|雨に濡れた舗装で店舗の暖色が揺らぐ。乾いた昼は同じ地面を光らせない。|
|[いなか](https://naotocchi-home-e3-atlas.kerzion214.chatgpt.site/?region=countryside&time=evening&season=summer&weather=sunny&variant=E3&compareSplit=1)|夏・夕・晴|あぜの草花を揺らす風と、夏の夕暮れに浮かぶ蛍。|
|[やま](https://naotocchi-home-e3-atlas.kerzion214.chatgpt.site/?region=mountain&time=morning&season=autumn&weather=cloudy&variant=E3&compareSplit=1)|秋・朝・曇|稜線の雲、右の谷を通る霧と斜面の陰影。山頂と手前の道は静止。|
|[ゆきぐに](https://naotocchi-home-e3-atlas.kerzion214.chatgpt.site/?region=snow&time=evening&season=winter&weather=snow&variant=E3&compareSplit=1)|冬・夕・雪|降雪に枝の揺れと風下の雪煙が重なる。家の窓から雪へ暖色がこぼれる。|
|[うみ](https://naotocchi-home-e3-atlas.kerzion214.chatgpt.site/?region=sea&time=evening&season=summer&weather=sunny&variant=E3&compareSplit=1)|夏・夕・晴|沖のうねりから浅瀬の泡まで同じ波が伝わり、夕日の反射と水底の光が変わる。#566のE3。|
|[ジャングル](https://naotocchi-home-e3-atlas.kerzion214.chatgpt.site/?region=jungle&time=day&season=summer&weather=rain&variant=E3&compareSplit=1)|夏・昼・雨|前後のシダとヤシに風が届き、葉先から遅れて水滴が落ちる。|
|[さばく](https://naotocchi-home-e3-atlas.kerzion214.chatgpt.site/?region=desert&time=day&season=summer&weather=sunny&variant=E3&compareSplit=1)|夏・昼・晴|砂丘の風下を流れる砂と遠景の陽炎。夜は原画に描かれた星が明滅する。|
|[しんかい](https://naotocchi-home-e3-atlas.kerzion214.chatgpt.site/?region=deepsea&time=day&season=summer&weather=sunny&variant=E3&compareSplit=1)|夏・昼・晴|岩棚から上る泡、水流に乗るプランクトン、砂地にゆらぐ水中光。|
|[ほしぞらのていりゅうじょ](https://naotocchi-home-e3-atlas.kerzion214.chatgpt.site/?region=star_stop&time=night&season=winter&weather=sunny&variant=E3&compareSplit=1)|冬・夜・晴|島と門を固定し、銀河の明暗と星の瞬きが変化。約60秒・180秒に空を流星が渡る。|
|[きおくのみずうみ](https://naotocchi-home-e3-atlas.kerzion214.chatgpt.site/?region=memory_lake&time=night&season=summer&weather=sunny&variant=E3&compareSplit=1)|夏・夜・晴|柳が揺れ、水面の輪が月光と樹影を細かく崩す。|

## 原画と条件の照合

装飾は正式ホームがその時間帯の原画を描く座標に合わせる。季節の違いは、草花・蛍の出現、流れの速さ、光の色や強さとして表す。天気は屋外の降水、屋内の窓ガラス、濡れた舗装など、その場所の素材に合わせて扱う。深海と宇宙では地上の降水を重ねない。52枚は地域ごとの朝・昼・夕・夜の原画で、季節を替えても絵に焼き込まれた植生や地形は同一である。

[川・家・田園のマスク](RIVER-HOME-COUNTRY.md) ／ [山・ジャングル・砂漠の位置合わせ](MOUNTAIN-JUNGLE-DESERT.md) ／ [雪国・都会・湖のD3からの変更](SNOW-CITY-LAKE.md) ／ [深海・星空の発光位置](DEEPSEA-STARS.md)

## 検証と適用範囲

[実際の比較画面](evidence/comparison-controls.jpg) ／ [住民1・4・28体の負荷と操作](QUALITY-V5.md) ／ [演出単体の描画費用と湖の最適化](COMPOSITOR-COST.md) ／ [3分間の実ホーム観察](DURATION.md) ／ [旧版の画素照合と832環境条件](evidence/paint.json) ／ [ローカルの起動方法](BUILD.md)

住民28体の長い停止は独立した課題として扱う。前回、うみの最長停止区間では住民モデル更新が約97%を占めた。今回の試作で移動・接触・会話を変更していない。森の植生やジャングルの池など、既存の座標のために足元が浮いて見える位置が残る。Linuxでのブラウザー計測と実機での表示・発熱は区別する。[前回の28体10分診断](https://github.com/Naoto214/naotocchi/blob/726fa9e4943a361be0a2d4115548dd5c3f7561a4/comparisons/home-beauty-v4/HITCHES.md)

本人限定の試遊は元のゲームとは別のオリジンで、比較用の初期データをメモリー内に作成する。本人限定サイトの容量に合わせ、従来と同様に独立カードゲームの拡大カード原画のみを同一mainコミットから必要時に読み込む。ホームの背景・住民・装備・音楽は同梱する。正式採用は本人判断後とする。
