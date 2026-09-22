# Phase 4A — regionOrigin / global world 設計監査

日付: 2026-09-22 ／ 対象: `meguru.js`（めぐる）／ 地理正本: `WORLD_GEOGRAPHY` canon v1 ／ 前提: Phase 3B 完了（connection 14 / gate 13 / 未実装 0 / link 分母 12）

**この文書は 設計監査です。コードは 1 行も 変えて いません。**
`regionOrigin` の 追加・spot 座標の 書きかえ・save への global 座標の 追加・Three.js の 導入・renderer の 作りなおし・resident の region またぎ・streaming の 実装は **どれも して いません**。

---

## 0. この監査で きめた こと（結論の さき出し）

| 項目 | けつろん |
|---|---|
| **推奨アーキテクチャ** | **案 B「global graph + corridor（アトラス方式）」** |
| **regionOrigin の 定義** | `{ x, z, y, yaw, layer }` — **平行移動 だけでは たりない。yaw（回転）が 要る**（実測） |
| **変換** | `global = origin.xz + Rot(yaw) · local.xz` ／ `globalY = layerY(layer)`。**local 座標は 1 つも 書きかえない** |
| **memory_lake** | **通常 global 地理から 外す**。`layer: 'memory'` の 別 namespace。入口だけ 通常世界がわ |
| **save** | **global 座標は 保存しない。導出値。** いまの `region + spot id` の まま |
| **Phase 4B で 最初に やる こと** | **`REGION_FRAME` データと `toGlobal()` / `toLocal()` の 純関数を 足すだけ**（描画・collision・resident は 1 つも 触らない） |

そして、この監査で 見つかった **いちばん だいじな 事実**:

> **いまの 座標データでは、10 の 地上 region を 1 枚の 平面に かさならず ならべる ことは できません。**
> どんな 剛体変換（平行移動＋回転）でも、どんな 一様縮尺でも できません。**こみぐあいが つねに 約 1.5 倍** で、1 を こえて います。
>
> → **案 C（full continuous world）は、spot 座標を 書きかえない かぎり 到達できません。**
> → よって「region が かさなる ことを みとめる」設計（案 B）が、現実的な 唯一の 前進です。

くわしくは §2 と §3。

---

## 1. 現状アーキテクチャ

### 1.1 座標系は 「region ごとに 独立した ろうか」

`buildWorld(regionId, …)` が 作る 1 つの world は、

- `x ∈ [minX, maxX]`（`halfW` が はんぶんの よこはば）
- `z ∈ [0, len]`（`RULES.zMargin` の ぶんだけ 内がわ）

という **ほそながい ろうか（corridor）**です。13 地域 ぜんぶ **自分の (0,0) を もって いて、たがいの 位置関係を 知りません**。

| region | layer | halfW | len | spot | 世界地図 mapX / mapY |
|---|---|---:|---:|---:|---|
| home | ground | 1150 | 3000 | 14 | 2.1 / 0.4 |
| city | ground | 2300 | 6600 | 47 | −3.6 / −3.0 |
| countryside | ground | 2600 | 7700 | 48 | −1.3 / −2.1 |
| forest | ground | 2900 | 7900 | 50 | 0.4 / −1.0 |
| mountain | ground | 2000 | 9000 | 39 | 0.6 / 3.5 |
| snow | ground | 2500 | 7600 | 35 | −0.2 / 5.0 |
| sea | ground | 2500 | 8000 | 35 | −1.2 / −6.1 |
| deepsea | **below** | 2200 | 7800 | 34 | 1.3 / −6.7 |
| river_lake | ground | 2200 | 8000 | 35 | 2.55 / 2.1 |
| jungle | ground | 2600 | 8100 | 40 | −6.3 / −7.8 |
| desert | ground | 3400 | 8800 | 40 | −3.2 / 1.4 |
| star_stop | **sky** | 2600 | 7300 | 34 | −1.6 / −1.8 |
| memory_lake | **memory** | 1400 | 5000 | 20 | **null / null** |

合計 **471 spot / 654 path / 118 zone / 107 ひみつ**。

### 1.2 地域を またぐ しくみ（Phase 3B までで 完成した もの）

- **connection 14 本**（`b` を もつ 13 本 ＋ `memory_lake`）。**gate 実装済み 13 / 未実装 0**
- `mouths: { regionA: spotId, regionB: spotId }` が **両がわの 入口 spot** を 指す
- `gate.kind` は `walk`（10 本）／ `sea`（1 本 = `jungle|sea`）／ `vertical`（2 本 = `deepsea|sea` の もぐる、`countryside|star_stop` の ゴンドラ）
- `gate.ends[region].dir` は **その region の ろうかの どちらの はしか**（`near` = z が ちいさい がわ ／ `far` = z が おおきい がわ ／ `ride` = のりば）
- `gate.ends[region].bearing` は、コードの コメントが はっきり 書いて いる とおり
  **「その region の world くうかんでの 出口の むき」= region-local** です。**global の 方角では ありません。**
  1 つの spot に 出口が 2 つ ある とき（`home.bigtree` = もり / かわ）の **えらびわけ だけ**に つかわれます（`gateScore`）
- `gate.ends[region].land` は 6 段の **非 region 地形の ことば**（例: さばくがわ「すなやまの ふち → すなの まじる ざれば → あかい されきち → いわやまの かげ → かわいた こうげん → かぜの きれめ」）
- 越える えんしゅつは Phase 2.1 の `TRANSITION`: `approach → cross → arrive → settle`。**世界の 入れかえは `cross` の 1 点**で おきる

### 1.3 世界地図は **すでに 別レイヤー**

`mapX / mapY` は 「図上の めもり」で、`GEO_UNIT = 0.27` を かけて だえんに なります。
`meguru.js` の コメントが すでに 明言して います:

> 名前を はっきり わけて いる。**mapX / mapY を そのまま world 座標に しては いけない。**

`worldMapShape(id)` は `GEO_AREA`（実測面積）と `GEO_ASPECT`（ほそながさ）から だえんを 作ります。
つまり **世界地図は「実面積と ほそながさを 図に うつした 表現」** であって、物理配置では ありません。§19 の 結論は **すでに 正本に 書かれて いた** ことに なります。

