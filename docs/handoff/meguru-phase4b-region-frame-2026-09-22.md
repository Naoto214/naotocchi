# Phase 4B — REGION_FRAME と local ↔ global 変換の 基盤

日付: 2026-09-22 ／ 対象: `meguru.js` ／ 前提: [Phase 4A 設計監査](../design/meguru-phase4a-region-origin-global-world-2026-09-22.md)（案 B「アトラス方式」採用）

**Phase 4B の 完了条件は「だれにも つかわれて いない pure transform layer」で ある こと。**
えがき・あたりはんてい・住民・カメラ・セーブ・世界地図・`travelToRegion()` は **1 行も 変えて いません**。

---

## 0. やった こと / やって いない こと

| | |
|---|---|
| **足した もの** | `REGION_FRAME`（12 地域）／ `REGION_LAYER_Y` ／ `FRAMED_REGIONS` ／ `hasFrame()` ／ `regionFrame()` ／ `toGlobal()` ／ `toLocal()` ／ `dirToGlobal()` ／ `dirToLocal()` ／ `yawToGlobal()` ／ `yawToLocal()` |
| **変えた ファイル** | `meguru.js`（追加のみ）／ `tests/meguru-phase4b-test.cjs`（新規 12 本）／ `package.json`（テスト登録）／ `index.html`（`npm run bump`） |
| **やって いない** | renderer 変更 ／ collision の global 化 ／ resident の global 移動 ／ save 変更 ／ world map 変更 ／ Three.js ／ continuous world ／ corridor の 生成・描画 |

---

## 1. REGION_FRAME 実値

```
global.xz = frame.xz + Rot(frame.yaw) · local.xz
global.y  = frame.y                       ← layer ごとの 定数
```

せかいの むき: **global +Z = 北 / +X = 東**。方位角は 北から 時計まわり。
origin は chart の **local (0, 0)**（ろうかの 口がわ 中心）。

| region | x | y | z | yaw (rad) | yaw (°) | layer |
|---|---:|---:|---:|---:|---:|---|
| `home` | 0 | 0 | 0 | 4.3555 | 249.6 | ground |
| `city` | −4010 | 0 | 110 | 4.0187 | 230.3 | ground |
| `countryside` | −2770 | 0 | −1730 | 4.9220 | 282.0 | ground |
| `forest` | −2130 | 0 | −1000 | 4.8819 | 279.7 | ground |
| `mountain` | −6160 | 0 | 4170 | 2.8909 | 165.6 | ground |
| `snow` | −10 | 0 | 1810 | 3.7507 | 214.9 | ground |
| `sea` | −3810 | 0 | −150 | 4.3410 | 248.7 | ground |
| `river_lake` | −2180 | 0 | −1630 | 5.8915 | 337.6 | ground |
| `jungle` | −13890 | 0 | −6760 | 3.9270 | 225.0 | ground |
| `desert` | −4480 | 0 | −870 | 2.9692 | 170.1 | ground |
| `star_stop` | −9340 | **+4800** | 1940 | 5.4806 | 314.0 | **sky** |
| `deepsea` | −9500 | **−1600** | −1940 | 4.3410 | 248.7 | **below** |
| `memory_lake` | — | — | — | — | — | **frame を もたない** |

### かずの 出どころ（§27 の ゆうせんじゅんい）

1. **geography canon**（さいゆうせん）— せかい ぜんたいの むきを canon（§12）に いちばん あう 角へ そろえた
2. **connection closure** — walk 10 本の 両はしの mouth を global に うつした ずれを 最小二乗で といた
3. **世界地図の 見ため**（さいご）— `mapX / mapY` への あてはめは **して いない**

`jungle` / `star_stop` / `deepsea` は closure で しばらず、個別の ルールで おいた（§4）。

### かずは 魔法の 数では ありません（§28）

```
node tools/meguru-region-frame-solve.cjs
```

