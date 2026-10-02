# めぐる 3D — Claude → Astra 引き継ぎ(World 3D 構造 / runtime / Geometry・Terrain 工程の 区切り・2026-10-02)

Claude 側の lane は ここで 終了(構造・runtime・performance・Geometry / Terrain の checkpoint を 固定)。
**この doc は 新しい visual 仕様を 追加しない。** Visual Quality / Art Direction / Depth / Composition / Silhouette / Regional Identity の 磨き込みは Astra 側。

---

## 1. repo / branch / PR / HEAD / tree / base

| 項目 | 値 |
|---|---|
| repo | `Naoto214/naotocchi` |
| branch | `feat/meguru-3d-geometry-terrain-v1` |
| PR | **#374**(Draft・open・`mergeable_state: clean`) |
| code / QA checkpoint | `8752315fc5bfdd84c9be0f649c46974c219f07ff`(tree `3eb23524708348a7717bc7ad1710ac5b09eac321`)。JS の 最後の 変更は `55c8dc14`。それ以降は docs / 画像 だけ |
| HEAD | この doc を 足した commit(`8752315f` の 上に docs / QA tool だけ。コードは 同じ) |
| base | `feat/meguru-3d-art-direction-v1` @ `69a8857bacfa597fa65dcb433536b2f603f26b7d`(PR #371) |
| latest main | `cc4dce9eae9c6cd6997606213271d63540413ad8`(PR #375 Motion v2 completion)。この head より 20 commit すすむ(3D 以外)。merge-tree の 衝突は `package.json` の テスト一覧 だけ |

PR は すべて 積み重ね(stacked)で、どれも main へ merge して いない:

```
main ── #367 feat/meguru-all-regions-3d-v0 (32e33204)   All Regions 3D v0(PR の base は main。#364 forest cleanup 8cb6b8f1 の 内容を ふくむ)
          └─ #369 feat/meguru-3d-foundation-v2 (cbafd678)     Foundation v2
               └─ #371 feat/meguru-3d-art-direction-v1 (69a8857b)  Art Direction v1
                    └─ #374 feat/meguru-3d-geometry-terrain-v1 (8752315f+)  Geometry / Terrain + 静的監査
```

#367 / #369 / #371 / #374 は Draft・open・mergeable clean(2026-10-02 時点)。

## 2. 系譜(Foundation v2 → Art Direction v1 → Geometry / Terrain)

| 段 | PR | Human QA | 中身 | 正本 doc |
|---|---|---|---|---|
| forest 3D prototype | #364 | 済(forest) | forest で 3D の きまり(hybrid renderer・InstancedMesh・billboard の キャラ) | `docs/qa/meguru-forest-3d-prototype-2026-09-30.md` |
| All Regions 3D v0 | #367 | v1 実施(11 failure) | 13 地域を 3D で 歩ける。`SEM3D`(意味の 表)・`archetypeParts3d`・`REGION3D`・reachability テスト | `docs/qa/meguru-all-regions-3d-v0-status.md` |
| Foundation v2 | #369 | (v1 の 結果で 着手) | player 消失 / 残像の 基盤(ghost pool 契約・billboardVisible)・corridor 3D・Water v2・Kit v2・Profile v2 | `docs/qa/meguru-3d-foundation-v2-status.md`・`…-human-qa-v1.md` |
| Art Direction v1 | #371 | **済(iPhone)・完成は 未承認** | 光 / palette・Tree v3・scene dressing・Building v3・city scene・水の 統合・Bridge v3 | `docs/qa/meguru-3d-art-direction-v1-status.md`・**`…-human-qa.md`(HQ-1〜15 = 次の 判断の 正本)** |
| Geometry / Terrain | #374 | **未(Human QA 待ち)** | runtime P0・予算・Terrain v1・Creek / River v3・Bridge v4・Building v4・Tree v4・地域 grammar・季節 | `docs/qa/meguru-3d-geometry-terrain-v1-status.md` |
| 静的監査 | #374 | **未** | 未完了の 棚卸し・接地・交わり・小物・予算・識別性・季節の 2D 整合 | `docs/qa/meguru-3d-geometry-audit-v1.md` |

## 3. Claude 側で 実装済み(コードの 場所)

主な ファイル: `meguru.js`(world → 3D の 物の 意味 / 形・pure)と `meguru-3d.mjs`(Three.js 0.170 の renderer)。3D は `?meguru3d=1` の ときだけ 読む(`index.html` の `<template id="meguru3dModule">`)。

- **runtime**(`meguru-3d.mjs`): hybrid renderer(3D 失敗 → 2D fallback)・shape ごとの InstancedMesh(`GEO` / `MAT` / `GEO_ALIAS` / `MAT_ALIAS`)・すかし = `pickOccluders`(線分 距離・ちかい 順 16・あたりの ない 高い 物も)→ `rayHitsOccluder`(足 / むね / あたま × 左右)で ほんとうに 隠す 物 だけ・ghost は もとの いろ(`ghostMatFor`)・`FADE_HOLD` 6 frame・ghost pool(`ghostPoolStep`)・変わった instance だけ upload(`addUpdateRange`)・かげの culling なし・解像度の 自動調整(2 → 1.5)・診断は `&perf=1` の ときだけ(4 行め `ray n/3 occl long up dpr`・QA API `probeNow / frames3d / triBreakdown / stats3d`)
- **terrain**: `terrainGrid(world, M, objects)`(pure・80 の 格子)= 道 / spot / 敷地 = 平ら、ひらけた ところ だけ 丘、根 / 砂丘 / 雪の 土手 / がけの 足もと、海へ ひくく、池の くぼ地、小川 / 川の 谷、水の ない 橋の 浅い 谷。`surfaceY` / `walkY`(キャラは 道 0・橋の 床・あさせ)。`objectGround`(接地: 構造物は 物ごと、ほかは parts ごと)
- **stream**: `streams3d / streamDist3d / streamCrossings3d`(`meguru.js`)= `REGION3D[rid].streams` から 1 本の ながれ(道の よこへ ずらす・かたい 物を よける)。断面 `STREAM_BED`・水面 `STREAM_WATER_Y`(小川 −9・川 −11・用水路 −5)・`streamStripData`
- **bridge**: `bridge4Parts / fordParts / bridgeKind3d` = 交わりの いち / むき / ながさ、床の 上面 `BRIDGE_DECK_Y` 6、丸太 / 木 / 石(アーチ)/ ロープ / 板 / 光。あたりの ある ランドマークの 橋は 動かさない(交わりの 上に ある とき だけ うけもつ)。橋の ない 交わり = 飛び石
- **building**: `archetypeParts3d('house')` = Building v4 family(cottage / single / twostorey / farmhouse / barn / cabin / adobe / shop / hut / shed)・切妻 `gable` / 寄棟・ポーチ / 出窓 / 縁側 / はなれ / 煙突・シルエット ≤ 1.6
- **tree**: Tree v4(根もとの はり・2 段の 幹・枝・白い ほそい 木)・針葉樹 4〜5 段・ヤシ・ジャングルの 大きな は / つる / 板根
- **regional grammar**: `REGION3D[rid]`(fog / relief / streams / grammar / gardens / fields / cover / foliage / water / arch / ground3d / seasons3d)・`sceneDressing3d`(群生)・`gardenDressing3d`(いえ だけ)
- **season / weather**(2D 正本 と 同じ 条件): 針葉樹の 雪の ぼうし(ゆき の 地域 / 冬)・山の 頂の 雪(+ 雪の 日)・山の 地面の 季節(`seasons3d`)・秋の 広葉樹 = 2D の だいだい(ジャングル のぞく)・はっぱ / はなびら / こな雪の つぶ・雨 / 雪の つぶ・deepsea / star_stop は 地表の 季節 なし

## 4. 性能(headless Chromium・SwiftShader。実機の GPU 時間の 目安では ない)

改善: ray で たしかめる すかし(city の ghost 131 → 平均 10 前後)・うすい 板 1 まい(`wpanel`)・幹 ふた なし・mound 下半分 なし・花の まんなか 8 三角形・しだ / ヤシの は 8 三角形・箱の 下の 面 なし・大木の 根は みじかい 幹・季節で しか 出ない 形は ふだん 描かない・変わった instance だけ upload。透明 fade で 遠くを けす 方式は つかわない。

| region | AD v1(Human QA 時) | いま(`55c8dc14`)| calls |
|---|---|---|---|
| home | — | 37k | 59 |
| city | 183k | **127k** | 59 |
| countryside | — | 119k | 75 |
| forest | 145k | 148k(地形 + 小川 + 丸太) | 81 |
| mountain | — | 107k | 76 |
| snow | — | 70k | 69 |
| sea | — | 70k | 68 |
| deepsea | — | 74k | 59 |
| river_lake | — | 114k | 94 |
| jungle | 214k | **173k** | 87 |
| desert | — | 91k | 65 |
| star_stop | — | 66k | 53 |
| memory_lake | — | 52k | 60 |

三角形の 内訳(instanced): jungle = 小さな かんむり 25k・ヤシ / しだの は 21k・幹 17k・大木の かんむり 15k。city = 箱 41k・うすい 板 10k。とびぬけた 1 形は ない。

## 5. 自動検証(`55c8dc14` の JS・`8752315f` で 同じ)

- full `npm test`: **pass 2857 / fail 0 + pass 80 / fail 0(EXIT 0)**
- 3D の テスト: prototype 15・foundation-v2 15・art-direction 18・geometry-terrain 13(GT)・geometry-audit 7(GA)
- browser smoke(`tools/meguru-3d-qa/regions-smoke.cjs`): 13 地域 3D ✓・めりこみ 0・err / fallback 0
- corridor(`corridor-qa.cjs`): home ⇄ forest・forest ⇄ mountain・city ⇄ sea・countryside ⇄ forest = 4 / 4 arrived・corridor3D・playerOK・maxGhost ≤ 6
- player の 見え かた(`visibility-audit.cjs`・4 方向): 13 地域 **hidden 0**。partial: city 5・jungle 3・countryside / mountain / sea / river_lake 1
- 静的監査(`geometry-audit.cjs`): 浮き parts 13 地域で 4(以前 1500 こえ)・交わり 18 / 18・川の 帯の 中の 池 0・家 158 件 シルエット ≤ 1.6・絵文字の 立て看板 0
- 既知: Home layout browser の illustrations glyph 1 件は container の font 環境差(base でも 同じ)。CI は `pull_request: branches: [main]` だけ なので stacked PR では 走らない

## 6. Human QA 済み / 未済み

| 対象 | 状態 |
|---|---|
| Art Direction v1(#371) | **iPhone Human QA 済み・完成は 未承認**(HQ-1〜15 = 未承認課題。`docs/qa/meguru-3d-art-direction-v1-human-qa.md`) |
| Geometry / Terrain(#374)・静的監査 | **Human QA 未実施** |
| 「どうぶつの森的な 箱庭感」「Art Direction 完成」「production ready」 | **判定 して いない** |

## 7. iPhone 実機で 未確認

- 残像(ghost の 出入り・白い 半透明の 形が 出ないか)
- player の 消失(perf の `ray n/3` と 目で 見た ものが あうか。以前は `player ok miss 0` でも 消えて 見えた)
- 実機の カクつき(`long` / `up` / `dpr` の 段・解像度の 自動調整の はたらき)
- 地形の 起伏 と 斜面の 岩 / 根・小川 と 橋(river_lake の bridge2 を ふくむ)・家の かたち・季節(秋 / 冬 / 春の つぶ)の 見た目
- Safari 特有の 描画(texture の upload は #368 の 範囲)

## 8. Visual Quality として まだ 残る 課題(Claude 側では 判定 しない)

- 全体の 箱庭感・立体感・模型感(HQ-5 の 最終判断)
- 地域の 識別性: いえ ~ いなか の 構成の 似かた cosine 0.66、river_lake ~ memory_lake 0.86・countryside ~ river_lake 0.85。いなかの 畑は 数で 3%(面積は 大きい)。2D の 小物 配置が 正本 なので 3D だけで 種類を 足して いない
- Depth / Composition / Silhouette(前景 / 中景 / 遠景の 組み立て・地平の 見せ方)
- 水面の 質感(海 / 川 / 池の 動き・反射は 軽い まま)
- 建物 / 橋 / 小物の 造形の 洗練(いまは 低ポリの 原型の 組み合わせ)
- 季節の 見た目の 量(2D 正本に ない 季節表現は 未着手: 例 冬の 地面を 全地域で 白く・春の 花の 量)
- 光 / 色 / 霧の 地域ごとの 演出
- 山の 谷の 大岩 2 つ・遺跡の 足もとの 土が 斜面に うまる 見た目(監査で うけいれ)

## 9. 保護すべき architecture / contracts

- **3D は `?meguru3d=1` の ときだけ。default は 2D**(2D が 正本)。3D 失敗 → 2D fallback
- **save / schema / localStorage 不変**。あたり(collision)・道・spot・reachability・corridor の gameplay は 2D 正本(3D は 見た目 だけ)。player の 移動は 2D の 座標
- `SEM3D`(意味の 表): kind → 原型。意味の ちがう 置きかえ なし・表に ない kind は `unknown`(テスト 赤)
- `WORLD3D_REGIONS` = `REGION3D` の ある 13 地域
- すかし / ghost の 契約: `pickOccluders`・`rayHitsOccluder`・`ghostMatFor`(もとの いろ)・`ghostPoolStep`(上限 16・使わない ghost は scene から はずす)・`FADE_HOLD`・`billboardVisible`・`renderer.clear()` と scene 切りかえで 捨てる。**距離で 透明に しない**(GT-1)
- 診断は `&perf=1` の ときだけ(production の UI に 出さない)
- Terrain: 道 / spot / 敷地は 平ら(道を 上下 させない)・ランダムな こぶを 全面に まかない・`objectGround` で 接地
- 小川 / 池の 区別(川の 帯の 中に 池の 円盤を おかない)・橋は 交わりに かかる(床 > 水面・ながさ ≥ 水の はば)
- 季節 / 天気は 2D 正本 と おなじ 条件(`pinewall` / `peak` / `leafyTree` / `ambLayer` / `hasSurfaceSeasons`)
- 予算: 物を ふやす ときは instancing / reuse。InstancedMesh を shape ごとに
- テスト: prototype / foundation-v2 / art-direction / geometry-terrain / geometry-audit。**再仕様化は 日付つき コメントで**(skip / 削除 しない)
- 特定の 作品の asset / 建物 / 地形 / model / texture / 配置 / animation を まねない・名まえも 出さない(AD-18)
- asset の cache token: JS を かえたら `npm run bump`(`tests/asset-versions-test.cjs`)

## 10. lane の 境界

- **Resident Expression(#368・`feat/meguru-resident-expression`・base main)**: 住民の きもち → 表情資産。`meguru-3d.mjs` の `actorTexture`(キャラの billboard の texture・Safari の decode 対策)と `resident-expression.js`・`meguru.js` の `updateEmotion` / `spriteFor` は #368 の 範囲。**この lane(#367〜#374)は `actorTexture` を かえて いない**。#368 は #367 を 取りこんで いない
- **Character 3D lane**: キャラ(player / なかま / 住民)の 見た目は この lane では billboard(`actors` / `actorGeo`)の まま。キャラの 3D 化 / model は Character 3D lane の 範囲で、この lane では さわらない
- この lane の 範囲 = 世界(地形・水・建物・植生・小物・地域・季節)の 3D と その runtime

## 11. preview / sheet / 画像

preview(commit `8752315fc5bfdd84c9be0f649c46974c219f07ff` 固定・iPhone。HEAD は この上に docs だけ):
- 3D + perf: https://rawcdn.githack.com/Naoto214/naotocchi/8752315fc5bfdd84c9be0f649c46974c219f07ff/index.html?meguru3d=1&perf=1
- 3D: https://rawcdn.githack.com/Naoto214/naotocchi/8752315fc5bfdd84c9be0f649c46974c219f07ff/index.html?meguru3d=1
- 2D くらべ: https://rawcdn.githack.com/Naoto214/naotocchi/8752315fc5bfdd84c9be0f649c46974c219f07ff/index.html?meguru3d=1&m3d2d=1
- ふつうの 2D: https://rawcdn.githack.com/Naoto214/naotocchi/8752315fc5bfdd84c9be0f649c46974c219f07ff/index.html
- BEFORE(AD v1)/ AFTER(いま)sheet: https://rawcdn.githack.com/Naoto214/naotocchi/8752315fc5bfdd84c9be0f649c46974c219f07ff/docs/qa/meguru-3d-geometry-audit-v1/compare.html
- GT pass の sheet: `docs/qa/meguru-3d-geometry-terrain-v1/compare.html`

画像: `docs/qa/meguru-3d-geometry-audit-v1/*-ga.jpg`(31 まい: 13 地域・近く・山の 夏 / 冬・秋 / 冬 / 春・bridge2・斜面)。つくり方: `tools/meguru-3d-qa/shots-geometry-audit-v1.json`。以前: `docs/qa/meguru-3d-geometry-terrain-v1/*-gt.jpg`・`docs/qa/meguru-3d-art-direction-v1/*-ad.jpg`(Human QA の BEFORE)

QA tool(`tools/meguru-3d-qa/README.md`): `regions-smoke.cjs`・`corridor-qa.cjs`・`visibility-audit.cjs`・`shot.cjs`・`geometry-audit.cjs`

## 12. 禁止

- **main へ merge しない**
- **Ready に しない**(#367 / #369 / #371 / #374 は Draft の まま)
- **production Pages を かえない**
- save / schema を かえない・2D 正本を こわさない・ほかの lane を 勝手に merge しない・rebase / force-push / 履歴の 書きかえ を しない

## 13. Astra が ゼロから 作り直す べきで ない 所

- hybrid renderer と 2D fallback・`?meguru3d=1` の 切りかえ
- すかし / ghost / ray / 診断の runtime(残像・消失の 対策の 積み上げ。実機 QA の 手がかり)
- `SEM3D` / `archetypeParts3d` / `REGION3D` の 骨組み(形を 磨くのは よいが、意味の 表と 地域 profile の 仕組みは のこす)
- `terrainGrid` / `surfaceY` / `walkY` / `objectGround`(道 / spot / 敷地が 平ら・キャラの 足もと・接地)
- `streams3d` と 交わり → 橋 / 飛び石 の 決め方(位置・向き・ながさ)
- InstancedMesh の 予算の しくみ と 測り方(`triBreakdown`・smoke)
- 季節 / 天気の 2D 正本 と の 対応
- テストと QA tool 一式(再仕様化は 日付つきで)

## 14. Astra に 任せるのが 適切な 課題

- Visual Quality / Art Direction: 形の 洗練(家・橋・木・岩・小物)、材質感、色 / 光 / 霧の 演出
- Depth / Composition / Silhouette: 前景 / 中景 / 遠景・地平・見せ場の 組み立て
- Regional Identity: いえ / いなか・もり / ジャングル・river_lake / memory_lake の 見分け(2D 正本の 配置を こわさない 範囲)
- 水面の 表現(重い 反射 / post-process は 予算 しだい)
- 季節表現の 追加(2D 正本に ない もの は 新しい 仕様 として)
- Human QA(iPhone)の 結果 → 次の 改善判断
