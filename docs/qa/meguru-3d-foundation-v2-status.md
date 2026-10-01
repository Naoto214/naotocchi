# めぐる 3D Foundation v2 — status(正本・2026-10-01)

branch `feat/meguru-3d-foundation-v2`(#367 `feat/meguru-all-regions-3d-v0` @ `32e33204` に stacked)。Human QA v1 の 結果と 契約は `docs/qa/meguru-3d-foundation-v2-human-qa-v1.md`。
**main へ merge しない・Ready に しない・3D は `?meguru3d=1` の ときだけ(default 2D)・save / schema 不変。**

## checkpoint

| CP | 内容 | 状態 | commit |
|---|---|---|---|
| CP1 | player 消失(F1)・persistent ghost(F2) | done | `0e412450` |
| CP2 | corridor 3D(F3)・しらせ(F4 / F5)・ちず filter(F6) | done | (この commit) |
| CP3 | Water v2(F10): river 帯・sea 面・lake・pond・deepsea | done | (この commit) |
| CP4 | Environment Kit v2(F7 / F8 / F11): Tree / Building / Rock / Bridge / Ruin / Underwater vegetation / street | done | `45e40d83` |
| CP5 | Region Profile v2 + 13 地域 再適用(F9 city) | done | (この commit) |
| CP6 | cross-region browser QA・画像・comparison sheet・preview・PR | done | (この commit) |

## CP1(P0)
- キャラの 立て看板: `fog: false`・frustum culling なし・aspect 有限。きりの 遠端 ≥ player までの きょり + 900(雨 × mood.fog で player が きりの いろ 1 色に なって いた)
- すかし: 物の 見た目の 半径(えだはり)と 高さで 判定(幹の あたり だけ では えだはりが player を 隠した)
- ghost pool の 契約 `ghostPoolStep`(pure・export): 使った ものだけ visible・1 frame 使わなければ scene から はずす・上限 16・owner / createdFrame / lastUsed。`stats3d().ghosts` / `.player`、`&perf=1` に `ghost a/b/c hid n player ok miss m`
- 3D → 2D で `renderer.clear()`、scene 切りかえで ghost / キャラ / renderLists を 捨てる
- テスト `tests/meguru-3d-foundation-v2-test.cjs` v2-1〜v2-5。browser smoke(forest / deepsea / memory_lake): player ok 100%・errors 0

## CP2
- corridor 3D: hybrid の `want()` が corridor の world(`chartFrom` / `corridorTo` が 3D 地域)を 3D に。飾りは `corridorObjectType3d`(帯の そと・あたり なし・SOFT3D の ひざ丈 置きかえ なし)、はしの いし だけ かたい 岩(あたり = corridorBody の r 24)。地面の いろは `world.setProgress` の まま frame ごとに 反映、きりは 出発 → 到着 の profile を `world.progress` で まぜる。gameplay(path / blocker / handoff / arrive / back / state の かたち)は かわらない(v2-6 / v2-7)
  - browser(home → forest): corridor の 51 sample ぜんぶ 3D・player ok・ghost 0・errors 0・fallback 0・着いた forest も 3D
- しらせ: ふつうの spot / 地区 = toast なし。ランドマーク = 左上の 名まえの 静かな 強調(`quietSpotMark`・`.mgr-spot-found` 1.6 秒・音 なし)。ひみつ / みち = toast。きろく(recordSpot / ちず / save / 探索率)は かわらない(v2-8)。既存 `meguru-discovery-test`(15 件)・`meguru-discovery-browser`・3D テスト 10 を 日付つきで 再仕様化
- ちず: `mapSpotShown`(現在地・つながり / gate・ランドマーク・ひみつ・hub / ひろば / みせ だけ)。13 地域 471 → 151 spot。`mapData().spotsHidden`。きろく・分母 不変(v2-9)

## CP3 Water v2(F10)
- 水は いみ ごとに べつの geometry(`stripGeometryData` / `discFanData`、pure・export)。「池を ならべて 川 / 海に 見せる」code は 削除
  - 川(river_lake)/ しんかいの 谷(deepsea): `terrain.pts` からの 1 本の 帯(左岸 → 水 → 右岸、頂点を 共有)。ながれは map.offset
  - 海(sea)/ 湖(memory_lake `lake: true`): 岸線 → ぬれた 砂(−90〜4)→ 浅瀬(0〜150)→ 沖(520〜1400)→ 水平線(9000)の 1 まいの 面 + 岸の あわ(明滅)。カメラの 遠 5200 → 12000
  - 池 / 湖(water の spot): でこぼこの 閉じた かたち(seed)・中心 ふかく / ふち あさく(vertex color)・ふちの 岸。全部 まとめて 2 draw call。川の 帯 / 海の 面に かくれる 池は おかない(`pondCovered`)。r ≥ 280 の 湖は 川の 上に のる
  - いろは `REGION3D[rid].water`(deep / shallow / bank / foam)。material は 両面
- あたり(岸の clamp・水の role・橋)は 2D と 同じ(v2-13)。テスト v2-10〜v2-13
- browser: sea / river_lake / memory_lake / deepsea / snow 3D 起動・errors 0。しゃしん: 海 = 水平線まで 1 枚、川 = 岸つきの 帯、氷の 池 = でこぼこ + 深さの 色

## CP4 Environment Kit v2(F7 / F8 / F11)
原型は `parts3d` / `archetypeParts3d`(meguru.js)が 物ごとの ばらつき `ctx.v`(決定的)と `ctx.kind` / `ctx.prof` を よんで つくる。SEM3D(kind → 原型)の 表は 保つ(wrong substitution 0)。
- Tree v2: ほそる 幹(`trunk2`)・高さ ばらつき・かんむり = main + 小さな cluster 1〜3(20 三角形)・種類差(riverwood たれる / parktree まるい / mistwood・bluetree うすい いろ)・針葉樹 3〜4 段・ヤシの は は 外へ たおれる(lean / tilt)・jungle の 板根・大木の 根もと
- Building v2: body + 屋根 + 正面の 入口 + まど(手前に 出る ガラスの 箱)+ 煙突 / ひさし / 看板。ビルは 階ごとの まどの れつ + 入口 + 階の すじ
- Rock / Cliff v2: 岩 = ごつごつの かたまり(mound)+ ともの 石、がけ = ごつごつの 箱 + 両はしの かた + 足もとの 落石
- Bridge v2(いみ ごと): まるた = 丸太 3 本 + 支柱、木 = いた + てすり + 支柱 + 下の 支え、いし = 石の いた + 両わきの 石 + した の かげ、ロープ、光
- Ruin v2: ruinwall → `ruin`(高さの ちがう かべ 2〜3 + 柱 + まぐさ + 倒れた 石)、柱 = 柱頭 つき / 折れた
- Underwater Vegetation v2: 昆布 = 曲がった 帯の は(`kelpBladeGeometry`、両面)1 かぶ 3〜5 まい・高さ ばらばら。木 / 柱の かたちは つかわない
- 頭の きまり(あたまより 下の 見た目 ≤ あたり + 10)は 保つ。テスト v2-14、prototype 3 / 3c / 9 を 日付つきで 再仕様化(岩 = mound、まるたの はし = log)

## CP5 Region Profile v2 + 13 地域 再適用(F7 / F9)
- `REGION3D` v2: fog / water に くわえ terrain / veg / arch(kind・palette・roofs・glass・heights・roofTank・poles・ruin)/ density / landmark / sky の family。レンダラーに 地域の switch は ふやさず、原型が `ctx.prof` を よむ
- city(F9): ビルの いろは palette 7 色(v で えらぶ)、階数 ±2 の ばらつき、屋上の 給水タンク、街灯は 電柱(横木 + 変圧器)。commercial(shopblock / shopfront)は 看板 + ひさし。信号・ガードレール・自販機・横断歩道・並木は そのまま 3D
- jungle: 木の 半分を 20 三角形の かんむりに(`lowPoly`)
- 地面の 起伏: areas(砂丘・雪原・海底・砂利・ぬかるみ…)の まんなかに ひくい mound(6〜22)。あたり なし
- テスト v2-15。13 地域 browser smoke は 下の 表

## browser smoke v2(headless Chromium・`?meguru3d=1&perf=1`・27 にん・CP5 時点)

| Region | 3D | walk | pen player / party | calls | tris(v1 → v2) | JS avg ms | enter ms | player ok | errors / fallback |
|---|---|---|---|---|---|---|---|---|---|
| home | ✓ | 496 | 0.0 / 0.0 | 56 | 15k → 17k | 3.5 | 382 | 100% | 0 / 0 |
| city | ✓ | 301 | 0.0 / 0.0 | 75 | 52k → 96k | 7.0 | 1347 | 100% | 0 / 0 |
| countryside | ✓ | 402 | 0.0 / 0.0 | 66 | 46k → 57k | 5.2 | 643 | 100% | 0 / 0 |
| forest | ✓ | 406 | 0.0 / 0.0 | 69 | 110k → 114k | 5.5 | 705 | 100% | 0 / 0 |
| mountain | ✓ | 390 | 0.0 / 0.0 | 71 | 70k → 100k | 5.7 | 538 | 100% | 0 / 0 |
| snow | ✓ | 529 | 0.0 / 0.0 | 60 | 45k → 48k | 4.1 | 323 | 100% | 0 / 0 |
| sea | ✓ | 478 | 0.0 / 0.0 | 60 | 47k → 48k | 4.7 | 410 | 100% | 0 / 0 |
| deepsea | ✓ | 472 | 0.0 / 0.0 | 57 | 47k → 58k | 4.1 | 422 | 100% | 0 / 0 |
| river_lake | ✓ | 455 | 0.0 / 0.0 | 84 | 58k → 80k | 5.4 | 253 | 100% | 0 / 0 |
| jungle | ✓ | 353 | 0.0 / 0.0 | 75 | 148k → 147k | 7.0 | 437 | 100% | 0 / 0 |
| desert | ✓ | 486 | 0.0 / 0.0 | 55 | 50k → 62k | 4.3 | 386 | 100% | 0 / 0 |
| star_stop | ✓ | 628 | 0.0 / 0.0 | 45 | 35k → 37k | 2.8 | 175 | 100% | 0 / 0 |
| memory_lake | ✓ | 555 | 0.0 / 0.0 | 57 | 29k → 38k | 4.3 | 380 | 100% | 0 / 0 |

三角形は まど・かたまり・岸・起伏の ぶん ふえた(city 96k・mountain 100k・jungle 147k が 重い 側)。draw call は +5〜17(水の 面 2〜5・起伏 1・昆布 1・ほそる 幹 1)。実機の 数字は iPhone で(headless の GPU 時間は 目安に ならない)。

## CP6 QA / 画像 / preview / PR
- browser QA tool: `tools/meguru-3d-qa/`(regions-smoke / corridor-qa / shot)。13 地域 smoke = 上の 表(player ok 100%・ghost は 意図した すかし だけ・errors 0・fallback 0)
- corridor QA(3D の まま 歩きとおす): home → forest(51 sample)、forest → mountain(60)、city → sea(61)、countryside → forest(33): ぜんぶ corridor 3D・player ok・errors 0・fallback 0・到着も 3D。home|river_lake は QA script の 向きの えらびかたで forest 側へ 入った(同じ spot に gate が 2 つ。corridor 自体は 3D)
- 画像: `docs/qa/meguru-3d-foundation-v2/`(13 地域 v2・corridor 4 まい・city / 川 / 湖 / 海 / 深海 / jungle / 遺跡)。v1 は `docs/qa/meguru-all-regions-3d-v0/` を そのまま のこす
- comparison sheet: `docs/qa/meguru-3d-foundation-v2/compare.html`(地域ごと v1 / v2 / status / 主な 変更 / のこる こと / 実機の 重点ルート)
- full `npm test`: `8d8642ac` で 2819 + 80 pass / 0 fail(EXIT 0)
- PR #369(Draft・base = `feat/meguru-all-regions-3d-v0`)。main へ merge しない・Ready に しない

## 次の Human QA
compare.html の 重点ルート(home → forest → city → mountain / snow → river_lake → sea → deepsea → jungle → desert → star_stop / memory_lake)を iPhone で。`&perf=1` の `player NG` / `miss` と `ghost` の 値、重い 地域(jungle / city / mountain)の frame 間かく、city の 日本らしさ・ランドマークの 位置・雰囲気を 裁定