### 1.4 renderer との 分離は **すでに できて いる**

`worldLayers(world)` が、世界を **意味で わけた データ**として 返します。
`terrain / water / road / building / vegetation / landmark / obstacle / light / scenery / zone / streaming / env`。
コード内の コメント:

> Three.js の レンダラーは これを よんで、terrain → 地面と 起伏、water → 水面 …… を つくれば よい。canvas の レンダラーは いまの props/areas を そのまま よむ ので、この かんすうは よばない

さらに:

- `L.streaming = { cell: 1200, activeRadius: 3600, zoneReach: 'nearest' }` — **streaming の めやすが すでに データに ある**
- `L.zone[].bounds` と `L.zone[].neighbors` — **地区ごとの 範囲と となりが すでに ある**
- `camera = { x, z, yaw, dist, height }` — コメント「three.js でも おなじ 値で カメラを おける」
- `L.obstacle` = `{ kind, shape, x, z, hw, hd, ang, role, r }` — 「Three.js でも 住民の うごきでも、この おなじ データを そのまま つかえる」

**つまり「renderer が 地理正本を 持たない」（§23）は すでに 達成済み** です。Phase 4A で 新しく 決める ことは ありません。

### 1.5 collision は region-local

`buildObstacles()` → `buildCollisionGrid()`。
ます目（`COLL_CELL`）は **その region の obstacle の 外接箱から 作る**ので、原点が どこでも 成立します。
`collidersAt(world,x,z)` / `moveWithCollision()` も **world を 引数で 受けとる 純粋な 関数** で、global を 一切 知りません。

### 1.6 resident / party は region 内

`updateActor(a, dt, e, world, others)`。住民は `world.spots` / `world.segments` の うえを 歩き、`REGION_LIFE` / `SPOT_LIFE` / `TIME_LIFE` / `WEATHER_LIFE` で 行動を 決めます。**region を またぐ 移動は ありません。**
party（なかま・こいびと）は `followParty(dt)` で **カメラの yaw を 基準に** プレイヤーの うしろ・よこに つきます。

### 1.7 save は **座標を 1 つも 持って いない**

これは 今回の 監査で いちばん うれしい 発見です。`script.js` の `meguruBridge` が 保存するのは:

```
state.regionId                         いま いる 地域（id）
state.lifetime.meguru.spots[region]    見つけた spot の id
            .zones / .paths / .marks   あるいた 地区・みち・めじるし の id
            .world.regions / .links    世界地図の 発見（id）
            .met / .talks / .visits    住民との であい
```

**ぜんぶ id だけ。x / z は 1 つも ありません。**
プレイヤーの 位置は `enterRegion()` が **その場で 作りなおして** います:

```js
player = { x: at ? at.x : world.entry.x, z: at ? at.z : world.entry.z - 60, … }
```

`at` は 「となりから 入って きた ときの 入口 spot」。つまり **位置は つねに spot id から 導出される 値** です。
→ §22 の 結論は **自動的に** 出ます: **global 座標を save に 足す 必要は まったく ない**（§10）。

---

## 2. 問題点 — 実測

### 2.1 「global = regionOrigin + local」は **閉じません**（§13 の 第一候補の 検証）

connection の 両がわの mouth spot は、**global では おなじ 点に ある はず**です。これを 式に すると

```
origin[A] + local_A(mouthA)  ==  origin[B] + local_B(mouthB)
```

地上 region **10 個**、地上どうしを つなぐ gate 付き connection **11 本**。
10 節点 11 辺 なので **独立な わ（閉路）が 2 つ** あります。全域木で origin を でんぱさせ、木に 入らなかった 2 本の **とじない ずれ** を 測りました。

| 木に 入らなかった connection | A がわの global | B がわの global | **ずれ** |
|---|---|---|---:|
| `mountain\|river_lake` | (1550, 6300) | (−1500, 8400) | **3703** |
| `city\|desert` | (−3700, 5250) | (2350, 12750) | **9636** |

spot の 半径が だいたい 150〜300 たんい なので、**3703 も 9636 も「べつの 場所」** です。
**平行移動 だけの モデルは、今の データでは 成立しません。**

### 2.2 yaw（回転）を ゆるすと **ほぼ ぴったり 閉じます**

各 region に 回転 `yaw` を 足して `global = origin + Rot(yaw)·local` に すると:

| | mouth の ずれ（RMS） | いちばん わるい 1 本 |
|---|---:|---:|
| 平行移動 だけ | **3438** | 9636 |
| **回転も ゆるす** | **71** | 144（`forest\|mountain`） |

**48 分の 1 に なります。** 71 たんいは spot 半径の 3 分の 1 いかで、**実質 一致**です。

そのとき 必要に なる yaw（home = 0° を 基準）:

| region | yaw | region | yaw |
|---|---:|---|---:|
| home | 0.0° | snow | −28.9° |
| countryside | 8.2° | forest | 36.0° |
| jungle | 2.8° | mountain | −83.3° |
| sea | 4.4° | river_lake | 92.4° |
| city | 23.5° | desert | −109.5° |

**45° きざみに まるめると ずれが 最大 2222 に もどる** ので、**yaw は 自由な 実数で 持つ 必要が あります**（まるめては いけない）。

> **けつろん: `regionOrigin` は `{x, z}` では たりない。`{x, z, y, yaw, layer}` の 剛体変換に する。**

### 2.3 それでも **region どうしは かさなります** — これが 最大の 発見

いちばん よく 合う 剛体変換で ならべた あと、region の 箱（回転こみ）の 交差を 数えました。

**45 くみ中 43 くみが かさなります。**

こみぐあい（10 地域の 面積 ÷ ぜんぶを いれた 箱）:

```
10 地域の 面積 ごうけい : 374 Mu²
ぜんぶを いれた 箱       : 15922 × 15591 = 248 Mu²
こみぐあい               : 1.51 倍   ← 1 を こえたら 平面に ならべられない
```

**「一様に 縮める」では 直りません。** 縮尺 k を 変えて 測りなおしました:

| k | mouth の ずれ（RMS） | かさなる くみ / 45 | こみぐあい |
|---:|---:|---:|---:|
| 1.0 | 71 | 43 | 1.51 |
| 0.8 | 99 | 43 | 1.48 |
| 0.6 | 172 | 42 | 1.37 |
| 0.4 | 169 | 37 | 1.60 |
| 0.2 | 139 | 34 | 1.51 |
| 0.1 | 125 | 35 | **2.01** |

