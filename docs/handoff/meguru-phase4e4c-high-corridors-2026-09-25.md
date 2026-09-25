# Phase 4E-4C — HIGH 2 本を あるいて こえる(walk 10 / 10)と Phase 4E の 完了 監査

日付: 2026-09-25 ／ 対象: `meguru.js`(曲がりの 表 1 行・許可リスト・景色の 表 1 行)／ 前提: [4E-4B](meguru-phase4e4b-medium-corridors-2026-09-24.md)(#341、main `742a406`)・[4E-4A](meguru-phase4e4a-low-corridors-2026-09-24.md)・[4E-4 Preflight 監査](../design/meguru-phase4e4-preflight-audit-2026-09-24.md)

**あるいて こえる 出口は 10 本 ぜんぶ**: 4E-4B までの 8 本に、HIGH 2 本 `city|countryside`・`countryside|forest`(行きと 帰り)を たした。walk の 出口で transition に のこる ものは もう ない。
special 3 本(ふね `jungle|sea`・もぐる `deepsea|sea`・ゴンドラ `countryside|star_stop`)と memory_lake(出口 なし)は transition の まま。

2 かいめの はやあし(1.4 倍)は **どの 本も そのまま**。はやさの 上限(speed cap)は **つかわない**(§1.3)。セーブの 形・`travelToRegion()`・世界地図・分母・party の LOD / cache・global collision は かえて いない。

---

## 0. 基準(main `742a406`)

| | |
|---|---|
| #341(4E-4B) | 最終確認: base main・head `f97d2c6`・Draft・mergeable clean・Runtime smoke / Home layout 緑・npm test 1333 / 1333・未対応 review なし → main へ マージ(`742a406`) |
| main `742a406` | npm test **1333 / 1333**(worktree で 実行)・Runtime smoke 緑・Home layout 緑・continuous 8 本・4E-4B handoff あり |
| 4E-4B の 事実(マージ前に たしかめなおし) | continuous 8・turn spread で 2 かいめ 26.3 / 25.8 / 27.2°/s・1.4 倍・のこり きょり の preload(810 / 1485)・道 ぜんぶ の さきどり デコード・背景は まんなかで 1 回・gate を まちがえない・なかま 27・入口 ≤ 60 ms・暗転 ≤ 300 ms・ready margin ≥ 1.0 秒・セーブ / たび / 世界地図 かわらず |
| 4E-4B が のこした こと | HIGH 2 本(`countryside|forest` は ramp 0 で 2 かいめ 28.7°/s の みこみ)・mountain に 着く ときの 暗転(300 ms ぎりぎり) |

4E-4B は **完了**(Preflight 監査 付録 B も 更新)。

---

## 1. やったこと

| | 中身 |
|---|---|
| **許可リスト 10 本** | `CONTINUOUS_WALK_ALLOWLIST` に `city|countryside`・`countryside|forest`。本ごとの `if` は ない |
| **一定 曲率(turn spread level 3)** | `CORRIDOR_TURN_SPREAD` に 4 だんめ `{ level: 3, margin: 0, ramp: 0 }` を 1 行。**道 ぜんぶ おなじ 曲率**(はしの 曲率の 上げ下げ なし)。`corridorTurnSpread` は いままで どおり「めやす 28°/s に おさまる いちばん ゆるい だん、どれも だめ なら いちばん 上」を えらぶ |
| **city\|countryside** | turn spread だけ(4E-4B の きまり の まま level 2)。はやさの 上限 なし |
| **景色(村の はし)** | `CORRIDOR_REGION_TERRAIN.countryside['urban-edge']`: 村の ちかくの まちはずれ は **countryside の いろ と ことば**(🌾 🌻 さく / 🏡 🌳 わら)。地形 × 地域 の 表に 1 行。いままでは 地形 `urban-edge` の きまった いろ = home の いえなみ(🏠 🌷 🌼 🪴)が countryside\|forest の 村がわに 出て いた |
| **そのまま つかう もの** | のこり きょり の preload(810 / 1485。本ごとの しきい なし)・道 ぜんぶ の さきどり デコード・入口の したく(二重 build なし)・着いた 暗転の あいだは さきどり しない・背景は まんなかで 1 回・端の いろ の きまり・障害物は ふやさない |

### 1.1 一定 曲率(countryside\|forest)

- 曲がる 量 177.7°(ほぼ U ターン)を 5 段(2250)ぜんぶで 同じ 曲率 0.0790°/world で 曲がる。**曲がる 量・両はしの むき・ぎゃく むき の かたち は 4E-1 の まま**(テスト 4e4c-2)
- いちばん はやい 曲がり = 平均 = 177.7 ÷ 2250 × 260 = **20.5°/s(初回)/ 28.7°/s(2 かいめ 1.4 倍)**。30 いか、できれば 29 いか を みたす
- 出口では 曲率が いきなり 0.079°/world に なる(ramp 0)。むき は 連続(かどは ない)で、1 world の むきの かわり は 0.079°(1 frame 0.34〜0.48°)。カメラ は `RULES.cam.turnRate` で おう ので とばない(§4・テスト 4e4c-3)

### 1.2 曲がりの 表(10 本。1 world ごとの 実測、°/s = はやさ 260 × 倍率)

| corridor | 曲がる 量 | 段 | level(ひろげかた) | 初回 | **2 かいめ(× 1.4)** | 倍率 |
|---|---|---|---|---|---|---|
| home\|forest | 75.2° | 6 | 0(4E-1 の まま) | 10.9 | 15.2 | 1.4 |
| home\|river_lake | 43.0° | 6 | 0 | 6.2 | 8.7 | 1.4 |
| city\|desert | 60.1° | 6 | 0 | 8.7 | 12.2 | 1.4 |
| desert\|mountain | 49.5° | 6 | 0 | 7.1 | 10.0 | 1.4 |
| snow\|mountain | 130.7° | 6 | 0 | 18.9 | 26.4 | 1.4 |
| forest\|mountain | 155.9° | 6 | 1(道 ぜんぶ・ramp 0.2) | 18.8 | 26.3 | 1.4 |
| mountain\|river_lake | 171.9° | 6 | 2(道 ぜんぶ・ramp 0.1) | 18.4 | 25.8 | 1.4 |
| city\|sea | 161.5° | 6 | 1 | 19.4 | 27.2 | 1.4 |
| **city\|countryside** | 173.2° | 6 | **2** | **18.5** | **26.0** | 1.4 |
| **countryside\|forest** | 177.7° | 5 | **3(一定 曲率)** | **20.5** | **28.7** | 1.4 |

10 本 とも 2 かいめ **≤ 28.75°/s**(30 いか)。行きと 帰りは 同じ かたちを さかさ に つかう ので、帰りの 実測も 同じ(4e4b-1 で 20 方向)。

### 1.3 はやさの 上限(speed cap)の 判断: **A. 一定 曲率 + 1.4 倍(上限 なし)**

| 案 | 2 かいめ | 判断 |
|---|---|---|
| **A. 一定 曲率 + 1.4 倍** | 28.7°/s | **採用**。めやす 30 / できれば 29 を みたす。カメラ・なかま・帯・酔いにくさ(§4)に わるい ところが 見えなかった |
| B. 一定 曲率 + 1.25 倍 の 上限 | 25.7°/s | つかわない。上限を いれる と 2 かいめ だけ この 本が おそく なり(6.2 → 6.9 秒)、「2 かいめは はやあし」の きまりが 本ごとに かわる。A で たりて いる |

上限を いれる ときの ために 考えた かたち(いれて いない): 本ごとの `if` では なく、`corridorTurnSpread` の いちばん 上の だんでも めやすを こえる 本に `maxRevisitSpeedMultiplier` を 1 つ きめる きまり。

---

## 2. 景色(スクリーンショット: 2 本 × 行き / 帰り × 0 / 20 / 40 / 60 / 80 / 100 %)

<<SHOTS>>

| | 出発 → 到着 | 見えかた |
|---|---|---|
| `city\|countryside` | まち(灰) → まちはずれ → 畑 → 坂 → 尾根 → 坂 → 畑 → 村 | 地面 #5d626f → #758176 → #8f9580 → #979e82 → #a5b686 → #b8d98a(灰 → 緑、もどらない。もどり 0.010)。まちがわ は 🪧 🏢 🗑️ 🚲 🏬、村がわ は 🌾 🌻 🌳 わら 🏡。背景 neonskyline → farhills(まんなかで 1 回)。home の いえなみ・海 は 出ない |
| `countryside\|forest` | 村・畑 → 坂 → 雑木林 → 深い 森 | #b8d98a → #acd083 → #9bab80 → #8bbb72 → #7fb26b(もどり 0.000)。村がわ は 🌻 🌳 さく 🌾 🏡、まんなか は 🌲 🌿 🪨、森がわ は 🌲 🍄 🪵 🍂 しだ。背景 farhills → treeline(まんなかで 1 回)。**home の いえなみ(🏠 🌷 🌼 🪴)・home の いろ は 出ない**(村の はし は countryside の いろ) |

- 遠景(DistantFeature)は 4D-2 / 4E-2 の まま(出発 がわ → 到着 がわ を まんなかで まぜる)。**ゴンドラ(星の とまりば)の ひかり(`sky_light`)は `countryside|star_stop` を みつける まで 出ない**(4e4c-6 で、あるいて いる あいだ わたす 遠景に ない ことを たしかめた)
- 星の とまりば の ことば(⭐ 🌟 ✨ 🚡 🌙)は countryside\|forest の 段に 出ない(4e4c-5)
- あたらしい 絵は ない

## 3. 出口(gate)

**gate の 表(13 地域 × 出口。テスト 4e4c-8 で 26 行 を 1 行ずつ しばる)**

| 地域 | 出口(connection)→ spot | mode |
|---|---|---|
| home | forest(bigtree → entry)・river_lake(bigtree → riverside) | corridor・corridor |
| city | desert(stalls → caravan)・sea(boatpier → port)・**countryside(cross4 → terracelook)** | corridor ×3 |
| countryside | **city(terracelook → cross4)・forest(woods → anc2)**・star_stop ゴンドラ(skyland → stop) | corridor・corridor・**transition** |
| forest | home(entry)・mountain(stonelook)・**countryside(anc2 → woods)** | corridor ×3 |
| mountain | desert・forest・river_lake・snow | corridor ×4 |
| river_lake | home・mountain | corridor ×2 |
| desert | city・mountain | corridor ×2 |
| snow | mountain | corridor |
| sea | city(port → boatpier)・jungle ふね(breakwater)・deepsea もぐる(seacave) | corridor・transition・transition |
| jungle / deepsea / star_stop | ふね / もぐる / ゴンドラ | transition |
| memory_lake | 出口 なし | — |

walk の 20 出口(10 本 × 2)が corridor、special の 6 出口 が transition。むきで 1 つに きまり、まちがった 出口から 出ない(4E-4A テスト 8 に countryside を たした)。

**special の 表(4e4c-9)**: ふね・もぐる・ゴンドラ は 許可リストに ない・walk の spec が ない・**許可リストに いれても** `not-walk` で transition。

---

## 4. 性能(CPU 4 倍・390 × 844・DPR 3。あるいて 入る)

<<PERF>>

## 5. メモリ

<<MEM>>

## 6. なかま 27 にん

<<P27>>

## 7. 実画面(3 サイズ)

<<UI>>

## 8. テスト

あたらしく `tests/meguru-phase4e4c-test.cjs`(10 本):

| | たしかめる こと |
|---|---|
| 1 | 曲がりの 表(10 本): 2 かいめ ≤ 30・倍率 1.4・はやさの 上限 の もの が ない・えらばれた level = `corridorTurnSpread`。city\|countryside = level 2(≤ 28)、countryside\|forest = level 3(≤ 29) |
| 2 | countryside\|forest の 一定 曲率: 行き / 帰り とも 道 ぜんぶ 同じ はやさ。曲がる 量 = bend・両はし の むき・ぎゃく むき。city\|countryside は はしを ゆるめる |
| 3 | カメラ・なかま 27・帯: HIGH 2 本 × 行き / 帰り(2 かいめ)+ 60 % で U ターン して もどりきる。カメラ ≤ `RULES.cam.turnRate`・ふらつき ≤ 2・なかまが 1 frame で とばない・ひろがり ≤ home\|forest |
| 4 | 景色 city\|countryside: まちがわ / 村がわ の ことば・home の いえ / 海 なし・いろ ひとつの むき・背景 1 回 |
| 5 | 景色 countryside\|forest: 村の はし の 表(countryside の いろ・home の ことば なし)・村 → 森 で 森の ことば が ふえる・森がわ 2 段・星の ことば なし・いろ・背景 1 回 |
| 6 | start() で HIGH 2 本 を 行き → 帰り → 行き: たび / ちず は つかえない・もどる は つかえる・はなす(context)は 出ない・着くと もとどおり・遠景に ゴンドラ の ひかり なし・はっけんは 1 回・preload 3 回 commit / fallback 0 |
| 7 | HIGH 2 本 の fallback: reduced motion / perfTier 2 は transition で 着く(corridor 0)。しっぱい → build-failure |
| 8 | gate の 表(13 地域 26 行)・memory_lake 出口 なし・countryside の 3 出口 |
| 9 | special の 表(3 本 × 両がわ) |
| 10 | 端の いろ の きまり: 10 本 の 端の 段を ほかの 地域の いろの 地形に かえても、道の はし は 端の 地域の いろ |

**10 本 の 不変(表)**: `meguru-phase4e4a-test.cjs` の 表(許可リスト・spec・のこり 810 で preload・ready・二重 build なし・セーブの key・27 にん・2 かいめ 1.4・U ターン・reload・しっぱい 3 とおり・さきどり デコード・入口の したく・景色・出口)を 10 本 に した。5 段 の countryside\|forest は のこり 810 = 0.64。本ごとの テストは 複製 して いない。しくみ の テスト(4E-3 の じょうたい・10 往復 など)も そのまま。

**かえた 既存テスト**(許可リスト・曲がりの かたち に しばられて いた ところ だけ): 4E-1 の 5(一定 曲率 は 出口の 曲率 ≠ 0)・6(2 かいめで 30 を こえる 本 は なし)/ 4E-2 の 1・17(walk で ない 出口 = ゴンドラ)/ 4E-3 の 11・party-lod の 8(10 本)/ 4E-4A の 表・2(5 段 = 0.64)・4(道の ながさ)・6(corridor に ならない 出口 = ゴンドラ)・8(countryside の 出口)/ 4E-4B の 1・2・5。

**わざと こわして 赤に なるのを たしかめた**:

<<MUT>>

## 9. かわらない もの

- spot 471 / 地区 654 / みち 118 / しるし 107、地域の かず 11 / 12 / 17 / 103、connection 14・gate 13・corridor 13・DistantFeature 37(既存テストで 固定)
- セーブの 形・`travelToRegion()`・世界地図・分母・special(ふね・ゴンドラ・もぐる)・memory_lake
- corridor の なかの 住民 0 にん。なかまの ならび / LOD / cache
- 状態機械・のこり きょり(810 / 1485)・さきどり デコード・入口の したく・着いた 暗転の あいだは さきどり しない
- 2 かいめの はやさ 1.4(どの 本も)。はやさの 上限 なし
- 障害物(帯の はしの いし)は ふやして いない。global collision は ない
- `meguru.js` は わけて いない。`buildWorld` は かえて いない。表情・カードゲーム は さわって いない

<<AUDIT>>
