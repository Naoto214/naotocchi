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

<!-- TURN -->

---

<!-- REST -->