**こみぐあいは どこまで 縮めても 約 1.5 の まま**です。当然で、縮尺は 制約（mouth の 一致）も いっしょに 縮めるので、**形は そのまま**だからです。

なぜ こう なるのか:

> region は「点」では なく、**長さ 3000〜9000 たんいの ながい ろうか** です。
> しかも mouth は ろうかの **途中**に あります（例: `forest` は `entry`(z=250) / `anc2`(z=6700) / `stonelook`(z=5250) の 3 か所）。
> となり どうしを mouth で つなぐと、それぞれの ろうかが **mouth から さきへ 何千たんいも のびて**、
> かならず よその ろうかを 横切ります。

これは **座標の バグでは なく、いまの 世界の 作りかた そのもの** です。1 地域を「歩いて たのしい 大きさ」に した 結果、**13 地域を 1 枚の 平面に 敷きつめると 世界が 足りなく なる**。

> **→ 案 C（full continuous world）は、471 spot の 座標を 書きかえない かぎり 到達できません。§14 で 禁止されて いる 作業です。**

### 2.4 その ほかの 問題点

| # | 問題 | いま | 4A の 立場 |
|---|---|---|---|
| P1 | 地域の あいだの 距離が どこにも ない | `land` の 6 段の ことば だけ | §9 で B 案（corridor）として 正本化 |
| P2 | `bearing` が region-local なので、**global の 方角と 一致する 保証が ない** | gate の えらびわけ 専用 | 4B で `frame.yaw` を 入れた あと、**`bearing` を global へ 写した ものが 正本の 方角**に なる |
| P3 | 高さが `layer` の 文字列 だけ（`ground` / `sky` / `below` / `memory`） | 数値が ない | §7 で `layerY` を 定義（数値は 4B で 確定） |
| P4 | `memory_lake` が `mapX: null` の まま 世界地図の 外 | 意図どおり | §8 で 別 namespace として 正式化 |
| P5 | 世界地図の 位置と、connection から 解いた 位置が **一致しない** | mapY↔originX の そうかん 0.805、mapX↔originZ −0.496（≒ 90° ずれて いて しかも ゆるい） | **これで よい**。§19 のとおり 別レイヤー |

---

## 3. 3 案の 比較

### 案 A — `regionOrigin` だけ 足す

各 region に `{x, z}`（または `{x, z, yaw}`）の メタデータを 足す。誰も まだ 使わない。世界地図の 線の 向き・「あっちに やまが ある」の 表示などに だけ 使う。

### 案 B — global graph + corridor（**アトラス方式**）

世界を **1 枚の 紙では なく、正確に 位置づけされた 地図帳（atlas）**と 考える。

- 各 region は **chart**。`REGION_FRAME = { x, z, y, yaw, layer }` で global に 置かれる
- **chart どうしの かさなりを みとめる**（§2.3 の 測定の とおり、避けられない）
- region と region の あいだに **corridor**（非 region 地形）を **明示的な データ**として 置く。corridor は 両端の mouth を global で つなぐ 線分 ＋ 6 段の `land` ＋ 長さ ＋ 高低差
- **corridor だけが 「本当に 連続な 空間」**。chart の 内部も 連続。chart どうしは corridor 経由で つながる
- special connection（ゴンドラ・もぐる・ふね）は **空間的に 連続で なくて よい transport edge**

### 案 C — full continuous world

13 地域を 1 つの 巨大な 連続空間に 置き、かさならない ように する。region 境界は 見えない。歩いて そのまま 越えられる。

### 比較表

| | **A. regionOrigin だけ** | **B. global graph + corridor** | **C. full continuous world** |
|---|---|---|---|
| **メリット** | いちばん 安い。壊れる ものが ゼロ。すぐ 入れられる | 地理が 正本に なる。方角・距離・高さが 全部 言える。corridor が 「地域の あいだ」に 実体を 与える。Three.js で 遠景に となりの 地域を 出せる | 本物の ひとつづきの 世界。境界の 演出が いらない |
| **デメリット** | **それだけでは 何も できない**。distance / bearing は 出せるが corridor が ないので「あいだ」が 空っぽ | chart の かさなりを みとめる 必要が ある（「地図帳」と 割りきる 説明が 要る） | **今の データでは 不可能**（§2.3、こみぐあい 1.51 倍）。471 spot の 座標を 全部 書きなおす しかない |
| **移行コスト** | **小**（データ 1 つ ＋ 純関数 2 つ） | **中**（4B〜4D の 3 段。既存コードの 変更は ほぼ ゼロで 積みあげ られる） | **特大**（世界の 作りなおし。Phase 3 の 「歩いて たのしい 大きさ」を 捨てる） |
| **旧セーブ互換** | **完全**（save に 何も 足さない） | **完全**（global は 導出値。§10） | **こわれる**（spot 座標が 変わる。spot id で 保存して いる ので id を 保てば 生きるが、意味が ずれる） |
| **Three.js との 相性** | 弱い（1 region しか 置けない ままで、3D に した 意味が うすい） | **強い**（chart を 置き、となりの chart を 遠景 LOD で 出し、corridor を 通り道に できる） | 最強だが、そこへ 行く 道が ない |
| **今 やるべき 度** | ★★☆（**B の 第 1 歩 として だけ 価値が ある**） | **★★★** | ★☆☆（**いまは やらない**） |

**A は B の 部分集合** です。A を 単独の ゴールに すると「足したのに 誰も 使わない データ」に なります。**A は Phase 4B、B は Phase 4B〜4D** と 読みかえるのが 正しい。

---

## 4. 推奨案

### **案 B — global graph + corridor（アトラス方式）を 採用します。**

理由を 3 つに しぼります。

