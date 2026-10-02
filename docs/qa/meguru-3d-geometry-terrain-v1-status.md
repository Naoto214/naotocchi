# めぐる 3D Geometry / Terrain / Regional Identity / Runtime Quality Pass — status(正本・2026-10-02)

branch `feat/meguru-3d-geometry-terrain-v1`(`feat/meguru-3d-art-direction-v1` @ `69a8857b` = PR #371 に stacked。#371 は Art Direction v1 の checkpoint の まま)。
Human QA の 正本: `docs/qa/meguru-3d-art-direction-v1-human-qa.md`(Art Direction 完成は 未承認・HQ-1〜15)。

**main へ merge しない・Ready に しない・production Pages を かえない。完成の 判定は しない(Human QA 待ちで 停止)。**
3D は `?meguru3d=1` の ときだけ(default 2D)・save / schema 不変・あたり / 道 / spot / reachability は かえない(地形・小川・橋・庭・畑 は 見た目 だけ)。
特定の 作品の asset / 建物 / 地形 / model / texture / 配置 / animation は まねない。

## checkpoint

| CP | 内容 | commit |
|---|---|---|
| 記録 | iPhone Human QA(AD v1)を 保存 | `e0ebb374` |
| runtime P0 | すかしの 色・ray で たしかめる すかし・カメラの まわり・ちらつき なし・かわった instance だけ 送る・かげ・診断 | `beb758ea` `f88f413d` |
| 予算 | うすい 板 1 まい・幹 ふたなし・mound 半分・は 8 三角形 など | `76106968` |
| Terrain / 水 / 橋 | Terrain v1・Creek / River v3・Bridge v4・飛び石・池の くぼ地 | `ba31ba04` |
| 家 / 木 / 地域 | Building v4・Tree v4・いえ / いなか・もり / ジャングル・props gate・grammar | `bd37e652` |
| 季節 / 天気 | 山の 夏 / 冬・大木の 季節・3D の 雨 / 雪 | `587f65eb` |
| テスト | GT-1〜13・用水路の 板の はし | `e3216c32` |
| QA / 画像 / PR | browser QA・比較 sheet・preview・Draft PR | (この commit) |

## 課題ごと(HQ-1〜15)

- **HQ-1 残像**: すかしの ghost は もとの いろ(以前は 白い 半透明の かたち = 残像に 見えた)。円の 判定の 候補 → ray(足 / むね / あたま × 左右)で ほんとうに 隠す 物 だけ(city: 1 frame 131 ghost → 平均 10)。大きな 物は うすく(0.16)。線分の ふちで 6 frame は すかした まま(ちらつき なし)
- **HQ-2 player が きえる**: カメラの まわり(線分の はし)の がけも 候補(ジャングルの どうくつで ray 0/3 だった)。あたりの ない 高い 物(ヤシ・電柱・サボテン)も 候補。ちかい 順に 16 まで(以前は 配列の 順で 8)
- **HQ-3 カクつき**: すかしの 出入りで 形ごとの instance 全部を 送り なおして いた → かわった 1 つ だけ(addUpdateRange)。かげが 1 frame めの bounding で きえて いた。まい frame の Color の alloc を なくした。解像度の 自動調整(90 frame の 中央値 > 22ms で 2 → 1.75 → 1.5)
- **HQ-4 予算**: 下の 表。透明 fade で とおくを けさない
- **HQ-5 平面的**: Terrain v1(下)
- **HQ-6 小川**: Creek / River v3(下)
- **HQ-7 水面**: 海(浅瀬 → 沖 → 水平線・あわ)/ 川 と 小川(谷の 中・中心 ふかく・ながれの すじ)/ 池(くぼ地の しずかな 面)/ 用水路(あさい)
- **HQ-8 橋**: Bridge v4(下)
- **HQ-9 家**: Building v4(下)
- **HQ-10 いえ ≒ いなか**: いえ = 家ごとの 庭(花だん・ポスト・ひくい さく・入口から 道への 飛び石)・ほぼ 平らな 敷地・こいえ / 平屋 / 2 かい。いなか = ひろい 丘(hill 38)・畑の うね(道の むき)・用水路 と 板の はし・ひくい 農家(縁側・はなれ)と 納屋。庭は いえ だけ・畑は いなか だけ
- **HQ-11 もり / ジャングル**: もり = つめたい みどり(葉の palette・きりの いろ)・たおれた 丸太 + こけ + きのこ・しだ・小川 と 丸太 / 石の はし。ジャングル = 大きな は の 下草・canopy から たれる つる・板根・ヤシ・ちかい しめった もや(fog 700〜3000)
- **HQ-12 木**: Tree v4 = 根もとの はり・幹 2 だん(上は すこし かたむく)・かんむりへ のびる 枝・白っぽい ほそい 木(すずしい 地域)。大木の 根の はり / 板根 は みじかい 幹(mound より かるい)
- **HQ-13 小物**: A(立体化)= 自転車(たての わ 2 つ・フレーム・ハンドル・サドル・地面に つく)・水車 / 観覧車(たての わ・ゴンドラ)。B(記号で 読める)= 信号・電柱・自販機・ベンチ・パラソル・つぼ・テント。C(出さない)= なし(この pass で 消した 物は ない)
- **HQ-14 地域の 文法**: `REGION3D[rid].grammar`(dominant / secondary / vegetation / water / density / landmark / palette / openness / verticality / props)を 13 地域 ぜんぶ
- **HQ-15 季節 / 天気**: 監査 = 3D は 葉の いろ だけ 季節で かわり、大木の かんむり は かわらず、地面は かわらず、雨 / 雪 は 3D で 出て いなかった。→ 山(`seasons3d`): 春 / 夏 = 高原の みどり、秋 = かれ草、冬 / 雪の 日 = 雪(地面・がけの 上・こけ・屋根が 白く、針葉樹に 雪の 明るさ、花 / 草の ほ は かくす)。大木も 季節の いろ。3D でも 雨の すじ / 雪の つぶ(うごきを へらす 設定 と 水の 中 では 出さない)

## Terrain v1(見た目 だけ)

80 の 格子の 高さ = 意味の ある 起伏。道 / spot の そば(〜40)は 0、40〜130 で だんだん(格子の 三角形が 道の へりを こえない)。建物の 敷地は 平ら。
ひらけた ところ だけ 丘(relief.hill / wave)、森 / ジャングル = 根の こまかい 起伏、さばく = 砂丘の 尾根、雪 = 道ばたの 土手、山 = がけの 足もと、海 / 湖 = 水へ むかって ひくく、池 = 浅い くぼ地、小川 / 川 = 谷、水の ない 橋 = 浅い 谷(gully)、しんかい = 谷。
物 / 群生 / 草の たば は 地形の 上に すわる。キャラは 地面・橋の 床・水の 中の 道(あさせ)に たつ。カメラは player の 足もとの 高さに ゆっくり ついていく。格子の そとは 平らな わく。

## Creek / River v3

`REGION3D[rid].streams`: もり(小川 + 小さな ながれ)・ジャングル(川 + 沼の ながれ)・山(谷の 小川)・いなか(川 + 用水路)・かわ と みずうみ(川)。
ながれは 橋の spot の 下を とおり、水の spot を よどみ として とおる(池の 円盤を ならべない)。道に そう 区間は 道の よこへ ずらし、かたい 物 と 道から はなす(80ms 以下)。
断面 = 岸の 上 → 岸の ふち → 土の 斜面 → 砂利 → 川底、水面は 地面より ひくい(小川 −9・川 −11・用水路 −5)。岸に 石 / あし / 草 / 花。道の 面は 水の 上で きる。

## Bridge v4 / 飛び石

橋は ながれの 交わりに すわる(いちばん 直角に 横切る 道の むき・ながさ = 水の はば / 横切る 角度)。床の 上面 = +6(水面より 15 いじょう 上)・下の 梁・橋台・水の 中の 橋脚・てすり・両はしの だん。
丸太(3 本 + 岸の 石 + ロープ)/ 木(いた + 梁 + 橋脚 + てすり)/ 石(あつい 床 + 欄干 + アーチ)/ ロープ(うすい いた + 高い 柱)/ 用水路の 板 は かたちが ちがう。あたりの ある 橋(ランドマーク)は いちを かえず かたち だけ v4。橋の ない 交わりは 飛び石。水の ない 橋の 下は 浅い 谷。

## Building v4

family: cottage(切妻・入口の ひさし / ポーチ)/ single(寄棟・ポーチ・出窓)/ twostorey(大きな 敷地 だけ・2 かいの ベランダ)/ farmhouse(縁側・はなれ)/ barn(屋根裏の 梁・さしかけ)/ cabin / adobe(胸壁・梁の はし)/ shop(屋上の ひろい 看板)/ hut / shed(とても 小さな 敷地)。
1 かいは あたまの すぐ 上まで、屋根は あたまより 上 なので 敷地の そとへ 大きく はりだせる(あたり = 敷地 は かえない)。シルエット(からだ + 屋根)/ いちばん ひろい はば ≤ 1.5(以前の 塔の ような 家は 最大 14:1)。

## 予算(headless・おなじ 見え かた・三角形)

| region | AD v1(Human QA 時) | この pass |
|---|---|---|
| city | 183k | SMOKE_CITY |
| jungle | 214k | SMOKE_JUNGLE |
| forest | 145k | SMOKE_FOREST |

SMOKE_TABLE

## player の 見え かた(ray の walk audit・headless)

VIS_TABLE

## テスト

- `tests/meguru-3d-geometry-terrain-test.cjs` GT-1〜13(npm test に 追加)
- 再仕様化(日付つき 2026-10-02): prototype 3c / 3d / 9(3D だけの 物・小川の 水面)、v2-11(川 = ながれの 系)、v2-14(石の はし v4)、v2-15(主の かんむり)、AD-6(きりの いろ)、AD-7(Building v4 + シルエット)、AD-9(立った 自転車)、AD-12(Bridge v4)
- full `npm test`: FULL_TEST

## 画像 / sheet / preview

- 画像: `docs/qa/meguru-3d-geometry-terrain-v1/*-gt.jpg`(13 地域 + 近く + 山の 夏 / 冬)。BEFORE は `docs/qa/meguru-3d-art-direction-v1/*-ad.jpg`
- BEFORE / AFTER sheet: `docs/qa/meguru-3d-geometry-terrain-v1/compare.html`
- preview(commit 固定): PREVIEW_URLS

## 次の Human QA(iPhone・`&perf=1`)

1. 残像 / player が きえる / カクつき: city 駅前 → 商店街(すかしの 色 と 数)、ジャングルの どうくつ(がけ)、もり(木の あいだ)。perf の 4 行め `ray n/3 occl a/b long c up d dpr→…` と 目で 見た ものが あうか
2. 地形: いなかの 丘・山・さばくの 尾根・雪の 土手(道の へり)
3. 小川: もりの 小川 → 丸太 / 石の はし、ジャングルの 川 → 飛び石、かわ と みずうみ の 川の 中の 道(あさせ)
4. 家: いえ の 大きな 屋根の 小さな 家 と 庭、いなか の 農家 / 納屋、まち の みせの 屋上 看板
5. 山の 夏 / 冬(設定の 季節)、雨 / 雪の 日