を はしらせると、**うえの ひょうが そのまま 出ます**（らんすうを つかって いないので 何度でも おなじ）。
canon の 正本（`CANON_AT`）も、といて いる 式も、その ファイルに 書いて あります。
`meguru.js` の `REGION_FRAME` の すぐ うえの コメントからも この どうぐを 指して います。

---

## 2. closure の けっか

**目標（Phase 4A §5）: walk connection ぜんぶ `< 400`。**

| connection | closure |
|---|---:|
| `city\|sea` | 4.6 |
| `countryside\|forest` | 28.6 |
| `mountain\|river_lake` | 32.6 |
| `city\|countryside` | 34.0 |
| `city\|desert` | 49.7 |
| `home\|river_lake` | 52.3 |
| `snow\|mountain` | 55.2 |
| `desert\|mountain` | 57.7 |
| `home\|forest` | 77.6 |
| `forest\|mountain` | **83.9** |

**さいだい 83.9 / RMS 52.6。** 目標 400 の **5 分の 1 いか**で、Phase 4A の 実測（さいだい 144 / RMS 71）より **よい**です。
これは **かずを 10 たんいに まるめた あと**の 値です（まるめる まえは さいだい 79 / RMS 52）。

### special connection（しばらない）

| connection | kind | X/Z の ずれ | 高さの さ | いみ |
|---|---|---:|---:|---|
| `deepsea\|sea` | vertical | **3** | −1600 | もぐるのは **たて**。X/Z は ほぼ 一致 |
| `countryside\|star_stop` | vertical | 1046 | +4800 | ゴンドラは **上へ**。よこにも すすむ ので X/Z は しばらない |
| `jungle\|sea` | sea | **7998** | 0 | ふねで **外洋を ひとわたり**（= うみの おくゆき 8000）。はなれて いるのが 正しい |

---

## 3. 往復の ごさ

| しらべた もの | かず | さいだいの ごさ |
|---|---:|---|
| `toLocal(toGlobal(p))` — **471 spot ぜんぶ** | 471 | **2.3 × 10⁻¹²** |
| `dirToLocal(dirToGlobal(d))` — 12 地域 × 72 方向 | 864 | **2.2 × 10⁻¹⁶** |
| `yawToLocal(yawToGlobal(a))` — 12 地域 × 72 角 | 864 | **1.8 × 10⁻¹⁵** |

ぜんぶ 浮動小数の まるめ ぶん だけです。

---

## 4. layer の さだめ

`REGION_LAYER_Y = { ground: 0, sky: 4800, below: -1600 }`

| layer | region | y | いみ |
|---|---|---:|---|
| `ground` | 10 地域 | **0** | きじゅん面 |
| `sky` | `star_stop` | **+4800** | ゴンドラで のぼる 上空層 |
| `below` | `deepsea` | **−1600** | たなの ふちから おちこむ 外洋の 下 |
| `memory` | `memory_lake` | — | **frame を もたない** |

**名まえは 実コードの 既存の ものを そのまま つかいました**（`WORLD_GEOGRAPHY.regions[id].layer` と 完全に 一致）。
§12 の 例（`ground` / `upper` / `deep`）は それぞれ `ground` / `sky` / `below` に あたります。

> **4800 / −1600 は かりの かず**です（§13）。Phase 4B で しばるのは
> **「star_stop は 上 / deepsea は 下 / ground は きじゅん」という かんけい だけ**。
> 3D の ほんとうの 縮尺は Phase 4C で きめます。

---

## 5. memory_lake

**通常 global 地理に おいて いません。**

- `REGION_FRAME` に **エントリ自体が ない**
- `hasFrame('memory_lake')` → `false` ／ `regionFrame('memory_lake')` → `null`
- `toGlobal` / `toLocal` / `dirToGlobal` / `dirToLocal` / `yawToGlobal` / `yawToLocal` は **ぜんぶ `null`**
- 世界地図は いまのまま `mapX: null / mapY: null`。link 分母 12 にも 入らない