1. **C は 測定で 否定された。** こみぐあい 1.51 倍は、剛体変換でも 一様縮尺でも 消えません。C へ 行くには §14 が 禁止して いる「全 spot 座標の 書きかえ」が 必要です。
2. **A だけでは 足りない。** `regionOrigin` を 足しても、region の あいだに 何も なければ 「めぐる」の 体験は 1 ミリも 変わりません。いま すでに ある 6 段の `land` を corridor として 正本化して はじめて、地理が 意味を もちます。
3. **B は 既存を 1 行も 壊さない。** `REGION_FRAME` は 追加データ、`toGlobal` / `toLocal` は 純関数、corridor は 既存 `land` の 構造化。collision・resident・camera・save・世界地図は **全部 そのまま**。

**「アトラス方式」の 言いかた**（正本に 残す 言葉）:

> なおとっち世界は **1 枚の 紙では なく、地図帳**です。
> 各地域は「その土地を 歩ける 縮尺で 描いた 1 ページ」。
> ページには **世界の どこに あって、どちらを 向いて いるか**（`REGION_FRAME`）が 書いて あります。
> ページ どうしが 紙のうえで かさなって 見えるのは、**ページが それぞれ 拡大図だから**です。
> ページと ページの あいだは、**corridor（みちの 6 段）**が つないで います。

---

## 5. regionOrigin の 定義

```
REGION_FRAME[regionId] = {
  x:     Number,     // global X（たんい = いまの world たんいと おなじ）
  z:     Number,     // global Z
  y:     Number,     // global Y（高さ。§7）
  yaw:   Number,     // ラジアン。region-local の +z が global の どちらを 向くか
  layer: 'ground' | 'sky' | 'below' | 'memory',
}
```

### 決めごと

| # | 決めごと | りゆう |
|---|---|---|
| D1 | **`yaw` は 必須。まるめない。** | §2.2。45° きざみで ずれが 2222 に もどる |
| D2 | **原点は region-local の (0, 0)** = ろうかの 中心線の 口がわ（`z=0`、`x=0`）。`world.entry` では ない | `entry` は region に よって 位置が ちがう。(0,0) は 全 region で 意味が おなじ |
| D3 | **基準は `home`。** `home.frame = { x:0, z:0, y:0, yaw:0 }` | 世界の 中心は おうちの たに（canon v1） |
| D4 | **数値は 「connection の 閉じ」だけで 決めない。canon v1 の 地理が 優先。** | §12。西に mountain / 北に snow / 北西に desert … を 満たしたうえで、closure を 検算に 使う |
| D5 | **chart の かさなりは エラーでは ない。** | §2.3 |
| D6 | **`REGION_FRAME` は `meguru.js` の 正本（`WORLD_GEOGRAPHY` の となり）に 置く。`WORLDS[id]` には 混ぜない** | `WORLDS` は 「1 ページの 中みだけ」を 持つ、という 現在の 役割を 守る |

### region 境界（region boundary）

| # | 決めごと | りゆう |
|---|---|---|
| B1 | **region の 境界は、その chart の 箱**（`x ∈ [−halfW, halfW]`, `z ∈ [0, len]`）**を global に 写した 四角形**。いまの `clampToWorld()` が 使って いる 範囲と おなじ | 新しい データを 作らない |
| B2 | **境界は 排他では ない。** 同じ global の 点が 2 つ いじょうの chart に 属する ことが ある | §2.3。45 くみ中 43 くみが かさなる |
| B3 | だから **「この global 点は どの region か」を 返す 関数は 作らない**（§6 T4） | 一意に 決まらない。作ると かならず バグる |
| B4 | **プレイヤーが いま どの region に いるかは、いまも これからも `state.regionId`** が 正本。座標からは 決めない | いまの 実装の まま。save も この まま（§11） |
| B5 | 境界を 「またぐ」のは **gate だけ**。箱の はしに ぶつかっても 何も おきない（`clampToWorld` で 止まる） | Phase 3B で 完成した 仕組み。4A では 触らない |

> **region 境界は 「chart の 紙の はし」であって、「世界の 地面の 切れめ」では ありません。**
> 地面の 切れめに なるのは 4E（歩いて 越える）に 進んだ ときだけです。

### 検算の しかた（Phase 4B の テストに する）

```
closure(c) = | frame.toGlobal(A, mouthA) − frame.toGlobal(B, mouthB) |
```

- **walk connection**: `closure < 400`（spot 半径の 2 倍ていど）を 合格に する。実測で 71〜144 は 出せる
- **special connection**: closure は **見ない**（§18）

---

## 6. local ↔ global 変換

```js
// region-local → global
toGlobal(regionId, p) {
  const f = REGION_FRAME[regionId];
  const c = Math.cos(f.yaw), s = Math.sin(f.yaw);
  return { x: f.x + p.x * c + p.z * s,
           y: f.y,
           z: f.z - p.x * s + p.z * c };
}

// global → region-local
toLocal(regionId, g) {
  const f = REGION_FRAME[regionId];
  const c = Math.cos(f.yaw), s = Math.sin(f.yaw);
  const dx = g.x - f.x, dz = g.z - f.z;
  return { x: dx * c - dz * s,
           z: dx * s + dz * c };
}
```

### 決めごと

| # | 決めごと |
|---|---|
| T1 | **純関数。** state を 読まない。`REGION_FRAME` と 引数だけ |
| T2 | **`toLocal(toGlobal(p)) === p`（誤差 1e-9 いない）を テストで しばる** |
| T3 | **向きも 変換できる ように する。** `dirToGlobal(regionId, {x,z})` / `yawToGlobal(regionId, yaw)`。gate の `bearing`（region-local）と camera の `yaw` に 要る |
| T4 | **`toLocal` は「どの region か」を 引数で もらう。** global 点から region を 逆引きする 関数は **作らない**（chart が かさなるので 一意に 決まらない、§2.3） |
| T5 | **スケールは 入れない。** `k` は §2.3 で 効果が ない ことが わかった。式を 複雑に するだけ |

---

## 7. special layer（高さ方向）

`layer` は すでに データに あります（`ground` / `sky` / `below` / `memory`）。**数値を 与えるのは Phase 4B**。目安:

| layer | region | globalY の 目安 | 根拠 |
|---|---|---:|---|
| `sky` | `star_stop` | **＋**（例 +4000〜+6000） | ゴンドラで 山ろくの のりばから のぼる。`vertical.dir = 'up'` |
| `ground` | 10 地域 | **0** | 基準面 |
| `below` | `deepsea` | **−**（例 −1200〜−2000） | 「棚の ふちで きゅうに おちる」。`kind: 'dive'`, `layer: 'down'` |
| `memory` | `memory_lake` | **なし**（§8） | 地上の 座標を もたない |

