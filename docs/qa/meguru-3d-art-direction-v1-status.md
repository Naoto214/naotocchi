# めぐる 3D Art Direction v1 — status(正本・2026-10-01)

branch `feat/meguru-3d-art-direction-v1`(`feat/meguru-3d-foundation-v2` @ `cbafd678` に stacked。v2 は そのまま checkpoint)。
**main へ merge しない・Ready に しない・Human QA 待ちで 停止。3D は `?meguru3d=1` の ときだけ(default 2D)・save / schema 不変。**
Foundation v2(あたり / reachability / Water v2 の geometry / corridor 3D / 意味の 表)は かえない。

原則だけ(明るい 友だちの 箱庭・まるい シルエット・自然 と 人工物の まざり・花 / しげみ / 小物・遠景・読める いろ・小さな 世界の 比率)。
特定の 作品の キャラクター・建物・家具・UI・模様・asset・配置は コピーしない(test AD-18 で 名まえも 禁止)。

## checkpoint

| CP | 内容 | 状態 | commit |
|---|---|---|---|
| AD-CP1 | 光 / palette / Tree v3(広葉樹 / 針葉樹 / ジャングル / ヤシ) | done | `d7f7dccb` |
| AD-CP2 | scene dressing(群生 + 余白・道ばたの 帯・川岸の 帯) | done | `1831a73b` |
| AD-CP3 | Building v3 + city scene + いけがき + 小物(自販機 / 自転車) | done | `1831a73b` |
| AD-CP4 | 水の 統合(川の 曲がり / はば / 岸)・Bridge v3・さばく・比率・テスト AD-1〜18 | done | `9269b3d1` |
| AD-CP5 | 13 地域 横展開・density gate・Human QA gate 記録・画像・sheet・smoke・PR | done | (この commit) |

## 共通 system(地域の switch は ふやさず、原型 と profile で)

- **光 / いろ**: hemisphere 1.7 / sun 1.0 / ambient 0.3(昼は 明るく)。岩 / がけの material は 明るめ(`#c4c1b8`)。葉は `REGION3D[rid].foliage`(crown 3 段 / conifer 3 段)を 白い material × instance color で
- **Tree v3**(`parts3d`): 広葉樹 = ほそる 幹 + かんむり 2〜5(非対称・高さ差・明 / 中 / 暗)、針葉樹 = 4〜5 段(下ほど ひろく・先 ほそく・段ごとの 明暗・個体差)、ジャングル = 高い canopy + 大きな は + つる + 根もとの 下草 + lowPoly、ヤシ = 黄緑の は 5〜8(放射状・はばは 長さに 比例・170 まで)+ 曲がる 幹 2 段
- **scene dressing**(`sceneDressing3d`・3D だけ・あたり なし・ふんで とおれる): 群生(2〜8)× 意図した 余白。前景 = 道ばたの 帯(通行帯 + 36〜106・左右 交互・余白 3 割)、中景 / 遠景 = 300 の ます目(`empty`)、川岸 = 水ぎわ 8〜70。種類 と いろは `REGION3D[rid].cover`(flowers / grass / bushes / pebbles / mushrooms / leaves / ferns / kelp / reeds / shells / sparkles / moss / dry / oasisFlowers)
- **Building v3**(house): 屋根の はりだし・土台の ふち・わく つき 入口(とって)・わく つき まど(だい・花の 箱)・煙突 / 看板 / ひさし の 1〜2・正面 両かどの しげみ + 入口 わきの 花・家ごとの いろ / わく(v)
- **city scene**(tower / wall): 低層(fl ≤ 3)= みせ(ガラス 2 まい + 入口 + ひさし + 看板 + たて看板)、中層 = ベランダ、高層 = 給水タンク。パラペット・室外機・かいの すじ。高さは 床の 5.5 倍まで。palette(白 / ベージュ / 茶 / パステル)+ 低層 palette + accent 6 色。路地の かべも 正面(まど / 入口 / 室外機 / たて看板)。自販機 = パネル + 取り出し口、自転車 = わ 2 つ + フレーム。3D だけ アスファルトを 明るく(`ground3d`)
- **水の 統合**: 川 = `riverCurve`(Catmull-Rom 60% + 直線・3 分割)で なめらかに、はば 0.62〜0.9(見た目の 水は あたりの 帯の 内がわ)。川岸の 帯(石 / あし / 草 / 花 / しげみ)。Bridge v3 = 床は 水面(2.4)より 上・両はしの だん・橋脚 / 支柱 が 地面まで・中段の よこ木 / 両わきの 石
- **比率**: サボテン 4 種(柱 / 枝分かれ / まる / むれ・150 以上)、大木の 幹は あたりの 0.82、ビルは 煙突に しない、いけがきは まるい しげみの れつ、遺跡の かべは くずれた 2 段 + すじ + 足もとの もりあがり、メサ / オベリスクは 明るく