`null` は **エラーでは なく「通常の global 地理の そとに ある」という こたえ**です。
しらない id（`'nowhere'` / `''` / `null` / `undefined`）も おなじく `null` を かえし、**でっちあげの 座標を あたえません**。

> **`memory_lake` は「距離が ない 場所」です。** frame を あたえると
> 「きおくのみずうみまで 12 万たんい」と 言えて しまいます。

---

## 6. **いちばん だいじな 発見** — canon の 方角と closure は 両立しない

Phase 4A は 「canon の 方角に そろえ、closure で 検算する」と 書きました。
実装の ために 実際に 解いて みると、**この 2 つは どちらも 立てられません**でした。

おもみ `W` を ふって 測った とりひき曲線:

| おもみ W | closure さいだい | closure RMS | canon 方角の ずれ さいだい | おなじく RMS |
|---:|---:|---:|---:|---:|
| 0 | 96 | 58 | 179° | 88° |
| 1e4 | 93 | 56 | 171° | 86° |
| 1e5 | 79 | 51 | 140° | 78° |
| **3e5（採用）** | **79** | **52** | **126°** | **74°** |
| 1e6 | **160** | 116 | 111° | 71° |

**closure を こわしても、canon の 方角の ずれは 111° より 下がりません。**

### なぜか

Phase 4A §2.3 の 「こみぐあい **1.51 倍**」の 直接の けっかです。
chart が たがいに かさなって いる ので、**chart の 中心の いちは「その地域が どっちに あるか」を 表せません**。
じっさい、closure だけで といた 解では `snow` の chart 中心が `home` の chart 中心から **769 たんい**しか はなれて いません（chart の 長さは 7600）。

### どう した か

> **closure（物理）が かたちを きめ、canon は せかい ぜんたいの むきを きめる。**
> canon の 「どの地域が どっち」は **世界地図（`mapX` / `mapY`）の そうが もちつづける**。

これは Phase 4A §19 / 今回の §15 の 「**world map = たんさく UI ／ REGION_FRAME = physical transform**」という 分離を、
**実装で そのまま なぞった** かたちです。W = 3e5 を えらんだのは、closure の ぬるくうかん（自由度 5）の 中で
canon に いちばん 近づく 点だから で、**closure は かえって よく なって います**（W=0 の 96 → 79）。

### Phase 4C への 申し送り

方角を ユーザーに 見せる（「〇〇は あちら」）ときは、**chart の 中心の むきでは なく
corridor（connection を わたる みち）の むき**を つかって ください。かさなりの えいきょうを うけません。

---

## 7. desert の canon / world-map の さ

Phase 4A 付録 C で 見つけた 1 件（canon「北西」に たいして 世界地図は 西 281°、**34° の さ**）の あつかい:

| | きめた こと |
|---|---|
| **world map（`mapX` / `mapY`）** | **1 つも 動かして いません。** `desert` は `(−3.2, 1.4)` の まま |
| **REGION_FRAME** | **物理 global がわの canon に あわせました。** canon の 「北西」を 方角の 目標に いれて 解いて います |
| **どちらが 正本か** | **べつの そうの 正本**です。world map は たんさく UI の ひょうげん、REGION_FRAME は physical / simulation の transform |

つまり `desert` の 34° は **「直す」ものでは なく「2 つの そうが ちがう ことの 一例」**として 正式に のこします。
§6 の とおり、`desert` に かぎらず **ぜんぶの 地域で 2 つの そうは 一致しません**。

---

## 8. 「だれにも つかわれて いない」こと の しょうめい

### (a) しずかな しょうめい（参照の しらべ）

Phase 4B の 11 個の 名まえ（`REGION_FRAME` / `REGION_LAYER_Y` / `FRAMED_REGIONS` / `hasFrame` / `regionFrame` / `toGlobal` / `toLocal` / `dirToGlobal` / `dirToLocal` / `yawToGlobal` / `yawToLocal`）は、

- `meguru.js` の **Phase 4B ブロックと export の 1 行 いがいに 1 か所も 出て きません**
- `script.js` / `games.js` / `quick.js` / `audio.js` にも **1 つも ありません**