### 決めごと

| # | 決めごと | りゆう |
|---|---|---|
| L1 | **`y` は region ごとの 定数。region の 中の 起伏には 使わない** | 起伏は 今も 無い。入れると 一気に 3D の 話に なる |
| L2 | **数値は 4A では 確定しない**（§15 の 指示どおり） | ゴンドラ・もぐるの 演出時間（`TRANSITION.up.cross = 1.45s` / `down.cross = 1.25s`）と つりあう 値を 4B で きめる |
| L3 | **`sky` / `below` は X/Z も 持つ。** 真上・真下に 置く | `countryside.skyland` の 真上に `star_stop`、`sea.seacave` の ななめ下に `deepsea` |
| L4 | **layer が ちがう region どうしは、かさなりを 数えない** | 上下に ずれて いる ので 当然 |

---

## 8. memory_lake

**第一候補（＝推奨）を そのまま 採用します。**

| | きめた こと |
|---|---|
| **通常 global 地理** | **外す。** `REGION_FRAME` に **X/Z を 持たせない**（または `x: null, z: null, yaw: null`） |
| **namespace** | `layer: 'memory'` の **別 namespace**。`toGlobal('memory_lake', …)` は **例外を 投げる か null を 返す**（4B で どちらかに 決める。推奨は `null`） |
| **入口** | **通常世界がわに ある**。connection `memory_lake` は `b: null`、`hidden: true`、`from: 'きりの よる、しずかな みずべで'` |
| **世界地図** | いまのまま `mapX: null / mapY: null`。線も 引かれない。link 分母 12 にも 入らない |
| **探索率** | いまのまま 対象外（`NORMAL_REGIONS` 11 に 入って いない） |

### 比較（§16 の 指示どおり 2 案を 並べます）

| | **案 甲: 別 namespace（推奨）** | 案 乙: 通常 global に 置く（`y` を 大きく 離す） |
|---|---|---|
| canon との 整合 | **○** 「地上の ざひょうを もたない」を そのまま 表せる | × 座標を 与えた 時点で canon に 反する |
| 実装 | **○** `frame` を 持たない だけ | △ `y = −99999` の ような 「魔法の 数」が 要る |
| distance / bearing | **○** 「出ない」が 正しい 答えに なる | × 「きおくのみずうみまで 12 万たんい」と 言えて しまう |
| 世界地図 | **○** いまのまま | △ 線を 引かない 特例が 別途 要る |
| Three.js | **○** memory scene を 別の シーンに できる | × 1 つの シーンに 入って しまう |

> **`memory_lake` は「距離が ない 場所」です。regionOrigin を 与えては いけない。**

---

## 9. non-region geography

region と region の あいだの 地形（畑・林・峠・分水界・荒地・河口・外洋・高原・雪線）。
**いま すでに 2 か所に データが あります**:

1. **`gate.ends[region].land`** — 6 段の ことば。例 `desert|mountain` の さばくがわ:
   すなやまの ふち → すなの まじる ざれば → あかい されきち → いわやまの かげ → かわいた こうげん → かぜの きれめ
2. **`WORLD_GEOGRAPHY.features`** — 10 個の 地形線。`tenryu`(river,10点) / `source-lake`(lake,10点) / `divide`(divide,4点) / `shonai`(river,5点) / `west-range`(range,14点) / `east-range`(range,14点) / `bay`(bay,5点) / `jungle-isle`(island,8点) / `jungle-islets`(island,4点) / `coast`(coast,7点)
3. **`sea.waters`**（`jungle|sea`）— 「みなみにしの がいよう」。`region: null, role: 'beyond'` と 明示されて いる

### 4 案の 比較（§17）

| | **A. connection ごとの transition terrain** | **B. global terrain segment** | **C. region 間 buffer zone** | **D. Three.js の semantic corridor** |
|---|---|---|---|---|
| 中み | いまの `land` 6 段を そのまま 正本に する | global 平面に terrain の 帯を 敷く | region の まわりに 緩衝地帯 region を 作る | 走るたびに 生成する 意味つき 通路 |
| 位置を 持つ | ×（順番だけ） | **○** | ○ | ○（生成時） |
| 実装コスト | **極小**（もう ある） | 中 | **大**（region が 増える = 分母が 変わる） | 大（Three.js が 要る） |
| §2.3 の かさなりと 両立 | **○**（位置を 主張しない） | △（帯も かさなる） | **×**（buffer を 置く 場所が ない） | ○ |
| Fog / 探索率 | 影響なし | 影響なし | **分母が 変わる**（region 11 / link 12 が 崩れる） | 影響なし |
| Three.js | 使える | 使える | 使える | そのもの |

### 決めごと — **A を 土台に、B の「線分」だけを 足す**

```
CORRIDOR[connectionId] = {
  from:  { region, spot },      // 既存 mouths
  to:    { region, spot },
  land:  [ …6段… ],             // 既存 gate.ends[*].land（向きは region ごと）
  line:  [ globalA, globalB ],  // ★追加: toGlobal した 両端。frame から 導出（データでは ない）
  length: Number,               // ★導出: |globalA − globalB|
  rise:   Number,               // ★導出: frame[B].y − frame[A].y
}
```

- **`line` / `length` / `rise` は すべて 導出値**。手で 書かない
- **C（buffer zone region）は 採用しない。** region を 増やすと `region 11 / tier1 17 / zone 103 / link 12` の 分母が 動き、Phase 3B で 揃えた ばかりの 数が 崩れます
- **D は Phase 4D 以降の 描画の 話**。設計には 入れるが 実装順は いちばん うしろ
- `features` は **世界地図の 表現の まま** 据えおく（`divide` が にしのやまちの 南はし 4 点と 一致する、という 既存テストを 壊さない）

---

## 10. connection の global 上の 意味（§18）

| kind | 本数 | global で 連続か | closure を 検算するか |
|---|---:|---|---|
| **walk** | **10** | **○ 本当に 空間的に つながる** | **する**（`< 400`） |
| **sea** | 1（`jungle\|sea`） | **×** transport edge。あいだは 「みなみにしの がいよう」= `region: null` | **しない** |
| **vertical** | 2（`deepsea\|sea` もぐる / `countryside\|star_stop` ゴンドラ） | **×** layer を またぐ transport edge | **しない**（X/Z は 近くて よいが しばらない） |