## density gate(前景 / 中景 / 遠景)

test AD-16: 各地域の 代表 spot(最初の ひろば)から 前景(〜250)≥ 1・中景(250〜700)≥ 3・遠景(700〜1800)≥ 6、足もとに 植生 / 小物、道の 上に 物 なし。13 地域 ぜんぶ 通過(`node tests/meguru-3d-art-direction-test.cjs`)。

## Human QA gate(7 条件・headless の しゃしんで 仮判定。実機の 裁定は 人間)

○ = headless で 満たす / △ = 実機で 要確認 / 条件: ①ひと目で 地域が わかる ②さびしく ない ③箱っぽく ない ④いろが ゆたか ⑤歩きたい(歩きたく なる) ⑥ランドマーク 以外の 見どころ ⑦前景 / 中景 / 遠景 が ある

| region | ① | ② | ③ | ④ | ⑤ | ⑥ | ⑦ | 代表 spot | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| home | ○ | ○ | ○ | ○ | ○ | ○ | ○ | yard / house | まるい いけがき・家の 正面・道ばたの 花。ひろばの まんなかは 意図して 空ける |
| forest | ○ | ○ | ○ | ○ | ○ | ○ | ○ | bright1 | 明るい かんむり・花 / きのこ / おちば。jungle と 見わけ(AD-6) |
| jungle | ○ | ○ | ○ | ○ | ○ | ○ | ○ | clearing | 深い みどり + 黄緑・大きな は / 下草 / ヤシ・みどりの きり。tris 210k → 実機で 重さ 要確認(△ perf) |
| city | ○ | ○ | △ | ○ | ○ | ○ | ○ | square / arcade / market | 低層の みせ・ベランダ・いろ。よこ向きの かべは まだ 平ら(△ 箱)。「どことなく 名古屋」は 雰囲気のみ(実機の 裁定) |
| countryside | ○ | ○ | ○ | ○ | ○ | ○ | ○ | village | 農家 v3・はたけ・花 |
| mountain | ○ | ○ | ○ | ○ | ○ | ○ | ○ | trailhead | 針葉樹 4〜5 段・がけ 明るめ・小屋 v3 |
| snow | ○ | △ | ○ | △ | ○ | ○ | ○ | field | 群生は ひかえめ(余白 0.6・花 なし)= 雪原の 静けさ。さびしさは 実機で 裁定 |
| sea | ○ | ○ | ○ | ○ | ○ | ○ | ○ | shore | ヤシ v3・貝 / 花・海の 面 |
| deepsea | ○ | △ | ○ | △ | ○ | ○ | ○ | coralcity | 昆布 / 小石(花 なし)・くらい 青は 意図。見える 量は 実機で |
| river_lake | ○ | ○ | ○ | ○ | ○ | ○ | ○ | riverside / bridge1 | 川の 曲がり と はば・岸の 石 / あし・丸太の はし |
| desert | ○ | ○ | △ | ○ | ○ | ○ | ○ | well / oasis | サボテン 4 種・オアシスの 花 / ヤシ。遺跡は 2 段の かべに(まだ 箱に 見える 角度 あり) |
| star_stop | ○ | ○ | △ | ○ | ○ | ○ | ○ | platform | 光 / 青白い 花・光の はし v3。えきの 大きな 箱(landmark)は そのまま |
| memory_lake | ○ | △ | ○ | △ | ○ | ○ | ○ | path1 | きりの 中で うすい いろ・あし / 花 ひかえめ(意図)。さびしさ = 雰囲気 として 実機で 裁定 |

## browser smoke(headless Chromium・`?meguru3d=1&perf=1`・27 にん)

(smoke-ad の 表。tools/meguru-3d-qa/regions-smoke.cjs)

