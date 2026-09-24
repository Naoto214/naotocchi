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

<!-- PERF -->

---

## 7. メモリ

<!-- MEM -->

---

## 8. 実画面

<!-- SCREEN -->

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

<!-- VERDICT -->

---

## 12. 4E-4B へ すすむ 条件

<!-- NEXT -->

---

## 13. やって いない こと

- MEDIUM 3 本・HIGH 2 本(transition の まま)・`countryside|forest` の はやさの 上限
- party が 障害物に ひっかかる いまの バグ(4E-2 から。今回 わるく なって いない ことだけ たしかめた)
- global collision・住民の 地域間 移動・セーブの 形の 変更・Three.js