### (b) うごかす しょうめい（remove-it test）

**Phase 4B の ブロックを まるごと 消した `meguru.js`** を つくり、べつの プロセスで 指紋を とって くらべました。

指紋に 入れた もの:
- 471 / 654 / 118 / 107 と 分母 11 / 12 / 17 / 103、link の id 12 本
- **13 地域ぶん**の `buildWorld` の けっか（spot / path / zone / segment / obstacle / prop の かず、`len` / `halfW` / `minX` / `maxX`）
- 地域ごとの `entry` の id と ざひょう
- 地域ごとの `regionGates()`（id / spot / 出口の むき）
- 地域ごとの `worldLayers()` の 9 レイヤーの かず
- **らんすうを 固定して 400 ステップ あるいた あとの `player.x` / `z` / `heading`（小数 4 けた）**、見つけた spot と 地区の かず
- `worldMapData()` の 地域数 / 線の かず / 探索率

→ **1 文字の ちがいも ありませんでした。**

### (c) この テストに 歯が ある ことの かくにん

わざと `meguru.js` の `enterRegion()` に `if (regionFrame(regionId)) world.len += 1;` を いれて みると、
**11 番の テストは ちゃんと おちました。** 戻して ふたたび 通る ことも たしかめて います。

---

## 9. 実画面（390×844 / 375×667 / 360×640 × home / mountain / city / sea）

Chromium（`/opt/pw-browsers/chromium-1194`）で 12 とおりを 撮り、**Phase 4B あり / なし**で くらべました。

| | けっか |
|---|---|
| **JS error** | **0**（12 画面 ぜんぶ。あり / なし どちらも） |
| **はみ出し** | **0**（`overflow = 0`。パッドも「もどる」も 画面の 内がわ） |
| **ならび** | **完全に 一致**（canvas 338×533 / 323×386 / 322×359、パッド・もどるの いちも 1px の さも なし） |

> **1 件だけ**、`390×844-home` で `404 (Not Found)` の console error が 出ました。
> **Phase 4B あり / なしの どちらでも おなじように 出る**ので、この PR とは 関係の ない 既存の ものです。

### スクリーンショットの くらべかた について（正直に）

はじめ PNG の ハッシュで くらべようと しましたが、**同じ せっていで 2 回 撮ると ハッシュが 変わりました**。
`Date.now` / `Math.random` / `performance.now` を 固定しても、`requestAnimationFrame` の きざみまでは そろわず、
**くさきの ゆれ・住民の うごきで えが 毎回 すこし ちがう**ためです。

そこで **画素の ちがいの わりあい**で、3 とおりを くらべました。

| くらべた くみ | さいしょう | へいきん | さいだい |
|---|---:|---:|---:|
| **A. あり ↔ あり（おなじ せっていを 2 回）= ノイズの ゆか** | 0.71% | 2.64% | 4.10% |
| **B. あり ↔ なし** | 0.70% | 2.93% | 4.95% |
| **C. あり(2回目) ↔ なし** | 0.16% | 2.13% | 5.07% |

**3 つの ちらばりは 完全に かさなって います。** しかも **12 画面中 9 画面で、
「なし との さ」が「おなじ せってい どうしの さ」より 小さい**です。
→ **画面の ちがいは えの ゆらぎ だけ**で、Phase 4B に よる ものは ありません。

**画面の くらべは この とおり 判定に つかえない**ので、「うごきが 変わって いない」ことの しょうめいは
**§8 の (a) 参照の しらべ と (b) 指紋の 一致**（どちらも 決定的）に よります。

---

## 10. save / collision / resident / party / camera / renderer