| Region | 3D | walk | pen player / party | calls | tris(v2 → AD) | JS avg ms | enter ms | player ok | errors / fallback |
|---|---|---|---|---|---|---|---|---|---|
| home | ✓ | 440 | 0.0 / 0.0 | 59 | 17k → 33k | 5.7 | 523 | 100% | 0 / 0 |
| city | ✓ | 312 | 0.0 / 0.0 | 72 | 96k → 183k | 6.3 | 611 | 100% | 0 / 0 |
| countryside | ✓ | 355 | 0.0 / 0.0 | 62 | 57k → 105k | 5.9 | 502 | 100% | 0 / 0 |
| forest | ✓ | 307 | 0.0 / 0.0 | 76 | 114k → 145k | 8.4 | 1505 | 100% | 0 / 0 |
| mountain | ✓ | 356 | 0.0 / 0.0 | 72 | 100k → 118k | 6.4 | 1117 | 100% | 0 / 0 |
| snow | ✓ | 452 | 0.0 / 0.0 | 64 | 48k → 59k | 7.8 | 1362 | 100% | 0 / 0 |
| sea | ✓ | 339 | 0.0 / 0.0 | 69 | 48k → 79k | 12.1 | 1602 | 100% | 0 / 0 |
| deepsea | ✓ | 453 | 0.0 / 0.0 | 57 | 58k → 72k | 7.2 | 739 | 100% | 0 / 0 |
| river_lake | ✓ | 362 | 0.0 / 0.0 | 76 | 80k → 102k | 8.7 | 1052 | 100% | 0 / 0 |
| jungle | ✓ | 337 | 0.0 / 0.0 | 75 | 147k → 215k | 8.6 | 865 | 100% | 0 / 0 |
| desert | ✓ | 448 | 0.0 / 0.0 | 61 | 62k → 83k | 9.4 | 1171 | 100% | 0 / 0 |
| star_stop | ✓ | 445 | 0.0 / 0.0 | 49 | 37k → 61k | 4.7 | 594 | 100% | 0 / 0 |
| memory_lake | ✓ | 489 | 0.0 / 0.0 | 57 | 38k → 44k | 6.9 | 684 | 100% | 0 / 0 |

corridor QA(3D の まま 歩きとおす): home → forest(95 sample)・forest → mountain(75)・city → sea(83)・countryside → forest(53): ぜんぶ corridor 3D・player ok・errors 0・fallback 0・到着も 3D(ghost は 意図した すかし)

群生で tris は ふえる(forest 114k → 145k・jungle 147k → 210k・city 96k → 182k)。headless の GPU 時間は 目安に ならない → 実機の frame 間かくで 判断(重い 側: jungle / city / mountain)。

## テスト

- `tests/meguru-3d-art-direction-test.cjs` AD-1〜AD-18(npm test に 追加): 群生の 契約 / 群生 + 余白 / remove-it / 地域の 花 / Tree v3 / forest-vs-jungle gate / Building v3 / city scene / 小物 / いけがき / 水の 統合 / Bridge v3 / サボテン / 光 / 比率 / density gate / Human QA 記録 / 固有名 禁止
- 再仕様化(日付つき): v2-14(入口 / まど は しるしで・家の まわりの 植物・Bridge v3 の 橋脚 / だん)
- 3D テスト 3 file: prototype 15 / v2 15 / AD 18 → pass。full `npm test`: `41c98bf8` 時点で 2837 + 80 pass / 0 fail(EXIT 0)。Home layout browser(chromium のみ・local): illustrations の glyph box(★ / ♡)1 件だけ 失敗 = この container の font 環境で base でも 同じ(既知)、ほかは 通過

## 画像 / sheet / preview

- 画像: `docs/qa/meguru-3d-art-direction-v1/*-ad.jpg`(13 地域 + home-house / city-arcade / city-market / river-bridge / oasis)。v2 before は `docs/qa/meguru-3d-foundation-v2/` を そのまま のこす
- comparison sheet: `docs/qa/meguru-3d-art-direction-v1/compare.html`(地域ごと v2 before / AD after・主な 変更・のこる こと・重点ルート)
- preview(commit 固定): commit `8ee4cdf8`(code + 画像。docs の commit は 描画に 影響 なし)
  - 3D + perf(iPhone): `https://rawcdn.githack.com/Naoto214/naotocchi/8ee4cdf8/index.html?meguru3d=1&perf=1`
  - 3D: `https://rawcdn.githack.com/Naoto214/naotocchi/8ee4cdf8/index.html?meguru3d=1`
  - 2D くらべ(3D 地域で 2D): `https://rawcdn.githack.com/Naoto214/naotocchi/8ee4cdf8/index.html?meguru3d=1&m3d2d=1`
  - ふつうの 2D: `https://rawcdn.githack.com/Naoto214/naotocchi/8ee4cdf8/index.html`

## PR

PR #371(Draft・base = `feat/meguru-3d-foundation-v2`)。main へ merge しない・Ready に しない。

## 次の Human QA(iPhone)

compare.html の 重点ルート: home(いけがき / 家の 正面)→ forest → jungle(1 まいで 見わけ)→ city(駅前 → 商店街 → 市場)→ river_lake(川 / 岸 / はし)→ desert(サボテン / オアシス)→ のこり。
7 条件 の △(city の 箱っぽさ・snow / deepsea / memory_lake の さびしさ と いろ・jungle の 重さ)を 裁定。`&perf=1` の `player NG` / `miss` / `ghost` と frame 間かくも。