### 決めごと

| # | 決めごと |
|---|---|
| C1 | **walk 10 本は「本当に つながる」として あつかう。** corridor に 長さと 方角が 付く |
| C2 | **special 3 本は transport edge。** 空間的に 離れて いて よい。`jungle` は 外洋の むこうの 島、`star_stop` は 上空、`deepsea` は 外洋の 下 |
| C3 | **`memory_lake` は edge ですら ない。** 入口だけ |
| C4 | **世界地図の 線は いまのまま。** `worldLinksFrom()` は `gate` を 見ない ＝ 「両端の mouth spot を 見つけたら 線が 引ける」。この 挙動は Phase 3B-Final で 「地図の 線 ＝ 通れる 道」に 揃った ので、**4A では 触らない** |

---

## 11. save 互換（§22）

**global 座標は save に 入れません。導出値です。**

| 項目 | 4A の 決定 |
|---|---|
| 保存する もの | **いまと 完全に おなじ**: `state.regionId` ＋ spot / zone / path / mark / worldRegions / worldLinks の **id だけ** |
| global position | **保存しない**。`toGlobal(state.regionId, player)` で いつでも 出せる |
| 旧セーブ | **1 バイトも 変わらない。migration 不要。schemaVersion も 上げない** |
| 根拠 | §1.7 — **いまの save は すでに 座標を 持って いません。** プレイヤーの 位置は `enterRegion()` が spot id から 作りなおして います |

> **これは 4A で いちばん 安心できる 結論です。** regionOrigin を 入れても、**旧セーブは 何も 気づきません。**

将来 もし「地域の 途中で セーブして、その 位置から 再開したい」に なったら、そのときも **`{ region, x, z }`（region-local）**で 保存します。global で 保存すると frame を 直すたびに セーブが 壊れます。

---

## 12. collision（§20）

**region-local collision の まま。global transform は 外側だけ。**

| # | 決めごと | りゆう |
|---|---|---|
| X1 | `buildObstacles` / `buildCollisionGrid` / `collidersAt` / `moveWithCollision` / `clampToWorld` は **1 行も 変えない** | すでに world を 引数で 受ける 純関数。原点が どこでも 成立する |
| X2 | ます目の 原点は いまのまま **その region の obstacle の 外接箱** | global に 焼きなおすと、chart が かさなる せいで **よその region の 壁に ぶつかる** バグに なる |
| X3 | **全 collider を global に 焼きなおす 案は 採用しない**（§20 の 指示どおり） | §2.3。43/45 の chart が かさなる ので、global 1 本の grid は 別地域の 壁を 拾う |
| X4 | corridor の 当たり判定は **4D 以降**。いまは corridor を 歩けない（`cross` で 世界を 入れかえる） | Phase 2.1 の 仕組みを 温存（§25） |

---

## 13. resident / party（§21）

**`region + localPosition` を 維持。必要な ときだけ global に 変換。**

| | **甲: `region + localPosition`（推奨）** | 乙: `resident.globalPosition` |
|---|---|---|
| いまの `updateActor` | **無変更** | 全書きかえ |
| chart の かさなり | **平気**（自分の chart の 中だけ 見る） | **こわれる**（よその region の 住民と 衝突判定が 走る） |
| 住民の 台帳 | **無変更** | region を 逆引きする 必要（§6 T4 で 一意に 決まらない） |
| 遠景に となりの 地域の 住民を 出す | `toGlobal` で 出せる | そのまま |
| メモリ | 変わらない | 変わらない |

### 決めごと

| # | 決めごと |
|---|---|
| R1 | **resident は `region + local` の まま。`globalPosition` フィールドは 作らない** |
| R2 | **必要な ときだけ `toGlobal(a.region, a)` で 導出**（遠景 LOD・世界地図の 点・デバッグ表示） |
| R3 | **party も おなじ。** `followParty` は camera.yaw 基準の まま。`yawToGlobal` で 変換できれば 3D でも そのまま |
| R4 | **region 間移動は Phase 4A では 実装しない**（§21 の 指示どおり）。将来 やる ときも 「corridor に 入る」= chart を 移る、で 表す |

---

## 14. renderer 分離（§23）

**すでに できて います。4A で 決めるのは「やぶらない」という 約束だけ。**

```
  simulation                        renderer
  ─────────────                     ──────────
  WORLD_GEOGRAPHY   ← 地理正本
  REGION_FRAME      ← ★4B で 追加
  WORLDS[id]        ← 1 ページの 中み
  createSimulation  ← state・カメラりぐ・collision・住民
        │
        └── worldLayers(world) ────→  Canvas   （いまは props/areas を 直読み）
        └── camera{x,z,yaw,dist,height} →  Three.js（将来）
        └── toGlobal / toLocal ────→  どちらも
```

| # | 決めごと |
|---|---|
| V1 | **renderer は `REGION_FRAME` を 書きかえない。読むだけ** |
| V2 | **`toGlobal` / `toLocal` は simulation 側に 置く。** renderer に 同じ 計算を 書かない |
| V3 | **Canvas renderer は 4B〜4C で 1 行も 変えない。** global は Canvas には 要らない（1 region しか 映らない） |
| V4 | **Three.js は 4D 以降。** そのとき `worldLayers` ＋ `REGION_FRAME` ＋ `CORRIDOR` の 3 つだけを 読む |

---

## 15. streaming（§24）

**実装しません。ロード単位の 案だけ 決めます。**

`worldLayers()` に すでに `L.streaming = { cell: 1200, activeRadius: 3600, zoneReach: 'nearest' }` と `L.zone[].bounds` / `L.zone[].neighbors` が あります。

