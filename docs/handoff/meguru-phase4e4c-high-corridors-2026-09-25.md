# Phase 4E-4C — HIGH 2 本を あるいて こえる(walk 10 / 10)と Phase 4E の 完了 監査

日付: 2026-09-25 ／ 対象: `meguru.js`(曲がりの 表 1 行・許可リスト・景色の 表 1 行)／ 前提: [4E-4B](meguru-phase4e4b-medium-corridors-2026-09-24.md)(#341、main `742a406`)・[4E-4A](meguru-phase4e4a-low-corridors-2026-09-24.md)・[4E-4 Preflight 監査](../design/meguru-phase4e4-preflight-audit-2026-09-24.md)

**あるいて こえる 出口は 10 本 ぜんぶ**: 4E-4B までの 8 本に、HIGH 2 本 `city|countryside`・`countryside|forest`(行きと 帰り)を たした。walk の 出口で transition に のこる ものは もう ない。
special 3 本(ふね `jungle|sea`・もぐる `deepsea|sea`・ゴンドラ `countryside|star_stop`)と memory_lake(出口 なし)は transition の まま。

2 かいめの はやあし(1.4 倍)は **どの 本も そのまま**。はやさの 上限(speed cap)は **つかわない**(§1.3)。セーブの 形・`travelToRegion()`・世界地図・分母・party の LOD / cache・global collision は かえて いない。


> ## 追記(2026-09-25)— #342 マージ・**Phase 4E 完了**
>
> #342 は main へ マージ(`671fa90`、npm test 1343 / 1343)。ユーザー 判断 で、下の 性能 2 点 と なかま の 障害物 バグ は **Phase 4E の blocker に しない**:
> - A. forest / mountain に 着く ときの 暗転 が CPU 4 倍 で まれ に 300 ms を こえる(§4.3)→ Release Hardening / renderer 性能
> - B. city\|countryside の corridor p95 26〜30 ms(§4.4)→ Release Hardening / renderer 性能
> - なかま が 障害物 に めりこむ(transition でも 同じ、§6)→ RH-7
>
> 理由: 既存 の 地域 の 描画 でも 同じ 傾向・continuous corridor 固有 の 破綻 で ない・preload / ready / commit / save / fallback は 正常・CPU 等倍 では 小さい。
> よって §10〜§12 の「『Phase 4E 完了』は 宣言 しない」は この 追記 で おきかえ、**Phase 4E continuous corridor は 完了** と する([まとめ](meguru-phase4e-completion-2026-09-25.md))。

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

スクリーンショットは 計測用コピー(probe)で 390 × 844・DPR 3・なかま 8。2 本 × 行き / 帰り の 8 まい つづき(出発・2 / 20 / 40 / 60 / 80 / 98 %・着いた ところ)。リポジトリには いれて いない(PR の コメントで わたす)。

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

はかりかた: 4E-4A / 4E-4B と おなじ(出口の 260 てまえ から 上を おしつづけ **あるいて** こえる。1 ページで A→B 初回 → B→A 2 かいめ → A→B 2 かいめ)。計測 だけの コピー(probe5 = この PR の コード + 時間を はかる 行)。
entry max = corridor に 入る 1 frame まえ 〜 6 frame あと の いちばん ながい frame。first visible = 着いた がわの さいしょの frame。arrival = 暗く なりはじめて から あけきる まで。

### 4.1 HIGH 2 本 × 行き / 帰り × 3 セット(なかま 8、36 回)

| corridor 向き | 回 | entry max | corridor p95 | prepare max(組む frame / うち 組む しごと) | ready margin 最小 | arrival 中央 / 最大 | first visible 最大 | カメラ °/s 最大 / 反転 | heap 最大 | decode | fallback / エラー |
|---|---|---|---|---|---|---|---|---|---|---|---|
| city\|countryside city→countryside | 9 | 38.2 | 26.6 | 71.1 / 41.1 | 1646 | 233 / 283 | 17.3 | 28.8 / 1 | 60.8 MB | 18 MB | 0 / 0 |
| city\|countryside countryside→city | 9 | 38.6 | 30.1 | 74.9 / 16.1 | 1709 | 233 / 283 | 23.9 | 37.1 / 0 | 60.6 MB | 18 MB | 0 / 0 |
| countryside\|forest countryside→forest | 9 | 35.7 | 25.9 | 39.5 / 23.5 | 1755 | 267 / 333 | 19.4 | 51.3 / 1 | 60.5 MB | 18 MB | 0 / 0 |
| countryside\|forest forest→countryside | 9 | 41.4 | 22.7 | 37.3 / 24.3 | 1691 | 233 / 267 | 19.3 | 29.5 / 0 | 60.6 MB | 18 MB | 0 / 0 |

| まとめ(HIGH 36 回) | 値 | 目標 |
|---|---|---|
| entry max 初回 / 2 かいめ(中央値) | 41.4 / 33.7 ms(27.7) | ≤ 60(100 こえ なし) ✅ |
| ready margin 最小 初回 / 2 かいめ | 2600 / **1646 ms** | ≥ 1000 ✅(countryside\|forest 2 かいめ 1691〜2187) |
| arrival 中央 / 最大 | **250 / 333 ms**(300 こえ 1 / 36) | ≤ 250 / ≤ 300 △(§4.3) |
| first visible 最大 | 23.9 ms | 〜20 ✅(ほぼ) |
| corridor p95 最大(p50 中央) | 30.1 ms(12.2) | 4E-4A 21〜27 / 4E-4B ≤ 23.5。city\|countryside だけ 26〜30 △ |
| 組む しごと(1 frame の preload)最大 | 41.1 ms | 4E-4A / B の 42.9〜49.9 と 同じ ✅ |
| 組む frame ぜんたい 最大 | 74.9 ms | △ 組む しごと は 12〜16 ms で、のこりは まち がわ の 絵(🏢 の はじめての 立て看板 8 ms など)。§4.4 |
| fallback・二重 build・エラー・walkFail | 0 / 0 / 0 / 0 | 0 ✅ |
| さきどり デコード | 1 出口 1 回(requests 2 / done 2 / failed 0)・atlas 3 まい | ✅ |
| 入口の したく | builds 2〜5 / reuses 1〜3(入る たびに 1 回 つかう)・fails 0 | ✅ |

- **のこり きょり の preload(810)を 5 段 でも そのまま**: countryside\|forest(2250)は 0.64 から 組みはじめ、2 かいめ(1.4 倍)でも 着く **1.69〜2.19 秒 まえ** に ready。6 段と 同じ のこり じかん に なる(割合 では ない ので)
- **一定 曲率 で 入口 / 出口は 重く ならない**: 曲がりは spec を 組む ときに 1 回 きまる だけ。カメラの むきの はやさ は 上限(`RULES.cam.turnRate` 109°/s)いか。いちばん 大きい 51°/s は countryside→forest の 入口で カメラ を 道の むき に あわせる ところ(4E-4B の city\|sea 88°/s と 同じ しくみ)
- **CPU 1 倍**(HIGH × 行き / 帰り、12 回): entry max 9.1 ms・p95 4.1・暗転 200 / 217 ms・first visible 5.4

### 4.2 代表 5 本(1 往復)・mountain に 着く(3 回)・同じ 日の LOW / MEDIUM

| | 回 | entry max | p95 最大 | margin 最小 | arrival 中央 / 最大(300 こえ) |
|---|---|---|---|---|---|
| 代表 5 本(home\|forest・home\|river_lake・city\|sea・desert\|mountain・snow\|mountain)| 10 | 44.0 | 24.9 | 1739 | 233 / 333(1) |
| mountain に 着く / 出る(desert・forest・snow × 3 回) | 27 | 42.0 | 24.3 | 1667 | 250 / 400(4) |
| 同じ セッション の LOW / MEDIUM(home\|forest・forest\|mountain・city\|sea × 往復 × 2) | 18 | 59.6 | 25.5 | 1805 | 250 / 400(2) |
| **HIGH ぜんぶ(上の 36 + 同じ コードの 再測定 24)** | 60 | 54.1 | 30.1 | 1646 | **233 / 417(3)** |

mountain に 着く 18 回: 200・300・250・267・250・200・267・317・283・233・283・300・250・250・317・217・217・233(中央 250、300 こえ 2 回)。

### 4.3 着く ときの 暗転(300 ms を こえる とき)

- HIGH の 300 こえ 3 回 は **ぜんぶ countryside→forest**(333・417・317)。この 向きの 中央値 は 267 ms(18 回)。ほかの 3 向き は 中央 217〜233、最大 283
- **同じ セッション で すでに マージ ずみ の 本も こえる**: forest\|mountain mountain→forest 400 / 333 / 350、mountain→snow 400、city→sea 333、desert→mountain 317。HIGH だけ の こと では ない
- わけると、corridor の ぶん(commit 6〜14 ms・first draw 0 ms(warm が まにあった とき))は 小さく、**着いた 地域 そのものの frame**(CPU 4 倍・DPR 3 で forest の ふだんの frame が p50 34.5 / p95 48.7 ms、mountain 33 / 50、city 30 / 44)が 暗転の あけ(0.12 秒)の あいだ に 2〜3 まい はいる ことで のびる。はじめて えがく 小さな 絵(🌿 🌱 🍂 🪧 の 立て看板 8〜9 ms)が 1〜2 こ かさなる と 330〜420 ms
- 暗転の あけ は もう じっさいの 時間(`perfNow`)で すすむ ので、dt の 上限 では のびない。warm の 回数(24 → 48)を かえても なおらない(かえって warm が まにあわず first draw 40〜67 ms が でる。A/B 12 回 ずつ で たしかめた)
- → **森 / 山 に 着く ときの 暗転 最大 ≤ 300 は CPU 4 倍 では まもりきれない**。corridor の しくみ では なく 地域の えがく おもさ の もんだい として Release Hardening(性能)に わたす(§11)

### 4.4 corridor の なかで 60 ms を こえる frame

- HIGH 36 回で 8 こ(ready / 組む ところ、62〜114 ms)。**同じ セッション で ほかの 本も 同じ くらい**(1 往復 × 2 の dump: countryside\|forest 2・forest\|mountain 3・home\|forest 2(最大 127 ms)・city\|countryside 0・city\|sea 0。あるく frame の 0.2 %)
- 中身: warm(着く がわの 絵の したく、1 / 24)と その 本の 終わり ちかくの 絵 と はじめての 立て看板 が 1 frame に かさなる とき。HIGH で ふえた もの では ない(4E-2 の home\|forest にも ある)
- corridor p95 は city\|countryside だけ 26〜30 ms(ほかは ≤ 26)。まちがわ の ビル と 尾根の いし が 見える 区間

### 4.5 U ターン(なかま 27、実画面)

HIGH 2 本 × 行き / 帰り、60 % で 下 を おして ひきかえす: 4 回 とも 出発 地域 の 同じ 出口へ もどる・エラー 0・preload は まだ はじまる まえ(0.60 < 0.64 / 0.70)で なにも のこらない。カメラ は 180° まわる ので 上限 109°/s で まわる(とばない)。なかま 27 にん は うしろ に まとまった まま(スクリーンショット あり)。

## 5. メモリ

| | 4E-4B | 4E-4C |
|---|---|---|
| JS ヒープ さいだい(gc の あと、なかま 8 / 27) | 60.4 MB | **60.8 MB / 60.5 MB** |
| デコードした 絵(ImageBitmap) | さいだい 18 MB(atlas 3 まい) | **18 MB(atlas 3 まい)** |
| 組んだ 着く がわ の world | 1 つ | **1 つ**(10 本 に しても 同時に もつのは 1 つ) |
| 入口の したくで もつ corridor world | 2 出口 まで | 2 出口 まで(countryside は 出口 3 つ だが ゴンドラ は corridor で ない) |

いちばん おおい とき = 出発 地域の world + corridor の world + 組んだ 着く がわ の world(1)+ なかま の 絵の cache + デコードした atlas(3 まい)。ready の ときの ヒープ が 60.8 MB(4E-4B 60.4 MB と ほぼ 同じ)。

## 6. なかま 27 にん

CPU 4 倍、HIGH 2 本 × 行き / 帰り + せまい 代表 snow\|mountain(15 回): entry max 43.3 ms・corridor p95 最大 27.1・組む しごと 最大 31.1・ready margin 最小 1609 ms・暗転 中央 233 / 最大 383(countryside→forest)・first visible 最大 56 ms。
着いた とき 27 にん みんな べつの ばしょ・帯の そとへ 出ない(4E-4A テスト 3 / 4E-4C テスト 3)。

**なかま が 障害物に めりこむ いまの バグ**: 着いた ところ で 1〜2 にん が 障害物に かさなる(city の cross4・forest の anc2・snow の peak)。**transition で 着いても 同じ**(harness、27 にん: countryside→city corridor 2 / transition 2(1.5 秒後 10)、countryside→forest 2 / 2、mountain→snow 1 / 2)。corridor の もの では ない ので **RH-7** に わたす(直して いない)。

## 7. 実画面(3 サイズ)

390 × 844・375 × 667・360 × 640(DPR 2)× HIGH 2 本: **6 / 6 PASS**。
あるく あいだ: パッド あり(4 キー)・たび / ちず は つかえない・もどる は つかえる・はなす(context)は 出ない・はっけん の 札 なし・はみ出し 0・よこ スクロール 0・JS エラー 0。着いた あと: たび / ちず が もどる・corridor の のこり なし。

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

| こわしかた | 赤 |
|---|---|
| 1. 許可リスト から city\|countryside を ぬく | 14(4e2-1・4e3-11・4e4a-1 / 3・4e4c-1 / 6 / 8 ほか) |
| 2. 許可リスト から countryside\|forest を ぬく | 13(同じ ところ) |
| 3. 一定 曲率(level 3)を けす | 6(4e1-6・4e4a-2・4e4b-1 / 2・4e4c-1 / 2) |
| 4. まちがった 出口(さいしょの 候補) | 5(4e2-15・4e4a-3 / 5 / 6 / 8) |
| 5. countryside の ゴンドラ を 許可リスト へ | 7(4e2-1・4e3-11・4e4a-1・4e4b-5 ほか) |
| 6. のこり きょり の 組みはじめ を こわす | 17(4e2・4e3・4e4a ほか) |
| 7. 端の いろ(端から 1 段 で かさねる)を こわす | 1(4e4c-10)。**はじめは 見のがした**: 4E-4C の 村の はし で、10 本 とも 端の 段が 端の 地域の いろ に なり、この きまり を つかう 本が なくなった。地形を かえた spec で きまり を しばる テスト 10 を たして 赤 |
| 8. 背景を 段ごとに もどす | 5(4e2-10・4e4a-7・4e4b-4・4e4c-4 / 5) |
| 9. 村の はし の うわがき を けす(home の いえなみ に もどる) | 1(4e4c-5) |
| 10. level 2 を とばす(city\|countryside も 一定 曲率) | 4(4e1-6・4e4b-2・4e4c-1 / 2) |

はやさの 上限 は つかって いない ので「上限を けす」mutation は ない。

## 9. かわらない もの

- spot 471 / 地区 654 / みち 118 / しるし 107、地域の かず 11 / 12 / 17 / 103、connection 14・gate 13・corridor 13・DistantFeature 37(既存テストで 固定)
- セーブの 形・`travelToRegion()`・世界地図・分母・special(ふね・ゴンドラ・もぐる)・memory_lake
- corridor の なかの 住民 0 にん。なかまの ならび / LOD / cache
- 状態機械・のこり きょり(810 / 1485)・さきどり デコード・入口の したく・着いた 暗転の あいだは さきどり しない
- 2 かいめの はやさ 1.4(どの 本も)。はやさの 上限 なし
- 障害物(帯の はしの いし)は ふやして いない。global collision は ない
- `meguru.js` は わけて いない。`buildWorld` は かえて いない。表情・カードゲーム は さわって いない

## 10. 判定: **B. 条件つき 採用**(はやさの 上限: **A. 一定 曲率 + 1.4 倍**)

- **HIGH 2 本 を あるいて こえる**: 両方向・初回 / 2 かいめ・U ターン・reload・fallback・なかま 27 で うごく(テスト + 実画面)。fallback 0・エラー 0・二重 build 0
- 曲がる はやさ 2 かいめ **26.0 / 28.7°/s**(10 本 とも ≤ 28.75)。はやさの 上限 なし
- 景色: まち → 畑 → 村、村 → 雑木林 → 深い 森。home の いえなみ なし・背景 1 回・星の ことば / ゴンドラ の ひかり なし
- 入口 ≤ 54 ms・ready margin ≥ 1.65 秒・組む しごと ≤ 41 ms・メモリ 4E-4B と 同じ・3 サイズ 6 / 6
- **条件(のこる こと)**: ① countryside→forest の 暗転 が 中央 267 ms・最大 417 ms(60 回 中 3 回 300 こえ)。同じ 日に マージ ずみ の forest\|mountain・mountain 着 でも 300〜400 ms が でて おり、着いた 地域 の えがく おもさ(§4.3)。② city\|countryside の corridor p95 が 26〜30 ms(目標 25)
- どちらも 本ごとの しくみ で なく、直すなら 地域 の えがく おもさ(forest / mountain / city)を かるく する 仕事。4E-4C の 中では 直さない

## 11. Phase 4E 完了 監査(4E-1 〜 4E-4C)

| 項目 | 結果 | どこで |
|---|---|---|
| walk 10 / 10 を あるいて こえる | ✅ 20 出口(10 本 × 両方向)が corridor | 4e4c-8(gate 表)・4e4a 表 |
| special 3(ふね・もぐる・ゴンドラ) | ✅ transition の まま(許可リスト に いれても) | 4e4c-9・4e2-17 |
| memory_lake | ✅ 出口 なし・かわらず | 4e4c-8 |
| セーブ | ✅ 形 かわらず・corridor の じょうたい を もたない・正本 は 着く まで 出発 地域 | 4e4a-3 / 4・4e2-12 |
| reload | ✅ 出発 地域 から(組みかけ / ready どちらも のこらない) | 4e4a-4(9 本)・4e2 |
| fallback(しっぱい・reduced motion・perfTier 2) | ✅ transition で 着く | 4e4a-5・4e4c-7・4e2-2 |
| なかま(27 にん・ならび・LOD / cache) | ✅ corridor の なかは とばない・ひろがらない・着いて かさならない | 4e4a-3・4e4b-3・4e4c-3・party-lod |
| preload(のこり きょり 810 / 1485) | ✅ 10 本 × 両方向 で commit、二重 build 0、margin ≥ 1.6 秒 | §4 |
| 景色(端の いろ・背景 1 回・地域 × 地形) | ✅ | 4e4a-7・4e4b-4・4e4c-4 / 5 / 10 |
| 曲がり(10 本 ≤ 30°/s、上限 なし) | ✅ さいだい 28.7 | 4e4b-1・4e4c-1 / 2 |
| 性能: 入口 ≤ 60 / margin ≥ 1.0 / 組む しごと / メモリ | ✅ | §4・§5 |
| 性能: 暗転 中央 ≤ 250 / 最大 ≤ 300 | **△ 中央 233 は ◯、最大 は 森 / 山 に 着く とき 300〜417**(マージ ずみ の 本 も 同じ) | §4.3 |
| 性能: 歩く p95 ≤ 25(なかま 8) | **△ city\|countryside 26〜30**(ほかは ≤ 26) | §4.4 |
| mobile(3 サイズ) | ✅ 4E-2 〜 4E-4C の 各 本 で PASS | 各 handoff |

**「Phase 4E 完了」は 宣言 しない**(ぜんぶ を みたした とき だけ、の きまり)。機能(walk 10 / 10・special・セーブ・reload・fallback・なかま・preload・景色・曲がり・mobile)は すべて 完了。のこる のは 性能 の 2 点(上の △)だけ で、どちらも corridor の しくみ の 外(着いた 地域 / まち の えがく おもさ)。

**なかま が 障害物に めりこむ バグ** は transition でも 同じ に でる ので Phase 4E を とめない(**RH-7**)。

## 12. Release Hardening へ すすむ 条件

- [x] walk 10 / 10・special 3・memory_lake・セーブ・reload・fallback・なかま・preload・景色・曲がり・mobile
- [x] npm test **1343 / 1343**(この PR。4E-4C の 10 本 を たした)・mutation 10 とおり 赤
- [ ] この PR の CI 緑・main へ マージ
- [ ] **すすんで よい**。ただし RH の はじめ に「森 / 山 に 着く 暗転 の 最大」と「city\|countryside の p95」を 性能 項目 として いれる こと(地域 の えがく おもさ を かるく する。corridor の しくみ は さわらなくて よい)。4E の 中で もう 1 段(4E-4D)で やる か は ユーザー の 判断
- RH-7: なかま が 障害物に めりこむ(transition でも 同じ)

## 13. やって いない こと

- なかま が 障害物に めりこむ バグ の 修正(RH-7)・RH-4 〜 RH-7
- 地域 の えがく おもさ の 最適化(§4.3 / §4.4)
- global collision・住民の 地域間 移動・セーブの 形の 変更・Three.js・`meguru.js` の 分割・`buildWorld` の 作りなおし
- 自動 check-in