| | Phase 4B での あつかい |
|---|---|
| **save** | **1 バイトも 変えて いません。** global 座標は 保存しない（導出値）。`state.regionId` ＋ id だけ。migration も schemaVersion の 変更も なし。テスト 12 で セーブの かぎに `frame` / `global` が ない ことを しばって います |
| **collision** | **local の まま。** global collider への やきなおしは して いません。`toGlobal()` が ある ので、ひつような ときに 外がわで うつせる ことだけ たしかめました |
| **resident / party** | **データ構造は 無変更。** `region + localPosition` の まま。`globalPosition` は **つねに 持たせません**。ひつような ときだけ `toGlobal(a.region, a)` で みちびけます |
| **camera** | **ロジック 無変更。** `yawToGlobal()` は 作りましたが、camera からは よんで いません |
| **renderer** | **Canvas も Three.js も `REGION_FRAME` を 見ません。** §24 の 完了条件（pure layer）の とおり |
| **world map** | **`mapX` / `mapY` は 1 つも 動かして いません。** Phase 4B の コードは そもそも 参照して いません（テスト 10） |

---

## 11. global → region の 逆引きに ついて

**作りません。**

chart が たがいに かさなる（Phase 4A: 45 くみ中 43 くみ）ので、**1 つの global 点が どの region かは 一意に きまりません**。
`toLocal(regionId, g)` は **どの region かを よびだしがわが しる** かたちに して あります。
プレイヤーが いま どこに いるかは、いまも これからも **`state.regionId` が 正本**です。

テスト 8 で `regionAt` / `regionOf` / `globalToRegion` などの 名まえが **はえて いない** ことも しばって います。

---

## 12. corridor の したじ（Phase 4C への 引きわたし）

corridor は **まだ 作って いません**（§18）。ただし、いまの データで

```
REGION_FRAME[A] → corridor → REGION_FRAME[B]
```

が 組める ことは たしかめました。

| ひつような もの | いま ある か |
|---|---|
| 両はしの spot | ○ `connection.mouths[region]` |
| 両はしの global 点 | ○ `toGlobal(region, mouthSpot)` |
| corridor の 長さ | ○ 2 点の きょり（walk 10 本は closure < 84 なので ほぼ 0 = となりあって いる） |
| corridor の 方角 | ○ `dirToGlobal(region, outward)` |
| 高低差 | ○ `frame[B].y − frame[A].y` |
| あいだの ことば 6 段 | ○ `gate.ends[region].land`（既存） |

---

## 13. テスト

`tests/meguru-phase4b-test.cjs`（新規 **12 本**、ぜんぶ pass）。

| # | 見る もの |
|---|---|
| 1 | frame を もつのは **12 地域**。`memory_lake` だけ もたない（13 個 ぜんぶ おなじ あつかいに して いない） |
| 2 | 値は ぜんぶ 有限。**yaw は まるめて いない** 自由な 実数。`home` の origin は (0,0,0) |
| 3 | `toGlobal` → `toLocal` の 往復が **471 spot ぜんぶ**で 一致 |
| 4 | `dir` の 往復が 一致。ながさが 変わらない。**いちは 足さない** |
| 5 | `yaw` の 往復が 一致。`dirToGlobal` と おなじ 回転 |
| 6 | **walk 10 本の closure < 400**（じっさいは さいだい 84 / RMS 53） |
| 7 | **special 3 本は closure を しばらない**。layer の 上下だけ しばる |
| 8 | `memory_lake` は **ぜんぶ `null`**。しらない id も `null`。**逆引きの かんすうが はえて いない** |
| 9 | layer の 区別（ground 0 / sky + / below −）。正本の `layer` と 一致 |
| 10 | **`mapX` / `mapY` を つかって いない**。世界地図は 1 つも 動いて いない |
| 11 | **消しても うごきが 変わらない**（参照の しらべ ＋ べつプロセスの 指紋 一致） |
| 12 | 分母 11 / 12 / 17 / 103、471 / 654 / 118 / 107、`travelToRegion()`、セーブの かたち が 不変 |

---

## 14. performance

変換は **純関数**で、**毎フレーム よぶ ところが 1 つも ありません**（§31）。
キャッシュも 最適化も 入れて いません。ひつように なった ときに 入れます。
