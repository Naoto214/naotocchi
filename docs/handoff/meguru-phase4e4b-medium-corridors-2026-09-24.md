# Phase 4E-4B — MEDIUM 3 本を あるいて こえる(曲がりを 道 ぜんぶへ ひろげる)

日付: 2026-09-24 ／ 対象: `meguru.js`(4E-1 の かたち・景色の 表)／ 前提: [4E-4A](meguru-phase4e4a-low-corridors-2026-09-24.md)(#340、main `134e210`)・[4E-4 Preflight 監査](../design/meguru-phase4e4-preflight-audit-2026-09-24.md)

**あるいて こえる 出口は 8 本**: 4E-4A の 5 本(`home|forest`・`home|river_lake`・`city|desert`・`desert|mountain`・`snow|mountain`)に、MEDIUM 3 本 `forest|mountain`・`mountain|river_lake`・`city|sea`(行きと 帰り)を たした。
walk で transition に のこるのは HIGH 2 本(`countryside|forest`・`city|countryside`)。special 3 本(ふね `jungle|sea`・もぐる `deepsea|sea`・ゴンドラ `countryside|star_stop`)と memory_lake も transition の まま。

2 かいめの はやあし(1.4 倍)は **どの 本も そのまま**。はやさの 上限(speed cap)は つかって いない。セーブの 形・`travelToRegion()`・世界地図・分母・party の LOD / cache・global collision は かえて いない。

---

## 0. 基準(main `134e210`)

| | |
|---|---|
| #340(4E-4A) | main へ マージ(`134e210`)。npm test 1328 / 1328、Runtime smoke・Home layout 緑。continuous 5 本 |
| Preflight の 宿題(4E-4B) | 2 かいめ(1.4 倍)の いちばん はやい 曲がりが 30°/s を こえる: forest\|mountain 31.5・mountain\|river_lake 34.8・city\|sea 32.7 |

---

## 1. やったこと

| | 中身 |
|---|---|
| **許可リスト 8 本** | `CONTINUOUS_WALK_ALLOWLIST` に MEDIUM 3 本。本ごとの `if` は ない |
| **turn spread** | 曲がる ところの ひろげかた `CORRIDOR_TURN_SPREAD`(3 だん)。上から ためし、2 かいめの いちばん はやい 曲がりが `CORRIDOR_TURN_TARGET` 28°/s いかに なる さいしょの もの(`corridorTurnSpread(turn, L)`)。**曲がる 量(度)と 両はしの むきは かえない**。4E-1 の かたちで めやすに おさまる 本(4E-4A の 5 本)は level 0 の まま で かわらない |
| **かたちは 1 つ** | 4E-1 と おなじく a → b の 1 つだけ もち、帰りは さかさ + 180°。chart・帯の はし・カメラ・なかまの ならびは むき(`corridorHeadingAt`)だけ から つくる ので、そのまま あたらしい 曲がりに そう |
| **景色(いろ)** | 端の 地域で ない 地面の いろ(川・はたけ・道 など)は **端から 1 段 かけて** かさね はじめる。道の はしは かならず 端の 地域の いろ(city\|sea が 緑の 川で はじまって いた) |
| **景色(まちの 運河)** | `CORRIDOR_REGION_TERRAIN.city.river`: まちの ちかくの 川は まちの 運河(まちの いろ・とおくに ビル)。地形 × 地域 の 表に 1 行 |
| **そのまま つかう もの(4E-4A)** | のこり きょり の preload(810 / 1485)・絵の さきどり デコード・入口の したく(world を さきに 1 回 組む・glyph を わける)・着いた 暗転の あいだは さきどり しない・背景は まんなかで 1 回・障害物(いし)は ふやさない |

### 1.1 turn spread の 3 だん

| level | 出口の まえ まっすぐ | 曲率の 上げ下げ | つかう 本 |
|---|---|---|---|
| 0 | 半段(225) | 2 わり | 4E-4A の 5 本(と 4E-1 の まま) |
| 1 | なし(道 ぜんぶで 曲がる) | 2 わり | forest\|mountain・city\|sea |
| 2 | なし | 1 わり | mountain\|river_lake |

いちばん はやい 曲がり = |曲がる 量| ÷ ((1 − 上げ下げ) × 曲がる ながさ) × 260 × 1.4。出口では 曲率 0 から はじまり 0 で おわる ので、むきは とばない(出口の むき = 地域の 出口の むき)。

### 1.2 曲がる はやさ(4E-1 の spec と 1 world ごとの 実測。°/s、はやさ 260 × 倍率)

| corridor | 曲がる 量 | level | 初回 before → after | **2 かいめ(1.4 倍)before → after** |
|---|---|---|---|---|
| forest\|mountain | 155.9° | 1 | 22.5 → 18.8 | 31.5 → **26.3** |
| mountain\|river_lake | 171.9° | 2 | 24.8 → 18.4 | 34.8 → **25.8** |
| city\|sea | 161.5° | 1 | 23.3 → 19.4 | 32.7 → **27.2** |
| home\|forest | 75.2° | 0 | 10.9(かわらず) | 15.2 |
| home\|river_lake | 43.0° | 0 | 6.2 | 8.7 |
| city\|desert | 60.1° | 0 | 8.7 | 12.2 |
| desert\|mountain | 49.5° | 0 | 7.1 | 10.0 |
| snow\|mountain | 130.7° | 0 | 18.9 | 26.4 |

- MEDIUM 3 本は 2 かいめでも **28°/s いか**(目標 30、できれば 28)。はやさの 上限は つかって いない(1.4 倍の まま)
- 4E-4A の 5 本は level 0 の まま で、かたち・曲がる はやさ とも 1 つも かわらない(テスト 1 で 4E-1 の 値と くらべる)
- 行きと 帰りは 同じ かたちを さかさ に つかう ので、帰りの 実測も 行きと 同じ(テスト 1 で 16 方向)
- 曲がる 量は 4C の `bend` と 一致、両はしの むき(`startGlobal` / `endGlobal`)も 一致(テスト 2)

---

## 2. 景色(スクリーンショット: 3 本 × 行き / 帰り × 0 / 25 / 50 / 75 / 100 %)

| | 出発 → 到着 | 見えかた |
|---|---|---|
| `forest\|mountain` | 森 → 坂 / 岩 → 山 | 地面 #7fb26b → #84ad6f → #8ea17a → #959a81 → #9a9585。森の ことば(🌿 🍄 🪵 🌲 🌳)は 森がわ 3 段 のこり、1 段で きえない。背景 treeline → peaks(まんなかで 1 回) |
| `mountain\|river_lake` | 山 → 河原 / 川 → 湖 | #9a9685 → #9ea687 → #a2b489 → #a6c88c → #a9d28d。背景 peaks → lakehills(湖)。**海の 背景・砂浜・ヨット・🌴・🐚 は 出ない**(Preflight の 宿題)。湖がわは 🪷 🌳 |
| `city\|sea` | まち → 運河 / 堤防 → 港 / 岸 → 海 | #5e6370 → #77787b → #9b9f8b → #d8ccaa → #f1e1b5(灰色 → 砂、もどらない)。背景 neonskyline → seahorizon。まちがわは 🏢 🏬 🚲 🪧 🗑️(いえ・さく なし)、海がわは 🌴 🐚。**深い 海・ジャングル・ふね(⛵ ⚓ 🪸)の ことばは まぜない**。遠景の 海の 絵に 小さな 帆 が 1 つ あるのは 海の 地域 そのものの 背景(sea の 地域と 同じ) |

- 背景は 8 本 × 2 方向 とも まんなかで 1 回だけ(4E-4A テスト 7 を 8 本に)
- 遠景(DistantFeature)の まざりは 4D-2 / 4E-2 の まま。sea の 遠景に 出るのは 地域 sea と 同じ もの(jungle を 見つけて いれば 島。深い 海(`deep_dark`)は 出口の そば だけ で corridor には 出ない)
- あたらしい 絵は ない

## 3. 出口(gate)

| 地域 | 出口 | モード |
|---|---|---|
| city | desert / **sea** / countryside | corridor / **corridor** / transition(4E-4C まで) |
| mountain | forest / river_lake / snow / desert | 4 本とも corridor |
| forest | mountain / home / countryside | corridor / corridor / transition |
| river_lake | mountain / home | corridor / corridor |
| sea | city / jungle(ふね) / deepsea(もぐる) | corridor / transition / transition |

むきで 1 つに きまり、まちがった 出口から 出ない(4E-4A テスト 8 を city の 3 出口・mountain の 4 出口へ ひろげた)。special(ふね・もぐる・ゴンドラ)と HIGH 2 本は 許可リストに ない(4E-4B テスト 5)。

## 4. 性能(CPU 4 倍・390 × 844・DPR 3。あるいて 入る)

<!-- PERF -->

## 5. テスト

あたらしく `tests/meguru-phase4e4b-test.cjs`(5 本):

| | たしかめる こと |
|---|---|
| 1 | 曲がる はやさを 8 本 × 行き / 帰り × 初回 / 2 かいめ で 1 world ごとに はかる。MEDIUM は ひろげて 2 かいめ ≤ 28、4E-4A の 5 本は 4E-1 の 値の まま、2 かいめは どれも 1.4 倍 |
| 2 | 曲がる 量 = 4C の bend、両はしの むき、段ごとの 合計、帰りは さかさ + 180、出口で 曲率 0、着く むき、ひろげかたは `corridorTurnSpread` から |
| 3 | MEDIUM 3 本 × 行き / 帰り(2 かいめ・なかま 27): カメラの はやさ ≤ `RULES.cam.turnRate`・ふらつき(左右 反転)≤ 2・帯の そとへ 出ない・なかまが 1 frame で とばない・ひろがりは 4E-4A の home\|forest いか |
| 4 | 景色: 深い 海 / ふね / ジャングル なし・いろは ひとつの むき・森の ことばが 1 段で きえない・river_lake に 海 なし・city\|sea の まちがわ / 海がわ。**どの walk corridor でも(transition の 本も)道の はしは 端の 地域の いろ** |
| 5 | city の 3 出口 と mountain の 4 出口 の モード。special・HIGH は 許可リストに ない |

**8 本 の 不変(表)**: `meguru-phase4e4a-test.cjs` の 表を 8 本に した(許可リスト・spec・0.7 で preload・ready・二重 build なし・セーブの key・27 にん・2 かいめ 1.4・U ターン・reload・しっぱい 3 とおり・さきどり デコード・入口の したく・景色・出口)。本ごとの テストを 複製して いない。

**かえた 既存テスト**(許可リスト・曲がりの かたちに しばられて いた ところ だけ): 4E-1 の 5(出口の まっすぐは level 0 だけ)・6(初回で こえる 本は なし、2 かいめで こえるのは countryside\|forest だけ)・16 の export 表 / 4E-2 の 1 / 4E-3 の 11 / party-lod の 8(8 本)/ 4E-4A の 表と 6 / 8。

**わざと こわして 赤に なるのを たしかめた(10 とおり)**:

| こわしかた | 赤 |
|---|---|
| 1. turn spread を しない(いつも level 0) | 4e1-6・4e4a-2・4e4b-1 |
| 1b. ひろげた とき 曲がる 量が かわる | 4e1-5 / 6 / 9 / 10・4e4a-2 ほか 7 |
| 2. 許可リストから city\|sea を ぬく | 4e2-1・4e3-11・4e4a-1 / 3 / 4 ほか 9 |
| 3. まちがった 出口(さいしょの 候補) | 4e2-15・4e4a-3 / 5 / 6 / 8 |
| 3b. city\|countryside も corridor に | 4e2-1・4e3-11・4e4a-1 / 6 / 8 ほか 6 |
| 4. のこり きょり を こわす | 4e2・4e3 ほか 14 |
| 5. さきどり デコードを しない | 4e4a-6 |
| 6. 背景を 段ごとに もどす | 4e2-10・4e4a-7・4e4b-4 |
| 7. 端の いろを 端から 1 段 で かさねない | 4e4b-4(はじめは 見のがした → どの 本でも 端の いろ を たして 赤) |
| 8. まちの 運河 を けす | 4e4a-7 |

<!-- AFTER -->