| 単位 | 中み | いつ 読む | メモリの 目安 |
|---|---|---|---|
| **current region** | いまの chart 全部（spot / path / zone / obstacle / props） | **つねに** | いまと おなじ（1 region ぶん） |
| **neighbor region** | となりの chart の **遠景だけ**（`landmark` ＋ `terrain` の 輪郭。`obstacle` / `scenery` / 住民は 読まない） | **chart の はしに ちかづいたら** | 1 region の 1 割 いか |
| **corridor** | その connection の `land` 6 段 ＋ `line` | **gate に のった ら** | ほぼ ゼロ（ことばと 2 点） |
| **special destination** | ゴンドラ / ふね / もぐる の 行きさき | **のりばに ついたら**（ボタンが 出たら） | 1 region ぶん（いまと おなじ = 入れかえ） |

### 比較と 決めごと

| 案 | 評価 |
|---|---|
| ①「current だけ」= **いまの 挙動** | ○ いちばん 安い。4B / 4C は これで よい |
| ②「current ＋ neighbor の 遠景」 | **★ 4D の 目標。** 「峠の むこうに とかいが 見える」が できる |
| ③「current ＋ neighbor 丸ごと」 | × 住民 AI が 2 地域ぶん 走る。`REGION_LIFE` の 負荷が 倍 |
| ④ zone 単位の 細かい streaming | △ `L.streaming.cell = 1200` で できる 準備は ある。**ただし Canvas は `farCull` で すでに 足りて いる**。Three.js に した あとの 話 |

> **4A の 結論: streaming は ② を 目標に、実装は 4D。それまでは ① の まま。**

---

## 16. 既存 transition との 共存（§25）

**Phase 2.1 の `approach → cross → arrive → settle` は そのまま 残します。**

| way | 本数 | global 化した あと |
|---|---:|---|
| `walk` | 10 | **`cross` が 将来 「本当の 連続移動」に 置きかわる 可能性が ある**（4D 以降）。それまで `cross` は いまどおり 世界の 入れかえ |
| `up`（ゴンドラ） | 1 | **ずっと 必要。** 空間的に 連続に できない（layer を またぐ） |
| `down`（もぐる） | 1 | **ずっと 必要。** おなじ |
| `sail`（ふね） | 1 | **ずっと 必要。** 外洋は region では ない |

| # | 決めごと |
|---|---|
| S1 | **4 フェーズの 名前・順番・`span` は 変えない** |
| S2 | **`walk` の `cross` を 連続移動に 置きかえるのは 4D 以降の 選択肢。** 4B / 4C では 触らない |
| S3 | **special transition（up / down / sail）は 恒久的に 必要。** 「global 化したから いらなくなる」ものでは ない |
| S4 | corridor の `land` 6 段は **いまも これからも `approach` と `arrive` の ことば** |

---

## 17. Phase 4B 以降の 実装順（§28）

**一気に full continuous world へは 行きません。** 4 段に 分けます。各段は **単独で マージできて、単独で 価値が ある** ように しました。

### Phase 4B — 「置く」（データと 純関数だけ）

- `REGION_FRAME` を `meguru.js` の 正本に 追加。**13 地域ぶん の `{x, z, y, yaw, layer}`**
  - 数値は **canon v1 の 地理を 先に 満たし**、§2.2 の closure を **検算**に 使う
  - `memory_lake` は X/Z/yaw を 持たない
- `toGlobal()` / `toLocal()` / `dirToGlobal()` / `yawToGlobal()` を export
- **テスト**:
  - 往復が 一致する（`toLocal(toGlobal(p)) ≈ p`）
  - walk 10 本の closure が `< 400`
  - `memory_lake` は `null` を 返す
  - **`REGION_FRAME` を 消しても ゲームが 動く**（＝ まだ 誰も 使って いない ことの 証明）
  - **471 / 654 / 118 / 107 と region 11 / link 12 / tier1 17 / zone 103 が 不変**
- **変えない もの**: renderer / collision / resident / camera / save / 世界地図 / travelToRegion()

### Phase 4C — 「つなぐ」（corridor の 正本化と 最初の 見える 効果）

- `CORRIDOR` を 追加（§9）。`land` は 既存 gate から 引く。`line` / `length` / `rise` は 導出
- **最初の 見える 効果**: gate の そばで 「○○は あちら（方角）／およそ □□」を 出す
  — `REGION_FRAME` が **実際に 使われる** 最初の 場所
- `layerY` の 数値を 確定（`star_stop` の 高さ / `deepsea` の 深さ）
- **テスト**: corridor 11 本ぶん の 長さ・方角が 出る。special 3 本は closure を 見ない
- **変えない もの**: collision / resident / save / 世界地図 / transition

### Phase 4D — 「見せる」（となりが 見える。Three.js の 入口）

- neighbor region の **遠景 LOD**（landmark ＋ terrain の 輪郭だけ）
- streaming ② を 実装（§15）
- Three.js renderer の 試作。**`worldLayers` ＋ `REGION_FRAME` ＋ `CORRIDOR` の 3 つだけを 読む**
- **変えない もの**: collision（region-local の まま）/ resident（region 内の まま）/ save

### Phase 4E — 「歩く」（walk connection の `cross` を 連続移動に）— **やるか どうかは そのとき 決める**

- walk 10 本 だけ、`cross` を 本当の 連続移動に 置きかえる
- corridor に 当たり判定を 与える
- **special 3 本は そのまま**（§16 S3）
- **ここで はじめて chart の かさなりが 問題に なる。** そのときの 対処は 4D までの 実測を 見て 決める（corridor を 「別の chart」に する 案が 有力）

```
4B 置く ──→ 4C つなぐ ──→ 4D 見せる ──→ 4E 歩く(未確定)
 データ      corridor      遠景・3D      連続移動
 純関数      方角と距離     streaming
 使われない   初めて使う     Three.js
```

---

## 18. 完了条件の チェック（§29）

| 項目 | 決まったか | どこ |
|---|---|---|
| regionOrigin の 意味 | **○** `{x, z, y, yaw, layer}` の 剛体変換。chart の 位置と 向き | §5 |
| local / global 変換 | **○** `global = origin + Rot(yaw)·local`。純関数。逆引きは 作らない | §6 |
| save 方針 | **○** **保存しない。導出値。旧セーブは 無変更** | §11 |
| special layer | **○** `layer` に `y` を 与える。数値は 4C | §7 |
| memory_lake 扱い | **○** **別 namespace。regionOrigin を 持たない** | §8 |
| non-region geography | **○** 案 A（既存 `land` を 正本化）＋ 案 B の 線分だけ。**案 C は 不採用** | §9 |
| renderer 分離 | **○** すでに 達成済み。「やぶらない」約束を 明文化 | §14 |
| 導入順 | **○** 4B 置く → 4C つなぐ → 4D 見せる →（4E 歩く） | §17 |

