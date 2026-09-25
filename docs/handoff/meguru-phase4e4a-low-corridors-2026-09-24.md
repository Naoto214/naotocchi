# Phase 4E-4A — LOW 4 本を あるいて こえる(continuous corridor の 展開)

日付: 2026-09-24 ／ 対象: `meguru.js`・`canvas-illustrations.js`・`script.js`(2 行)／ 前提: [4E-4 Preflight 監査](../design/meguru-phase4e4-preflight-audit-2026-09-24.md)(#339、main `c7705d8`)・[4E-3 preload](meguru-phase4e3-corridor-preload-2026-09-24.md)・[4E-2 PoC](meguru-phase4e2-home-forest-poc-2026-09-23.md)

**あるいて こえる 出口は 5 本**: 4E-2 からの `home|forest` と、今回の LOW 4 本 `home|river_lake`・`city|desert`・`desert|mountain`・`snow|mountain`(行きと 帰り)。
MEDIUM 3 本(`forest|mountain`・`mountain|river_lake`・`city|sea`)と HIGH 2 本(`countryside|forest`・`city|countryside`)・special(ふね / ゴンドラ / もぐる)・memory_lake は **いまの transition の まま**。`countryside|forest` の はやさの 上限は 入れて いない。

セーブの 形・`travelToRegion()`・世界地図・分母・party の ならび / LOD / cache・住民(corridor の なかは 0 にん)・global collision は かえて いない。

---

## 0. 基準(main `c7705d8`)

| | |
|---|---|
| #339(4E-4 Preflight) | main へ マージ(`c7705d8`)。Runtime smoke 緑(文書だけの PR なので Home layout は 走らない) |
| npm test | 1318 / 1318 |
| Preflight の 宿題 | ① 入口の 1 frame が 重い(140〜186 ms・CPU 4 倍。原因は 1254² の atlas を はじめて えがく ときの デコード)② 景色が 段ごとに 背景を 行ったり来たり する ③ `home|river_lake` の 岸に 海(砂・ヨット)が 出る ④ 組みはじめ 0.7 が 割合なので 道の 長さで 余裕が かわる |

---

## 1. やったこと

| | 中身 |
|---|---|
| **許可リスト** | `CONTINUOUS_WALK_ALLOWLIST` = 5 本。本ごとの `if` は ない(ぜんぶ 4E-1 の spec と 地形 terrain・両端の 地域 から) |
| **組みはじめ = 道の のこり きょり** | 割合を やめ、「着く まえに のこす 時間」から きめる(§2)。`startRemaining` 810・`disposeRemaining` 1485 |
| **絵の さきどり デコード** | 出口に ちかづいたら(spot の はし から 360)その corridor の 絵を **main thread の そとで** デコード(`fetch → Blob → createImageBitmap`)。1 セッション 1 出口 1 回(§3) |
| **入口の したく** | デコードが おわったら、その corridor の world を **さきに 1 回だけ** 組み、入口で それを そのまま つかう(二重に 組まない)。入口の カメラから 見える 立て看板(glyph)を 16 frame に わけて さきに つくる(§4) |
| **景色(いろ)** | 地面・みちの いろ = 出発 → 到着 の まっすぐな まぜ + 段の 地面の 種類の いろ(0.55)。種類の いろが 端の 地域の もの なら その 端から はなれる ほど よわく(`(1−t)²` / `t²`)。さばく → 岩 → さばく → 山 のような 行き戻りが ない(§5) |
| **景色(背景・空)** | 背景(backdrop)と 空は **両端の 地域の もの だけ**、まんなか(t = 0.5)で 1 回 だけ かわる。遠景(DistantFeature)の まざりの まんなか と 同じ ところ |
| **景色(ことば)** | 段の 地面の 種類の ことば に、前半は 出発 地域の ことば、後半は 到着 地域の ことば を 最大 5 わり まぜる。`river_lake.shore`・`city.urban-edge`・`city.road`・`desert.road` は その 地域の ことば / いろ に さしかえ(`CORRIDOR_REGION_TERRAIN`)。**あたらしい 絵は ない**(もう ある 絵文字 と 地域の いろ だけ) |
| **段の まざり** | `CORRIDOR_BLEND` 0.3 → 0.5(段の さかいで 地面が かわる はばを ひろく) |
| `canvas-illustrations.js` | `prepare(list, { decode: true })`。デコードした ImageBitmap は **いまの 画像の entry に もたせる**(べつの キャッシュを つくらない)。version は かえない(ピクセルは 同じ なので glyph は そのまま つかえる)。こけたら いつもどおり 画像で えがく。`decoded`(count / bytes / failed) |
| `script.js` | `prepareIllustrations(scenery, actors, opts)` が opts を わたす。`illustrationDecoded()`(しらべもの) |

4E-4A の コードは ぜんぶ 4E-2 の 印(`// ====== Phase 4E-2 …`)の なか か 行末 `// Phase 4E-2` で、4E-2 を けすと いっしょに きえる(4D-2 の remove-it テストで たしかめて いる)。

---

## 2. 組みはじめ・すてる ばしょ(道の のこり きょり)

```
CORRIDOR_PRELOAD_LEAD = { readySec: 1.0, marginSec: 1.2, hysteresisStages: 1.5 }
leadSec         = readySec + marginSec = 2.2 秒
revisit の はやさ = RULES.playerSpeed 260 × CORRIDOR_REVISIT_SPEED 1.4 = 364 / 秒
startRemaining  = ceil(2.2 × 364 / 10) × 10 = 810
disposeRemaining = 810 + 1.5 段 × 450 = 1485
```

- `readySec` 1.0: 組みおえる まで(4E-3 / Preflight の 実測 さいだい 約 0.95 秒)。`marginSec` 1.2: ready から 着く まで(絵の したく 24 回 ≈ 0.9 秒 を ふくむ)
- 2 かいめ(いちばん はやい)でも 着く 2.2 秒 まえに はじまる。6 段(2700)では 0.70 / 0.45、5 段(2250)では 0.64 / 0.34 に あたる
- `corridorPreloadAction(state, remaining)` は 純関数。U ターンで のこりが 1485 を こえたら すてる(あそび 1.5 段)

---

## 3. 絵の さきどり デコード

- **いつ**: あるく 出口の spot の はし から 360 の なかに 入ったとき(10 frame に 1 回 しらべる)。出口を こえた ときにも(たび の すぐ あと など、ちかづく まえに こえた とき)
- **なにを**: `corridorSceneryEmojis(spec, from)` = 最初の 2 段の ことば + 両端の 地域の ことば + 端の いし。**8〜13 こ**。画像は atlas ごとに まとまる ので、デコードは 1〜3 まい
- **どこで**: `fetch(src) → blob → createImageBitmap(blob)`(デコードは main thread の そと)。`img.decode()` は えがく ときの デコードを なくさない、`createImageBitmap(img)` は main thread で デコードする ので つかわない
- **1 回 だけ**: キーは `connection:from`。デコードずみの atlas は もう 1 度 しない(entry に bitmap が ある)
- **正本は さわらない**: 地域・セーブ・はっけん・corridor の じょうたい
- **しっぱい**: fetch / blob / bitmap の どれが こけても、大きさが ちがっても、いままで どおり 画像で えがく(はじめて えがく ときに デコード)
- preload(4E-3)で 着く がわの 絵を よむ ときも `{ decode: true }`(ready に なる まえに デコードまで おわらせる)
- **のこる メモリ**: atlas 1 まい 1254 × 1254 × 4 = 約 6 MB。scenery / ui / care の 3 まいで 約 18 MB が 上限(ほかの PNG は 小さい)

---

## 4. 入口の したく(Preflight の 宿題 ①)

Preflight で 入口の 重さは「atlas の デコード」と 見て いたが、デコードを さきに しても 入口は **73〜191 ms** のこった(§6)。わけると のこりは **入口の さいしょの 2〜3 frame で 立て看板(glyph)を 10〜20 こ はじめて つくる**(1 こ 4〜7 ms・CPU 4 倍)ところ と、**corridor の world を 組む**(river_lake で 32 ms)ところ だった。

- デコードが おわった 出口の そばで、その corridor の world を 組んで おく(`corridorWorld` を 1 frame で。world は seed で きまる ので、入口で 組む ものと 同じ)
- 入口の `createCorridorWalk(…, { world })` は それを そのまま つかう(`chartFrom` と `corridor` で たしかめ、すすみぐあいの いろを あわせなおす)。**二重には 組まない**
- 組んだ world から 入口の カメラ(s = 0)と すこし すすんだ ところ(0.6 秒)の 2 か所で、飾りを 8 つに わけて 見えない canvas に えがく(1 frame 1 くぎり・4E-3 の 着く がわの したく と 同じ renderer)
- もつ のは 2 出口 まで(home の 大きな き には 出口が 2 つ)。地域を 出たら すてる。入口で つかったら すてる
- こけたら すてる だけ(入口で いつもどおり 組む)
- しらべもの: `corridorStats.entryPrep`(builds / reuses / warms / fails / drops)

---

## 5. 景色(4 本)

(スクリーンショット: 5 本 × 行き / 帰り × 0 / 25 / 50 / 75 / 100 %、[§8](#8-実画面))

| | 出発 → 到着 | 見えかた |
|---|---|---|
| `home|river_lake` | 草地 → 岸 → 水べ | 背景 hills → lakehills(まんなか)。岸の 段は river_lake の いろ と ことば(🌿 🪷 🪨 🌳)。**海・砂・ヨット・🌴・🐚 は 出ない**(Preflight の 宿題 ③) |
| `city|desert` | 灰色の まちはずれ → かわいた 道 → 砂 | 地面 #5e636f → #848079 → #ada085 → #d1bc8e → #e8ce95。背景 neonskyline → mesas。まちの はしは 🚲 🪧 🗑️ 🏢 🏬、🏠 🏡 と さくは 出ない |
| `desert|mountain` | 砂 → 岩 → 山 | #e8ce95 → #dbc592 → #c1b28d → #b0a589 → #9b9685。砂に もどらない。背景 mesas → peaks |
| `snow|mountain` | 雪 → 雪と 岩 → 山 | #edf3fa → #dfe4e7 → #c4c4c0 → #a8a599 → #9b9686。背景 snowpeaks → peaks。まんなか(42 → 58 %)の いろの とび ≤ 40 |

背景は 5 本 × 2 方向 とも **まんなかで 1 回 だけ** かわる(テスト 7。いままでは 段ごとに hills → treeline → lakehills → … と 行ったり来たり した)。

---

## 6. 性能(CPU 4 倍・390 × 844・DPR 3・なかま 8)

はかりかた: 出口の 260 てまえに おいて 上を おしつづけ、**あるいて** 出口を こえる(瞬間移動 しない)。1 ページで A→B(初回)→ B→A(2 かいめ)→ A→B(2 かいめ)、5 本 × 行き / 帰り = 30 回。
before = おなじ コードで さきどり デコード と 入口の したく を 止めた もの(4E-3 の 入りかた + 今回の 景色)。after = この PR。
entry max = corridor に 入る 1 frame まえ 〜 6 frame あと の いちばん ながい frame。first visible = 着いた がわの さいしょの frame。

| corridor | 向き | 回 | entry max before → after | corridor p50 | p95 | prepare max | ready margin | arrival fade | first visible |
|---|---|---|---|---|---|---|---|---|---|
| home|forest | home→forest | 初回 | 52.4 → **35.2** | 10.1 | 21.1 | 30 | 2422 | 250 | 13.4 |
| home|forest | forest→home | 2 回目(×1.4) | 40.2 → **16.3** | 9.3 | 17.8 | 15 | 2157 | 200 | 7.1 |
| home|forest | home→forest | 2 回目(×1.4) | 20.4 → **18.6** | 9.6 | 17.7 | 27.3 | 1636 | 217 | 8.3 |
| home|river_lake | home→river_lake | 初回 | 51.5 → **29.5** | 9.8 | 19.3 | 26.9 | 2862 | 250 | 15.1 |
| home|river_lake | river_lake→home | 2 回目(×1.4) | 30.6 → **17.6** | 8.6 | 13.5 | 13.3 | 2177 | 233 | 6.1 |
| home|river_lake | home→river_lake | 2 回目(×1.4) | 24.2 → **12.5** | 8.5 | 12.1 | 25.7 | 1912 | 217 | 7.2 |
| city|desert | city→desert | 初回 | 47.2 → **28.3** | 7.7 | 17.7 | 17.9 | 2724 | 233 | 13.5 |
| city|desert | desert→city | 2 回目(×1.4) | 25.9 → **15** | 9.5 | 16.8 | 20.5 | 1965 | 183 | 4.6 |
| city|desert | city→desert | 2 回目(×1.4) | 25.4 → **24.4** | 7.9 | 14.2 | 12.2 | 2002 | 200 | 8.1 |
| desert|mountain | desert→mountain | 初回 | 94 → **44.8** | 7.9 | 16.8 | 20 | 2752 | 300 | 15.9 |
| desert|mountain | mountain→desert | 2 回目(×1.4) | 58.7 → **27.6** | 8.6 | 15.5 | 14.3 | 1950 | 183 | 8 |
| desert|mountain | desert→mountain | 2 回目(×1.4) | 19.4 → **14.1** | 7.9 | 12.4 | 19.8 | 1907 | 217 | 6.5 |
| snow|mountain | snow→mountain | 初回 | 41.4 → **16.7** | 8.6 | 19.4 | 23.6 | 2689 | 217 | 16.3 |
| snow|mountain | mountain→snow | 2 回目(×1.4) | 21.7 → **12.4** | 8.4 | 14.2 | 20.6 | 1982 | 200 | 9.3 |
| snow|mountain | snow→mountain | 2 回目(×1.4) | 17.1 → **18.2** | 7.4 | 13.2 | 27.8 | 1790 | 233 | 7.5 |
| home|forest | forest→home | 初回 | 51.9 → **24.8** | 9.1 | 17.9 | 14.7 | 3154 | 250 | 12.7 |
| home|forest | home→forest | 2 回目(×1.4) | 27.7 → **16.6** | 10.2 | 20.2 | 29.3 | 1570 | 183 | 8.6 |
| home|forest | forest→home | 2 回目(×1.4) | 33.3 → **16.9** | 6.8 | 14.1 | 12 | 2244 | 233 | 7.5 |
| home|river_lake | river_lake→home | 初回 | 103.3 → **34.5** | 8.8 | 15.5 | 22.1 | 2986 | 283 | 13.4 |
| home|river_lake | home→river_lake | 2 回目(×1.4) | 28.8 → **13.7** | 9.7 | 14.4 | 23.6 | 1968 | 250 | 8.1 |
| home|river_lake | river_lake→home | 2 回目(×1.4) | 28.1 → **15.8** | 7.5 | 13.4 | 12.5 | 2226 | 200 | 6 |
| city|desert | desert→city | 初回 | 54.4 → **25.3** | 9 | 18.6 | 19.4 | 2634 | 250 | 15.3 |
| city|desert | city→desert | 2 回目(×1.4) | 31.4 → **19.8** | 8.3 | 16.1 | 18.7 | 1948 | 217 | 8.1 |
| city|desert | desert→city | 2 回目(×1.4) | 15.7 → **15.4** | 8.5 | 14.2 | 18.4 | 2006 | 200 | 7.1 |
| desert|mountain | mountain→desert | 初回 | 34.4 → **28.7** | 8.7 | 17.4 | 28.4 | 2824 | 217 | 16.3 |
| desert|mountain | desert→mountain | 2 回目(×1.4) | 18.5 → **14.4** | 9.2 | 15 | 20.3 | 1626 | 233 | 9.8 |
| desert|mountain | mountain→desert | 2 回目(×1.4) | 23.2 → **25** | 8.4 | 14.4 | 22.2 | 1970 | 200 | 7.8 |
| snow|mountain | mountain→snow | 初回 | 38.9 → **24.7** | 8.6 | 18.6 | 20.1 | 2837 | 233 | 17.1 |
| snow|mountain | snow→mountain | 2 回目(×1.4) | 25.9 → **18.6** | 7.7 | 13.6 | 27.5 | 1917 | 250 | 7.3 |
| snow|mountain | mountain→snow | 2 回目(×1.4) | 26.6 → **12.7** | 7.1 | 11 | 16.6 | 2066 | 250 | 7.4 |

| まとめ(30 回) | before | after | 目標 |
|---|---|---|---|
| entry max 中央値 / 最大 | 28.8 / **103.3** ms | 18.2 / **44.8** ms | ≤ 60(できれば < 50)、100 こえ なし |
| corridor p95 最大 | 23.1 ms | 21.1 ms | わるく ならない |
| prepare(組む frame)最大 | 71 ms | 30 ms | — |
| ready margin 最小 | 1301 ms | **1570 ms** | 2 かいめ ≥ 1000 |
| arrival fade 中央値 / 最大 | 233 / 267 ms | **217 / 300 ms** | ≤ 250 / ≤ 300 |
| first visible 最大 | 17 ms | **17 ms** | 〜20 |
| fallback(その場で 組む) | 0 | 0 | 0 |
| 地域を あるく frame で 60 ms こえ | 20 回 | 18 回 | ふえない |

- **初回の 入口が いちばん かわった**: home|river_lake 帰り 103 → 35、desert|mountain 行き 94 → 45、home|forest 52 → 35
- 入口の したくの ぶん(出口の そばの 地域の frame で world を 組む 1 frame・立て看板を 16 frame)は、地域を あるく frame の 60 ms こえが ふえて いない ことで たしかめた(18 / 20 回。どちらも ページを ひらいた すぐ あと と 出口の てまえに おいた 直後)
- **はじめの はかりかた(瞬間移動)で 見えた city|desert 180 ms は、カメラが とんで 地域の 立て看板を まとめて 作りなおした ぶん**(corridor の 1 まえの 地域の frame)。あるいて 入れば 28 ms
- 1 回目の after で 暗転 317 ms が 1 回 あった。着いた ところ(かえりの 出口の そば)で すぐ さきどり デコード と 入口の したく が はじまり、暗転の したの frame と かさなって いた。**着いた 暗転の あいだは しない** ように して 300 ms に(この 表は なおした あと)

**なかま 27 にん(CPU 4 倍・行き 15 回)**: entry max 最大 47.5 ms・corridor p95 最大 23.9・暗転 183〜267 ms・ready margin 最小 1578 ms・27 にん みんな べつの ばしょ(テスト 3)。

**ふだんの はやさ(CPU 1 倍・行き 15 回)**: entry max 最大 8.1 ms・corridor p95 最大 3.9 ms・暗転 183〜200 ms・first visible 最大 4.3 ms。

曲がる はやさ(4E-1 の spec。°/s、初回 / 2 かいめ): home|forest 10.9 / 15.2・home|river_lake 6.2 / 8.7・city|desert 8.7 / 12.2・desert|mountain 7.1 / 10.0・snow|mountain 18.9 / **26.4**。5 本とも 30 いか(のばす しくみは いれて いない)。

---

## 7. メモリ

| | before | after |
|---|---|---|
| JS ヒープ さいだい(gc の あと、なかま 8) | 61.6 MB | 61.6 MB |
| デコードした 絵(ImageBitmap、ヒープの そと) | 0 | **18.0 MB**(atlas 3 まい × 6.0 MB が 上限。city / desert / mountain / snow は 2 まい 12 MB) |
| 入口の したくで もつ world | — | 2 出口 まで(1 つ 150 飾り)。入口で つかう か 地域を 出たら すてる |

- デコードは 画像の entry に もたせる だけ で、べつの キャッシュは つくらない(同じ atlas は 1 回)
- ヒープは ふえつづけない: 1 ページ(3 回 あるく)の はじめ → おわり が before +0.2〜+1.6 MB、after −2.3〜+1.3 MB、27 にん +0.7〜+1.2 MB(10 ページ・5 ページ)。corridor の 住民 0 にん

---

## 8. 実画面

- **3 サイズ × 5 本(390×844 / 375×667 / 360×640)= 15 / 15 PASS**。corridor の まんなか(50%)で: パッド つかえる・たび / ちず は つかえない・もどる は つかえる・はなす は 出ない・みつけた は 出ない・ボタンが 画面の なか・よこスクロール なし。着いた あとで: たび / ちず が もどる・「〜の ほうへ」の ヒントが のこらない・corridor なし・エラー 0
- **景色: 5 本 × 行き / 帰り × 0 / 25 / 50 / 75 / 100 %**(出発・着いた を ふくめ 1 本 7 まい × 10)。背景は どれも 50 % で 1 回 だけ かわる
  - home|river_lake: 草地 → 水べ。海・砂・ヨット なし。帰りは 水べ → 家 と 大きな き
  - city|desert: 灰色 → かわいた 道 → 砂(帰りは ぎゃく)
  - desert|mountain: 砂 → 岩 → 山、砂に もどらない
  - snow|mountain: 雪 → 雪と 岩 → 山
- home の 大きな き の 2 出口(もり / かわ)、city の 3 出口: 往復で まちがえない(テスト 8 と 実画面)
- reduced motion / perfTier 2 は corridor に 入らず transition(テスト 4E-3 11・4E-2 2)

---

## 9. テスト

あたらしく `tests/meguru-phase4e4a-test.cjs`(8 本・表で まわす。5 本 × 行き / 帰り = 10 方向)。

| | たしかめる こと |
|---|---|
| 1 | 許可リストは 5 本(かさならない)。のこり 5 本・special・memory_lake は transition。spec が ない / 形が あわない ときは transition |
| 2 | 組みはじめ 810 ⇔ 6 段の 0.70(5 本とも)。`CORRIDOR_PRELOAD_LEAD` から 810 / 1485 が でる。曲がる はやさ 初回 / 2 かいめ ≤ 30°/s |
| 3 | 10 方向 × なかま 27: 0.7 で 組みはじめ・着く まえに ready・組んだ world を 1 回 つかう(二重 build なし)・preload の 絵は デコードまで まつ・正本は 着く まで 出発 地域・セーブの key が ふえない・みちを みつけた・27 にん みんな べつの ばしょ・2 かいめ 1.4 倍・ready の あと 90% で U ターン → すてて 出発 地域 |
| 4 | LOW 4 本: 組みかけ / ready で reload → 出発 地域、組んだ ものは のこらない |
| 5 | こける: 組む とちゅう + デコード しっぱい(歩きつづけ 着く)/ 着く ときの たしかめ(出発 地域へ もどる) |
| 6 | さきどり デコード: ちかづいたら 1 回・最小の リスト(≤ 20)・とおくでは しない・2 回 しない・city|sea では しない・セーブ / 地域は かわらない。**入口の したく**: 組んで おいた world を 入口で つかう(reuses 1・同じ world)。したくが こけても 入口で 組んで 着く |
| 7 | 景色 10 方向: 背景は まんなかで 1 回・両端は 端の 地域の いろ(±4)・いろの とび ≤ 6・river_lake に 海 / 🌴 / 🐚 が ない・city の はじめに 🏠 🏡 さく が ない・snow は 0.42 で まだ 雪・42 → 58 % の とび ≤ 40・いろの 行き戻り ≤ 0.03 |
| 8 | home の 大きな き の 2 出口 と city の 3 出口: むきで 1 つに きまり、とりちがえない |

**かえた 既存テスト**(許可リスト・割合・背景に しばられて いた ところ だけ):
- `meguru-phase4e2-test.cjs` 1(許可リスト 5 本・10 方向)/ 10(段の まざり 0.5・両端の いろ・背景 1 回)/ 15(大きな き → かわ も corridor)
- `meguru-phase4e3-test.cjs` 1(割合 → のこり きょり の 契約)/ 11(許可リスト)
- `meguru-party-lod-test.cjs` 8(5 本・10 方向)
- `canvas-illustrations-test.cjs` +2(decode: bitmap を entry に もち version を かえない・こけたら いままで どおり)

**わざと こわして 赤に なるのを たしかめた(9 とおり)**:

| こわしかた | 赤に なった テスト |
|---|---|
| 1. 許可リストから `home|river_lake` を ぬく | 4e2-1 / 4e2-15 / 4e2-11 / 4e4a-1 / 4e4a-8 ほか 10 |
| 2. 組みはじめに すすんだ きょりを わたす(のこり で ない) | 4e3・4e2・party-lod ほか 16 |
| 2b. marginSec を 0 に | 4e3-1 / 3 / 7 / 8・4e4a-2 ほか 7 |
| 2c. あそび なし(dispose = start) | 4e3-1 / 7 |
| 3. さきどり デコードを しない | 4e4a-6 |
| 3b. preload で デコードを またない | 4e4a-3 |
| 4. 出口の えらびかた を こわす(さいしょの 候補) | 4e2-15・4e4a-3 / 5 / 8 |
| 4b. 形の たしかめ(spot の むき)を しない | 4e2-2・4e4a-1 |
| 5. 背景を 段ごとに もどす | 4e2-10・4e4a-7 |

`npm test` **1328 / 1328**(1318 + 8 + canvas 2)。

---

## 10. かわらない もの

- spot 471 / 地区 654 / みち 118 / しるし 107、地域の かず 11 / 12 / 17 / 103、connection 14・gate 13・corridor 13・DistantFeature 37(既存テストで 固定)
- セーブの 形(あたらしい key なし。テスト 3 で 10 方向 たしかめ)・`travelToRegion()`・世界地図・分母・special・memory_lake
- corridor の なかの 住民 0 にん。なかまの ならび(`partyFormationSlots`)・はば(段の 帯)・LOD / cache(`ctx.filter` に もどらない)
- 状態機械(4E-3 の `idle → preparing → ready → committed / aborted / failed`)・U ターンで すてる・reload で 出発 地域
- glyph の 作りなおし(`illustrationVersion`)は そのまま。デコードは version を かえない
- `prepareIllustrations` の よびかた(`{ decode: true }` を わたさなければ いままで どおり)
- `meguru.js` は わけて いない

---

## 11. 判定

**A. 採用(LOW 4 本を あるいて こえる)**

- 入口: 30 回とも **≤ 45 ms**(before 最大 103 ms)。Preflight の 宿題 ① は 解決
- 着く: 暗転 中央値 217 / 最大 300 ms、ready margin 最小 1.57 秒、fallback 0、first visible ≤ 17 ms
- 歩く p95・地域の frame・メモリ(ヒープ)は わるく ならない。デコードの ぶん 最大 18 MB
- 景色: 海が 出ない・行き戻り しない・背景は 1 回(宿題 ② ③)。組みはじめは のこり きょり(宿題 ④)
- こける とき(spec なし / 形が あわない / 組む / デコード / 入口の したく / 着く ときの たしかめ)は どれも 移動が とまらない。セーブの 形・世界地図・special は かわらない

のこる こと(4E-4A では なおさない):
- party が 障害物に ひっかかる いまの バグ(わるく なって いない)
- 入口の したくは 出口に ちかづいて から 約 1 秒(デコード + 18 frame)。たび で 出口の すぐ そばに 出て すぐ こえると したくが まにあわず、4E-3 と 同じ 入りかた(この 表の before: 中央値 29 ms・さいだい 103 ms)。移動が とまる ことは ない

---

## 12. 4E-4B へ すすむ 条件

- [x] LOW 5 本が 両方向・初回 / 2 かいめ・なかま 27 で 目標の なか(この PR)
- [x] この PR を main へ(#340、main `134e210`。Runtime smoke・Home layout 緑)
- [x] 4E-4B(MEDIUM 3 本: forest|mountain・mountain|river_lake・city|sea)の まえに: **2 かいめの 曲がる はやさが 30°/s を こえる**(31.5 / 34.8 / 32.7)ので、曲がりを 段に ひろげる(turn-spread)か 2 かいめの はやさを おさえるかを きめる。city|sea は 海ぞいの 景色(砂・海の 背景)が 端の 地域の もの だけで たりるか 撮って たしかめる
- [ ] 4E-4C(HIGH 2 本: countryside|forest 32.1 / 44.9・city|countryside 25.0 / 35.0)は 4E-4B の あと。countryside|forest は 5 段(2250)で みじかい ので、組みはじめ(のこり 810 = 0.64)と 余裕を もう 1 度 はかる
- 入口の したく・さきどり デコード・のこり きょり は 本ごとの `if` なし で そのまま つかえる(許可リストに たす だけ)

---

## 13. やって いない こと

- MEDIUM 3 本・HIGH 2 本(transition の まま)・`countryside|forest` の はやさの 上限
- party が 障害物に ひっかかる いまの バグ(4E-2 から。今回 わるく なって いない ことだけ たしかめた)
- global collision・住民の 地域間 移動・セーブの 形の 変更・Three.js

→ 4E-4B: [MEDIUM 3 本の handoff](meguru-phase4e4b-medium-corridors-2026-09-24.md)(曲がりを 道 ぜんぶへ ひろげて 2 かいめ ≤ 28°/s。はやさの 上限は つかわない)