---

## 19. 今回 実装して いない ことの 確認（§11）

| 禁止事項 | 状態 |
|---|---|
| regionOrigin を コードに 追加 | **して いない**（`meguru.js` は 無変更） |
| 全 spot 座標の 書きかえ | **して いない**（471 spot 不変） |
| global position を save に 追加 | **して いない**（`script.js` は 無変更） |
| Three.js を 入れる | **して いない** |
| renderer の 作りなおし | **して いない** |
| resident を global 移動 | **して いない** |
| streaming の 実装 | **して いない**（案の 比較だけ） |

この PR で 変わる ファイルは **`docs/` だけ** です。

---

## 付録 A — 測定の 再現方法

この 文書の 数値は すべて **最新 main の `meguru.js` から 実測**した ものです。再現には `tests/helpers/runtime-harness.cjs` を 使い、

1. `WORLD_GEOGRAPHY.connections` から、両端が `layer === 'ground'` で `gate` を 持つ 11 本を 取りだす
2. 各 connection の `mouths` から local 座標を 引く
3. 全域木で origin を 伝播 → 木に 入らなかった 2 本の closure を 測る（平行移動のみ）
4. 各 region に yaw を 足して 最小二乗で 解く（回転あり）
5. 回転こみの 箱を SAT（分離軸定理）で 総当たり交差判定
6. 縮尺 k を 1.0 → 0.1 で 振り、こみぐあいを 測る

## 付録 B — 用語

| ことば | いみ |
|---|---|
| **chart（ページ）** | 1 つの region の world。歩ける 縮尺で 描かれた 地図帳の 1 ページ |
| **frame** | その chart が global の どこに どちらを 向いて 置かれて いるか。`REGION_FRAME[id]` |
| **corridor** | chart と chart の あいだ。既存の `land` 6 段 ＋ 導出の 線分 |
| **closure** | connection の 両がわの mouth を global に 写した ときの ずれ。**0 に 近いほど 地理が 正しい** |
| **こみぐあい** | region の 面積合計 ÷ 全体を いれた 箱の 面積。**1 を こえたら 平面に 並べられない** |
| **transport edge** | 空間的に 連続で ない connection（ふね・ゴンドラ・もぐる） |

## 付録 C — canon v1 の 方角と 世界地図の 照合（Phase 4B の 出発点）

`REGION_FRAME` の 数値は **canon v1 の 地理が 優先**（§5 D4）です。その 出発点として、いまの 世界地図が canon を どれだけ 満たして いるかを 測りました。
（世界地図の 向きの 約束: **+mapY = 北 / +mapX = 東**）

| region | map(X, Y) | home からの 方角 | 図上の きょり | canon v1 の 指定 | 判定 |
|---|---|---|---:|---|---|
| river_lake | (2.55, 2.1) | 北北東 (15°) | 1.8 | （明示なし） | — |
| forest | (0.4, −1.0) | 南西 (231°) | 2.2 | home の 南〜南西 | **○** |
| countryside | (−1.3, −2.1) | 南西 (234°) | 4.2 | forest の さき（南〜南西） | **○** |
| mountain | (0.6, 3.5) | 北北西 (334°) | 3.4 | 西 | **△**（後述） |
| snow | (−0.2, 5.0) | 北北西 (333°) | 5.1 | 北 | **△**（後述） |
| desert | (−3.2, 1.4) | 西 (281°) | 5.4 | 北西 | **△**（34° ずれ） |
| city | (−3.6, −3.0) | 西南西 (239°) | 6.6 | 峠・分水界の むこう | **○** |
| sea | (−1.2, −6.1) | 南南西 (207°) | 7.3 | city がわ 水系の 河口・湾 | **○** |
| jungle | (−6.3, −7.8) | 南西 (226°) | 11.7 | 南西の 外洋の しま | **○**（いちばん 遠い） |
| deepsea | (1.3, −6.7) | 南 (186°) | 7.1 | 外洋の した | **○**（sea の 南東 +2.5 / −0.6 ＝ みさきの そと） |
| star_stop | (−1.6, −1.8) | 西南西 (239°) | 4.3 | countryside の 上空 | **○**（countryside との ずれ −0.30 / +0.30 ＝ ほぼ 真上） |
| memory_lake | **なし** | — | — | 通常地図の そと | **○** |

### △ の 3 つについて

**これは 矛盾では なく、「山脈（feature）」と「歩ける やま（region）」の ちがい** です。

- canon v1 の 本文は 「**北〜北西に 弓なりの 山脈**（ゆきぐに — やま — もり）」と 書いて います。
  `mountain` 334° / `snow` 333° は **この 弓の うえ** で、本文と 一致します
- 「西に mountain」は **`west-range`（にしのやまち、14 点の feature 線）**の こと。
  `west-range` は region では なく 地形線で、その 南はし 4 点が `divide`（分水界）と 一致する ことを 既存テストが しばって います
- `desert` の 281°（西）は canon の 「北西」と **34° ずれて います**。
  これは Phase 4B で `REGION_FRAME` を 書く ときに **正すか、canon の 文言を あわせるか を 決める 1 件**として 残します。
  **今回（4A）は どちらも 変えません。** `mapX / mapY` を 動かすと 世界地図の 見えかたと 既存テストが 動くので、4A の 「実装しない」に 反します

### Phase 4B が 出発点に する もの

1. **方角**: 上の 表の 「home からの 方角」（`desert` の 1 件を のぞき canon と 一致）
2. **距離の 比**: 図上の きょり（1.8 〜 11.7）。ただし **`GEO_UNIT` の たんいで あって world たんいでは ない**（§1.3）
3. **上下**: `star_stop` は countryside の ほぼ 真上、`deepsea` は sea の 南東 ＝ みさきの そとの 下
4. **検算**: §2.2 の closure（walk 10 本が `< 400`）

> **世界地図は 「方角と ならびの 出発点」として 使い、「world たんいの 座標」としては 使わない。** これが §19 の 結論の 実務的な 意味です。
