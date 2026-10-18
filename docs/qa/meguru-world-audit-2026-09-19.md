# めぐる 全体仕様 総監査（世界統合の前提資料）— 2026-09-19

対象 main: **`4da468f`**（PR #295 マージ直後）
確認した直近マージ済み PR: **#292**（13地域の広大化）/ **#293**（探索地図）/ **#294**（ワールド座標の当たり判定）/ **#295**（住民生活 v1）
テスト: `npm test` = **929 件 pass / 0 fail**（ローカル実行、150.8 秒）
CI（main `4da468f`）: Runtime smoke test **success**、pages build **success**、Home layout は確認時点で実行中
主要ファイル: `meguru.js`(4150行) / `script.js`(17880行) / `world-environment.js`(243行) / `world-scene.js`(206行)
正本ドキュメント: `README.md`（めぐるの章）、`DEVELOPMENT_CHECKPOINT_2026-09-07.md` チェックポイント **CY / CZ / DA / DB**

**この文書は監査だけです。実装コードは 1 行も変更していません。**

---

## A. 現在仕様（13地域の正本値）

すべて実測値（`M.WORLDS` と `buildWorld()` から算出）。

| region | halfW | len | 面積 | zone | spot | path | 秘密spot | 大landmark | 入口 | 奥地 | terrain | 環境アニメ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| home | 1150 | 3000 | 6.9 Mu² | 4 | 14 | 19 | 1 | 1 | `gate` | `bigtree` | – | glow, leaves |
| city | 2300 | 6600 | 30.4 | 10 | 47 | 63 | 4 | 1 | `station` | `obs` | – | neon, leaves, glow, water |
| countryside | 2600 | 7700 | 40.0 | 10 | 46 | 62 | 4 | 3 | `gate` | `riverislet` | – | leaves, water, mist |
| forest | 2900 | 7900 | 45.8 | 11 | 50 | 72 | 3 | 3 | `entry` | `hearthidden` | – | leaves, water, glow, mist, motes |
| mountain | 2000 | 9000 | 36.0 | 10 | 39 | 56 | 4 | 2 | `foot` | `summit` | – | leaves, water, mist, motes |
| snow | 2500 | 7600 | 38.0 | 9 | 35 | 48 | 4 | 2 | `gate` | `peak` | – | snow, leaves, motes, mist |
| sea | 2500 | 8000 | 40.0 | 10 | 35 | 49 | 4 | 1 | `beach` | `wreckboat` | **coast**(side −1) | water, sand |
| deepsea | 2200 | 7800 | 34.3 | 9 | 34 | 49 | 4 | 1 | `reef` | `abyss` | **chasm** | motes, water, glow |
| river_lake | 2200 | 8000 | 35.2 | 9 | 35 | 50 | 4 | 2 | `bank` | `islet` | **river** | water, mist |
| jungle | 2600 | 8100 | 42.1 | 10 | 40 | 57 | 5 | 2 | `entry` | `deepheart` | – | leaves, water, mist |
| desert | 3400 | 8800 | 59.8 | 11 | 40 | 52 | 4 | 2 | `gate` | `sunstone` | – | sand, water, glow |
| star_stop | 2600 | 7300 | 38.0 | 9 | 34 | 47 | 4 | 1 | `stop` | `voidedge` | – | motes, glow |
| memory_lake | 1400 | 5000 | 14.0 | 6 | 20 | 28 | 5 | 0 | `shore` | `bottom` | **coast**(side +1) | water, mist, glow |
| **合計** | | | **460.6 Mu²** | **118** | **469** | **652** | **50** | **21** | | | | |

- path の内訳: `wide` 16 / `path` 215 / `narrow` 364 / `secret` 57
- **秘密 = 秘密 spot 50 + 秘密 path 57 = 107**（「107 秘密場所」の正体はこの合算）
- 景色 props **8805**、当たり判定 **3682**
- 住民数は**セーブの進み具合で変わるので一語では言えない**（正本はチェックポイント DC）:

| 条件 | 数 |
|---|---|
| ずかんの姿の上限（`ALL_LINES` 31 系統 × 8 段階） | 248 |
| resident registry（ずかん全解放・なかま 0・こいびと 0） | **247**（= 248 − いまの子 1） |
| 台帳総数（ナオト解禁時） | 248 |
| **通常世界配置対象（同行者なし）** | **248**（重複 0・未配置 0） |
| ＋なかま 18 / レアなかま 8 / こいびと 18（最大） | **292** |
| 同行中 1 体／2 体 | 配置 291 + party 1 ／ 配置 290 + party 2 |
| ナオト未解禁 | −1 |
- spot kind: `path` 150 / `rest` 94 / `plaza` 58 / `water` 54 / `edge` 41 / `grove` 36 / `shelter` 25 / `shop` 8 / `deep` 3
- activity 可用数: idle 469 / look 437 / rest 273 / walk 252 / sit 221 / sleep 175 / talk 150 / play 105 / gather 102 / fish 54 / watch 54 / shop 8。`shelter` 54 spot・`seats` 221 spot
- 住民の生活傾向（`REGION_LIFE`）は 13 地域すべて別の数字。city social 1.7 ↔ memory_lake 0.2、memory_lake quiet 2.2 ↔ city 0.5、star_stop view 1.8

---

## B. 地域地図・発見（PR #293 の正本）

| 項目 | 現状 |
|---|---|
| 入口 | 探索画面の右下の小さな **🗺 ちず** ボタン 1 つだけ。常時ミニマップなし |
| データ | `sim.mapData()`。`worldLayers(world)` を 1 回呼び、`visitedZones` / `walkedPaths` / `discovered` / `foundMarks` で絞る |
| zone 発見 | 歩いて `zoneAt()` がその zone に入ると `visitedZones.add` |
| path 発見 | 両端の spot を発見済みで、その線分を歩くと `walkedPaths.add(segKey)` |
| spot 発見 | `spotAt(player)` に入ると `discovered.add` |
| landmark | `mid` を持つ prop が `MARK_SIGHT`（tier1 **2600** / tier2 **1200** / tier3 **700**）以内に入ると `foundMarks.add`。13 地域で mid は計 205、tier1 は 18 個 |
| Fog of War | 未訪問 zone は「ふつうの道でつながっている」ものだけ `hinted` でぼかし。秘密だけで通じる zone は出さない |
| 秘密の非表示 | 4 重の防御: ① path は**両端が発見済み**のときだけ描く ② zone の bounds を**発見済み spot からのみ**再計算（`worldLayers` の bounds は秘密込みなので使わない）③ hinted の隣接計算から secret path を除外 ④ landmark は tier ごとに視界で段階解禁 |
| 現在地 | 向き付きの小さな矢印。住民の位置は**出さない** |
| 探索率 | `(見つけた非秘密 + 見つけた秘密) / (非秘密の総数 + 見つけた秘密)`。zone の分母は「非秘密 spot を持つ zone ∪ 訪問済み zone」。**残りの秘密数を逆算できない** |
| 描画 | `mapPalette` / `mapLayout` / `drawMap`。地図専用の手書きデータは 0。地面色・海岸線・川・浮島はすべて世界データから |
| 再開位置 | 地図を開くと探索は停止。「もどる」で**同じ座標から**再開（`player` に触らない） |
| fps | 開いたときだけ作り、閉じると捨てる。歩行中の fps に一切足さない |

---

## C. 地域／座標構造 ← **今回いちばん重要な発見**

### C-1. 13 地域は完全に独立した別 world

- `buildWorld(regionId, …)` が **region ごとにゼロから world を組む**。`WORLDS[regionId]` が `len` / `halfW` / `ground` / `zones` / `spots` / `paths` を持つ。
- **region を跨ぐ一意な world 座標は存在しない。** 全地域が `x ∈ [minX, maxX]`、`z ∈ [0, len]` の**ローカル座標**を持ち、原点はそれぞれの地域の入口付近。
- `world.minX/maxX` は左右対称とは限らない: sea は **−705 … 2500**（海岸線が左を食う）、memory_lake は **−1400 … 727**。
- **地域間の隣接関係はコード上に一切存在しない。** `zone.neighbors` はあるが、これは**同一地域内の zone 同士**だけ。region 間の辺・距離・方角を持つデータはゼロ。

### C-2. 地域の端へ歩いたとき何が起きるか

`clampToWorld(pt, world)` が

```
x → clamp(x, minX, maxX)   （coast 地域は shoreX() で片側をさらに狭める）
z → clamp(z, 60, len − 60) （RULES.zMargin = 60）
```

を**毎フレーム無条件に**かけるだけ。**イベントも当たり判定もなく、黙って止まる。**

> **注意**: `role: 'boundary'` の collider 498 個は「世界のふち」ではない。cliffwall 112 / reefwall 107 / islandedge 59 / snowbank 49 / mesa 49 / dunewall 47 / duneridge 33 / seacliff 22 / cliff 20 — **崖や砂丘という景色**である。世界の端は collider を一切持たない。

### C-3. 地域切替で何がリセット／維持されるか

`sim.enterRegion(regionId)`（`meguru.js`）:

| | 扱い |
|---|---|
| `world` | **作り直し**（props・residents・obstacles・collision grid すべて） |
| `player` | **入口へリセット**（`world.entry.x, entry.z − 60`）。その後 `clampToWorld` + `resolveObstacles` |
| `camera` | `x/z` は player に合わせ、`yaw = 0` にリセット |
| `nearest` / `curSpot` / `curZoneId` / `inputActive` | すべてリセット |
| `discovered` / `visitedZones` / `walkedPaths` / `foundMarks` | **セーブから region ごとに読み直し**（同じ region への再入場なら現在値を維持） |
| `party`（同行者） | `companionsOf(registry)` で作り直し |

`enterWorld(regionId)`（`meguru.js` の UI 層）がさらに `loadMapRecords` / `preload` / `setEnv` / バナー表示を行う。
フレームループが毎フレーム `st.regionId !== sim.world.regionId` を見ていて、**セーブの `regionId` が変わった瞬間に自動で切り替わる**。

---

## D. たび（`travelToRegion()` の副作用一覧）

ホームの 3×3 → 「せかい」/「たび」→ 画面いちばん上に「**○○をめぐる**」（`meguruEntry`）、その下に地域カード（`travelRegionGrid`）と特別地域（`travelSpecialGrid`）。
「○○をめぐる」は `startMeguru()` を呼ぶだけで**たびではない**（消費なし）。地域カードのタップが `travelToRegion(region)`。

`travelToRegion(region, choice)` の副作用（**世界統合で絶対に飛ばしてはいけない処理**）:

1. **ガード**: 睡眠中は不可 / `region.special` は `hasPerk(70)`（そだち70「たびだち」）必須 / `travelStartAllowed(region)` / 同じ region へは不可
2. `currentLocationIntent += 1`、開いている overlay を閉じる
3. **げんざいち解除**: home ↔ home で `currentLocationSelected` のときは、**消費も記録もせず表示だけ戻して return**（重要な分岐）
4. `state.calledMatch = null`、`currentLocationSelected = false`、`currentLocation = null`
5. `affectionStreak = 0`、`travelStreak += 1` → `travelSpamThreshold()` 超過で**たびづかれ**
6. **訪問記録**: `special` は `lifetime.specialRegionsVisited`、通常は `lifetime.regionsVisited`。**別配列なのは「せかいいっしゅう」実績の条件を壊さないため**
7. `state.regionId = region.id` ← **これがめぐる側の region 切替トリガ**
8. 初訪問なら `visitedList.push` + `pushLifeLog`（人生ログ、はじめからでも消えない）
9. **消費**: `travel1` 装備なら消費なし、それ以外は `energy −6` / `hunger −4`
10. **成長/減少**: たびづかれなら `happiness −3` + `applyDecline(5)`、正常なら `applyGrowth(初訪問 ? (special?12:6) : (special?4:2))` + `applyDecline(−2)` + `happiness +5`（perk70 で 2 倍）
11. `pickReaction(region.lines)`、`speakEvent('travel', {partnerChance:0.7, companionChance:0.75})`、`checkStoryEvents('travel')`
12. `checkMeters()`、`setMessage`、`emotePet`、`saveState()`、`render()`

`REGIONS` = home + 通常 10 = **11**。`SPECIAL_REGIONS` = `star_stop` / `memory_lake` の **2**（REGIONS に入れない。入れると実績条件とこいびと候補数が変わる）。

---

## E. collision（PR #294 の正本）

- `COLLIDER[kind] = { shape:'circle'|'box', w, d }` — **`size` に対する比で接地面**を定義。絵の四角ではない
- `colliderOf(prop)` → `{ kind, shape, hw, hd, ang }`、`null` なら通れる
- `world.obstacles[i] = { kind, shape, x, z, hw, hd, ang, role, r }` — **すべて world 座標**。canvas の px はどこにも出てこない
- `role` の実測内訳（13地域合計 3682）: **`solid` 3168 / `boundary` 498 / `water` 16**
  - `water` = springpool 7 / rockpool 8 / oasispool 1 — **景色の水たまり**（水の住民だけ入れる）
  - `boundary` = 崖・砂丘・リーフ壁・浮島のふち — **世界の端ではない**（C-2 参照）
- `clearCorridor()` が生成時に、道の通行帯（`PATH_HALF` + 26）と spot 中心 46 に食いこむ分を自動で縮め、13 未満なら置かない → **652 本の道の中心線と 469 spot 中心に当たり判定 0**
- spatial grid `world.collision`（cell 360、体の大きさ分のりしろ付き）→ 1 マス平均 2.2〜4.6 個
- `moveWithCollision()` が**プレイヤーと住民の共通ソルバー**。浅い軸へ押し出して滑り、めりこみが増える移動は拒否
- 歩けない水は**海岸線の外の海だけ**（`clampToWorld` + `shoreX`）。川・湖・滝つぼ・潮だまり・海底・海溝は設計上歩ける

**世界統合時の boundary の扱い**: 地域の端は今 collider ではなく `clampToWorld` の数値クランプなので、**地域をつなぐときに「消すべき壁」はコード上に存在しない**。`clampToWorld` の条件を「境界 zone なら隣地域へ引き渡す」に差し替えるだけでよく、collider 側は一切触らなくてよい。これは統合にとって非常に有利な状態。

---

## F. 住民台帳

`buildRegistry()` が返すのは `{ residents, naoto, byRegion }`。

| 種別 | key | region の決まり方 | 移動 |
|---|---|---|---|
| **form**（ずかんの姿） | `form:<line>:<stage>` | `HABITAT[line][stage % len]` で**固定**（例 penguin → snow/sea、beetle → forest/jungle、antlion → desert） | **しない**（定住） |
| **companion / rare** | `companion:<id>` | 同行中は `state.regionId`。それ以外は `hash(id + 日付) % pool`、`preferredRegions` は重み 4 倍、**プールは NORMAL_REGIONS 11 のみ** | **日替わりで瞬間移動**（旅人） |
| **partner**（こいびと） | `partner:<id>` | 同行中は `state.regionId`。それ以外は `p.firstRegion`（初めて出会った地域）で固定 | しない |
| **naoto** | `naoto` | **`memory_lake` の `deep` spot 固定**、`secret: true` | しない |

- **dedupe**: 最後に `byKey` Map で一意化。`withPlayer` が優先される → **「住民台帳 1 体 = 世界に存在する 1 個体」**
- **current pet 除外**: `buildRegistry` が `key === petKey` の姿をスキップ（いまの子は自分自身として歩く）
- **legacy 除外**: `S.ALL_LINES` にない旧種族はセーブに残っても住民にしない
- **同行者の二重出現防止**: `buildWorld` が `withPlayer` を world の residents から外し、`companionsOf()` が party 側に作る。`auditRegistry()` が `follower-duplicate` として検出
- **実測**（ずかん全解放・なかま 0・こいびと 0・ナオト解禁）: registry 247 + ナオト = 13 地域に **248 体配置、ユニーク 248、重複 0、未配置 0**。
  なかま 18・レアなかま 8・こいびと 18 をすべて記録すると最大 **292 体**、同行中の分だけ世界から外れて party に出る。
  **除外は「いまの子」1 か所だけ**で、これは仕様（プレイヤー自身として歩く）。`HABITAT` は `ALL_LINES` 31 系統すべてを覆っており、住まいが無くて消える系統はない

---

## G. 住民生活 v1（PR #295 の正本）

- **behavior**（simulation の状態、描画ではない）: `idle / walk / look / rest / sit / sleep / talk / gather / play` + `swim / sway / watch / fish / shop / chase`
- **activity**（spot が持つ「ここで何ができるか」）: `spot.activities` / `spot.actWeights` / `spot.shelter` / `spot.seats` / `spot.zoneCrowd`
- **emotion**（behavior と独立）: `normal / happy / tired / sleeping / unhappy / wantsPlay / strained`。**表情の正本の部分集合**。お世話状態（hungry/sick/weak/critical）は住民から出さない。今回は非表示
- **lifeTraits(key)**: `wander / social / calm / gaze / pace / phase` を key から決定論的に。**セーブ増加ゼロ**
- **REGION_LIFE × zone.mood.crowd × TIME_LIFE × WEATHER_LIFE × SEASON_LIFE × traits** で activity を重み付け
- **interaction**: talk は `reservedBy` の**予約制**（1 人に 2 人以上申しこまない）。中点へ歩き、`talkGap` 88 で向き合い、7〜16 秒で自然解散 + クールダウン。gather は近く 760 の既存の輪に入り、`meetR` 96 の輪に等間隔。**平均 2.0〜2.2 人、最大 4**
- **path 移動**: `routeTo()` が spot グラフ BFS（cap 60）。`goalFor()` は `LIFE.roam` **900** 以内から選ぶ（世界中をうろつかない）
- **collision**: 住民も `moveWithCollision` を通る。住民同士は `LIFE.space` 46 の軽いパーソナルスペースのみ
- **層**: `LIFE.detail` 1600 / 最大 **48 体**毎フレーム、`LIFE.near` 4200 / 6 フレームに 1 回、それ以遠は `stepDistant` が毎フレーム **12 体**だけ「次の行動」へ進める
- **lifeDebug**: `sim.lifeDebug = true` で behavior/emotion を住民の上に表示。通常 UI には出さない
- **性能**: sim.step 13 地域平均 **0.018ms → 0.033ms**（ブラウザ内実測、16.7ms 予算の +0.09%）、draw 変化なし

---

## H. streaming / active zone ← **もう一つの重要な発見**

`worldLayers()` は以下を返す:

- `zone[].bounds` = `{minX, maxX, minZ, maxZ}`（その zone の spot の外接矩形、**秘密 spot 込み**）
- `zone[].neighbors` = **同一地域内**で道がつながる zone id
- `L.zoneReach = 'nearest'`
- `L.streaming = { cell: 1200, activeRadius: 3600, zoneReach: 'nearest' }`

**実際の利用状況（grep 実測）**:

| データ | 誰が使っているか |
|---|---|
| `L.streaming` | **どこも使っていない**。`mapData()` の返り値に素通しされるだけ（`meguru.js:2273`） |
| `zone.neighbors` | `mapData()` が地図に素通し（`meguru.js:2240`）。ストリーミングには未使用 |
| `zone.bounds` | `drawMap()` が地図のしみの大きさに使う（`meguru.js:3692`）。ただし**地図は `worldLayers` の bounds を使わず、発見済み spot から再計算**（秘密漏れ防止） |
| `worldLayers()` 自体 | **`mapData()`（`meguru.js:2217`）とテストからだけ**。canvas レンダラーは使っておらず、`world.props` / `world.areas` を直接読む |

→ **`streaming` は「将来 Three.js が読むための予約データ」であり、現在は誰も実際にストリーミングしていない。** 現在の実効的な負荷制御は ① 描画の `farCull` ② 住民の `LIFE.detail/near/distant` ③ collision の spatial grid（cell 360）の 3 つ。

**統合したときのストリーミング粒度の評価（実装なし）**

| 粒度 | 評価 |
|---|---|
| region 単位 | 1 地域 = 7〜60 Mu²。いまの 1 地域まるごと構築に耐えているので**最も安全**。ただし境界を跨ぐ瞬間に隣地域まるごとを組む必要があり、`buildWorld` は 8805 props 相当の生成を伴うのでヒッチが出る |
| **zone 単位** | 118 zone、1 zone あたり spot 3〜5。`zone.bounds` と `zone.neighbors` が**すでにある**。`mood`（明るさ・霧・風・主役）も zone 単位。**現状のデータ構造に最もよく載る** |
| world chunk 単位 | `streaming.cell` 1200 の格子。一様で 3D 向きだが、props / residents / colliders の生成が現在 region 単位のため、chunk 化には `buildWorld` の分割が必要 |

**推奨（分析のみ）**: 統合しても**生成は region 単位のまま**、**アクティブ判定だけ zone 単位**に上げるのが、既存データの流用度がいちばん高い。chunk 化は Three.js 移行と同時でよい。

---

## I. Three.js 移行: 使えるもの／整えるもの

`worldLayers()` の返り値を 3 観点で分類（forest での実測件数）:

| レイヤー | 件数 | Canvas 専用 | Three.js でそのまま | 世界地図に使える |
|---|---|---|---|---|
| `terrain`（ground + 起伏 + chasm centerline） | 72 | – | ✅ | ✅（地面色・地形） |
| `water`（sea shoreline / river centerline / pond / 景色の水） | 8 | – | ✅ | ✅（海岸線・川） |
| `road`（segment の a/b/half/kind + spot 円） | 115 | – | ✅ | ✅（道と場所） |
| `building` | 0（cityでは多数） | – | ✅ | △（tier次第） |
| `vegetation` | 440 | – | ✅ | ✕（細かすぎ） |
| `landmark`（kind/x/z/size/label/tier） | 12 | – | ✅ | ✅（**tier1 は世界地図の星に最適**） |
| `obstacle`（shape/hw/hd/ang/role） | 469 | – | ✅ | ✕ |
| `light`（zone ごとの light/fog/tint） | 11 | – | ✅ | △（雰囲気色） |
| `scenery`（絵文字 + layer） | 719 | **▲ 絵文字前提** | △（板ポリなら可） | ✕ |
| `zone`（id/name/x/z/mood/spots/bounds/neighbors） | 11 | – | ✅ | ✅（**地域内の区画**） |
| `env`（ground/sky/backdrop/canopy/wind/motion/view/density/detail） | – | – | ✅ | △ |
| `camera`（profiles/motion） | – | – | ✅ | ✕ |
| `streaming` | – | – | ✅（未使用の予約） | ✕ |
| `zoneReach` | `'nearest'` | – | ✅ | – |

**そのまま使える**: terrain / water / road / building / landmark / obstacle / light / zone / env / camera / streaming
**Canvas 依存が残る**: `scenery`（絵文字文字列）だけ。Three.js では板ポリかアトラスに置き換えが要る
**統合前に整えておくべきもの**:
1. `worldLayers()` に **region 識別と原点情報がない**（`L.env.region` はあるが、world 座標の原点は暗黙に 0）
2. `zone.bounds` が**秘密 spot 込み**（地図側は自前で再計算して回避済み）。3D 側が素直に使うと秘密の位置が形から読める
3. `worldLayers()` が canvas レンダラーから**呼ばれていない**ため、2 層構造は「宣言はされているが実戦テストされていない」。統合前に 3D プロトタイプで 1 度通しておくのが安全

---

## J. 世界統合したときの変更点（分析のみ）

### J-1. 住民モデル（§13）

「通常種族は定住／なかまは旅人／同行者は追従／ナオトは特別地点」は**そのまま維持できる**。必要になる概念:

| 概念 | いまの相当物 | 統合時に必要になるもの |
|---|---|---|
| `canonicalHomeRegion` | form は `HABITAT`、partner は `firstRegion` | **そのまま使える**（新規データ不要） |
| `currentRegion` | companion の日替わり `hash(id+日付)` | 旅人だけが持つ。form/partner は canonical = current |
| `travelDestination` | なし | 旅人が「歩いて移動する」なら新規。**日替わり瞬間移動を維持するなら不要** |
| `regionTransition` | なし（地域切替で world を作り直す） | 住民が境界を越えるなら、境界 zone で受け渡す仕組みが要る |
| **single-instance 保証** | `byKey` Map の dedupe + `withPlayer` 優先 | **統合しても同じ仕組みで足りる**。ただし「2 地域が同時にアクティブ」になると、同じ key が 2 つの world に居ないことを**world 側でも**保証する必要が出る（現在は 1 地域しかアクティブでないので自動的に満たされている） |

**最小の結論**: 旅人の日替わり瞬間移動を維持する限り、住民モデルは統合してもほぼ無傷。危ないのは「2 地域同時アクティブ」になった瞬間の single-instance だけ。

### J-2. 特殊 2 地域（§14）

コード上の実測された特殊性:

| | star_stop | memory_lake |
|---|---|---|
| REGIONS への所属 | **なし**（SPECIAL_REGIONS） | **なし**（SPECIAL_REGIONS） |
| 解禁 | そだち 70「たびだち」 | そだち 70「たびだち」 |
| こいびと候補 | 0（`candidates: []`） | 0 |
| 天気 | `effectiveWeather()` が **`{weather: null, source:'starry'}` を返す**（天気の概念がない） | 通常の天気 |
| 季節 | `hasSurfaceSeasons()` が **false** | true |
| 空 | `SKY_OVERRIDE` で固定（`#0a0c2a`/`#2c2560`） | `SKY_OVERRIDE`（`#2a2d4d`/`#5b6190`） |
| terrain | なし（浮島 = `islandedge` 59 個の collider） | **coast**（side +1） |
| 大 landmark | `bigstop`（ていりゅうじょ） | **0 個**（tier1 が 1 つもない唯一の地域） |
| 住民 | 12 | **2**（`REGION_LIFE.social` 0.2、10 分で立ち話 1 組・集まり 0 組） |
| ナオト | – | **`deep` spot に固定配置** |
| なかまの旅人プール | **入らない**（NORMAL_REGIONS 11 のみ） | 入らない |

**層構造の提案（分析のみ）**: この 2 つは既に「地理」ではなく「たどりつく場所」としてコードが分けている。世界地図でも

- **地上層**: home / city / countryside / forest / mountain / snow / sea / river_lake / jungle / desert（10）
- **水面下層**: deepsea（sea から潜る）
- **上空層**: star_stop（地上のどこからも「空」として見える／到達は特別）
- **記憶層**: memory_lake（地理座標を持たない。心象）

の 4 層に分けるのが、現在のコードの分かれ方と一致する。**star_stop と memory_lake には地上の x/z を与えない**のが自然。

### J-3. ホームの「ばしょ」「げんざいち」「たび」の意味（§15）

いまホーム背景は `じかん / てんき / きせつ / ばしょ(regionId) / げんざいち(locality)` で決まる。統合しても:

- **`regionId` は「いま自分がどの地域にいるか」のまま**。世界地図が増えても意味は変わらない
- **`げんざいち`（実在地名）は `regionId === 'home'` のときだけ有効**な別軸。世界地図とは直交する概念なので**影響しない**
- **「たび」の意味だけが変わりうる**（§20 参照）

### J-4. 世界地図の UI 構造（§16、提案）

```
ホーム 3×3 →「せかい」/「たび」
  └ [せかいのちず]      ← 新規。地域カードの上、「○○をめぐる」の下
       └ 地域をタップ → 既存の地域カード（＝たび）
  └ ○○をめぐる         ← 既存のまま
       └ 探索画面 → 🗺 ちず（地域地図）  ← 既存のまま
```

- **「せかい」ボタンの置き場所**: たび画面の「○○をめぐる」と地域カードのあいだ。**ホームの 3×3 は増やさない**（不変条件）
- **役割分担**: 世界地図 = 「どの地域を知っているか・どこがつながっているか」。地域地図 = 「その地域の中で何を歩いたか」。**世界地図に spot を出さない**のが両者を混ぜない鍵
- **Fog of War**: 未到達 region は形も名前も出さない。到達済み region だけが島として現れる
- **世界探索率**: 地域ごとの探索率の平均ではなく「知っている region 数 / 知りうる region 数」。**秘密を逆算させない**という地域地図と同じ原則を適用（特別 2 地域を分母から外す）
- **landmark 反映**: tier1（13 地域で 18 個）だけを世界地図の星に。tier2/3 は地域地図のまま
- **region 間接続**: 実際に境界を越えたときだけ線を引く（§17）

### J-5. 世界地図の発見仕様が現在の保存に載るか（§17）

| 方針 | いまの保存で足りるか |
|---|---|
| 初期はおうち周辺だけ | ✅ `lifetime.regionsVisited` が最初 `['home']` |
| 地域へ初到達すると region が出る | ✅ **`regionsVisited` / `specialRegionsVisited` がそのまま使える**（`travelToRegion` が push 済み、はじめからでも消えない） |
| region 間接続路を通ると線がつながる | ❌ **新規が必要**。`lifetime.meguru.links = { 'forest|mountain': 1 }` のような id だけの集合で足りる（座標は保存しない） |
| tier1 landmark を世界地図に反映 | ✅ `lifetime.meguru.marks[regionId]` に `lm:` 接頭辞で既に入っている |
| secret は世界地図に出さない | ✅ そもそも世界地図に spot を出さないので自動的に満たす |
| 冒険記録として育つ | ✅ すべて id だけの集合なので、増え方は世界の大きさで止まる |

→ **世界地図は「region 到達」までなら新規セーブ 0 で実装できる。** 増えるのは接続線の集合 1 つだけ。

---

## K. 既存セーブの危険箇所

| キー | 場所 | 危険 |
|---|---|---|
| `state.regionId` | ルート | **めぐるの region 切替トリガ**。フレームループが毎フレーム比較している。ここの意味を変えると探索が暴走する |
| `lifetime.regionsVisited` | 通常 11 地域 | **「せかいいっしゅう」実績の分母**。special を混ぜると条件が変わる |
| `lifetime.specialRegionsVisited` | 特別 2 地域 | 上と**必ず別配列**のまま |
| `lifetime.meguru.spots[regionId]` | 発見 spot の id 配列 | region キーで引く。region id を変えると全消失に見える |
| `lifetime.meguru.zones/paths/marks[regionId]` | 地図の記録 | 同上。`seedMapRecords()` が旧セーブから安全に再構築する経路がある |
| `lifetime.meguru.met/talks[key]` | 住民 key で引く | 住民 key の形を変えると「であった」が全消失 |
| `lifetime.currentLocation` / `currentLocationSelected` | げんざいち | `regionId === 'home'` 前提。統合で home の扱いを変えると壊れる |
| `partner.firstRegion` | こいびとの住処 | **統合後も canonical home として使える**。消してはいけない |
| companion の日替わり region | **保存されていない**（`hash(id + 日付)` から毎回計算） | プール（NORMAL_REGIONS 11）を変えると**過去と違う場所に出る**。ただし保存がないので破壊はしない |
| ナオトの配置 | **保存されていない**（`memory_lake` / `deep` 固定） | 固定値を変えるとナオトが行方不明になる |
| プレイヤーの座標 | **保存されていない**（毎回 `world.entry` から） | **統合で「続きから同じ場所」にしたいなら新規保存が要る** |
| `schemaVersion` | ルート | 移行テストが見ている。新規キー追加時は既存の移行方針に合わせる |

---

## L. 推奨する世界統合アーキテクチャ ← **今回の最重要判断**

### 「いま全地域の world 座標を 1 つの巨大座標系へ移す必要があるか」→ **ない**

| 案 | 内容 | 既存実装 | セーブ互換 | Three.js | シームレス化 | 判定 |
|---|---|---|---|---|---|---|
| **A** | region-local のまま。世界地図だけが global な配置を持つ | **変更ゼロ** | **完全** | 影響なし | **できない** | 世界地図だけなら最適 |
| **B** | `regionOrigin` を持ち、`global = regionOrigin + local` | **`WORLDS` に origin を足すだけ**。既存の x/z は不変 | **完全**（保存は id だけ） | ✅ 変換 1 回 | **できる**（境界で原点を差し替え） | **推奨** |
| **C** | 全地域を 1 つの global world へ再配置 | `WORLDS` の全 spot 座標を書き換え。地図・collision・住民配置・テスト全部に波及 | **危険**（発見 spot は id なので生き残るが、地形の意味が変わる） | ✅ | できる | 得るものに対して代償が大きすぎる |

### 推奨: **B（`regionOrigin` 方式）を、必要になった時点で入れる**

理由:

1. **既存の x/z を 1 つも動かさなくてよい。** `WORLDS[id].origin = {x, z, layer}` を足すだけで、`buildWorld` の中身・`collision`・`spot` の id・地図・住民配置・652 本の道はすべて無傷
2. **セーブは id しか持っていない**（`spots` / `zones` / `paths` / `marks` はすべて id の配列）ので、原点を足しても既存セーブは 1 バイトも壊れない
3. **`clampToWorld` が唯一の境界**なので、「境界 zone に入ったら隣 region の origin へ載せ替える」だけでシームレス化の入口が作れる。**消すべき collider は存在しない**（E 節）
4. Three.js は `worldLayers()` + origin のオフセットを 1 回かけるだけで巨大世界として描ける
5. star_stop / memory_lake には **origin を与えない**（`layer: 'sky'` / `'memory'`）ことで、特殊 2 地域を地理から外せる（J-2）

**今回は B も入れない。** まず世界地図（案 A の範囲）だけで「13 地域が 1 つの世界」という体験が成立するかを確かめ、シームレス化を本当にやる段になって B を入れるのが安全。

---

## M. 13 地域の地理接続候補（**候補と理由のみ。確定しない**）

### M-1. 地上層のつながりやすい候補

| 接続 | 理由（コード上の根拠を含む） |
|---|---|
| **おうち ↔ いなか** | home の `lane`/`far` zone が田舎道。HABITAT で dog/cat/man/woman が home/countryside/city を共有 |
| **おうち ↔ とかい** | 同上。home の `alley`（いえのうらみち）が街へ続く雰囲気 |
| **いなか ↔ とかい** | countryside に `となりの集落`、city に `住宅街` がある |
| **いなか ↔ もり** | countryside の `鎮守の森`、forest の `明るい森`。生態も連続 |
| **もり ↔ やま** | forest の `石の森`/`滝の谷` と mountain の `ふもと`。mountain は縦長（len 9000）で登山型 |
| **やま ↔ ゆきぐに** | mountain の `頂上`(peak) と snow の `雪山`(peak)。両方に `peak` landmark がある |
| **やま ↔ かわ・みずうみ** | mountain の `滝道`/`山の湖` と river_lake の `上流`。**水系として自然** |
| **もり ↔ かわ・みずうみ** | forest の `小川`(creek) と river_lake の `川岸` |
| **かわ・みずうみ ↔ うみ** | river が海へ注ぐ。river_lake の下流と sea の `河口/砂浜` |
| **うみ ↔ しんかい** | sea の `海食洞窟`/`はての浜` から潜る。**層が違う**（下に潜る） |
| **いなか／もり ↔ ジャングル** | 緑の連続。ただし気候差が大きい（§N 参照） |
| **ジャングル ↔ さばく** | jungle の `花の谷` の先と desert の `砂山`。気候境界としては王道 |
| **さばく ↔ うみ** | desert の `塩の平地` と sea の `砂丘`。sea は既に `duneridge`/`dunewall` を持っている（砂丘の collider 80 個） |

### M-2. 特殊層

- **ほしぞらのていりゅうじょ**: 地上のどこからも「空」。到達は そだち70 の特別なたび。**地上の隣接を持たせない**
- **きおくのみずうみ**: 地理座標を持たない記憶層。**地上の隣接を持たせない**。ナオトの居場所
- **しんかい**: 地上ではなく `うみ` の直下。地上層の隣接は `うみ` 1 本だけ

### M-3. 提案する地上の形（候補、確定しない）

```
            ゆきぐに
               │
     もり ─── やま ─── かわ・みずうみ
      │        │             │
  いなか ──── おうち         うみ ─── さばく
      │                       │        │
    とかい                  しんかい  ジャングル
                            （直下）
```

区切りの意図: 北に雪山、中央に山と森、南に海、東西に都市と砂漠。おうちが中心で、どこへ行くにも 1〜2 地域。

---

## N. 地理関係で矛盾しやすい点（世界地図を作るときに詰まるところ）

1. **うみ ↔ しんかい**: 水平方向の隣接では不自然。**層（深さ）で分けないと、地図上で「海の隣に深海がある」ことになる**。sea の `terrain.kind = 'coast'`、deepsea は `'chasm'` と既に別物
2. **やま → かわ → うみ の水系**: mountain（len 9000、縦長の登山型）の頂上と river_lake の上流を接続すると、**川が山頂から出る**ことになる。river_lake 側の `上流` を mountain の `ふもと〜滝道` に繋ぐほうが自然
3. **さばく ↔ ジャングル**: 気候が正反対。現実でも隣接はするが、**中間帯なしで隣接させると急激に見える**。`さばくの `塩の平地`` と `ジャングルの `花の谷`` のように、両端の zone を緩衝に使う設計が要る
4. **とかい ↔ いなか の距離**: 徒歩で行き来できる距離にすると「都会」の孤立感が消える。city は面積 30.4 Mu² と広いので、**city の `住宅街`→`高台` が郊外に向かう向き**を使うと落ち着く
5. **ゆきぐにの位置**: 現実的には高緯度か高標高。`やま ↔ ゆきぐに` は標高で説明できるが、**ゆきぐには広大な雪原型（面積 38 Mu²）なので「山の上」だけでは説明しきれない**。山を越えた先の盆地、という扱いが要る
6. **特殊 2 地域の入口**: star_stop は「空」、memory_lake は「記憶」。**地上の隣に置くと特別さが消える**。地図上でも別レイヤーか、余白に浮かせるべき
7. **sea の非対称な minX**: sea は `minX = −705`（海岸線が左を食う）、memory_lake は `maxX = 727`。**地図上に並べるとき、地域の見かけの幅が `halfW × 2` ではない**ことに注意
8. **home の小ささ**: 6.9 Mu²（desert の 1/9）。世界地図で実面積どおりに描くと**中心のおうちが点になる**。地図上の大きさは実面積と切り離す必要がある

---

## O. 絶対に壊してはいけないもの（不変条件）

1. **ホームの 3×3 ボタンを増やさない**
2. **既存の「たび」**（地域カード → `travelToRegion`）を残す
3. **`travelToRegion()` の副作用**（D 節の 1〜12、とくに ③ げんざいち解除の早期 return、⑥ 通常/special の**別配列**、⑦ `state.regionId` 代入、⑨ 消費、⑩ 成長/減少/たびづかれ）
4. **13 地域の内部品質**（#292 の造形・#291 の環境アニメ・遠景フォグ・遮蔽 fade・カメラ演出）
5. **118 zone / 469 spot / 652 path / 107 秘密（秘密 spot 50 + 秘密 path 57）**
6. **地域地図と 4 重の Fog of War**（両端発見の path・発見済み spot からの bounds 再計算・secret を hint の隣接から除外・landmark の tier 解禁）
7. **探索率が残りの秘密数を逆算させない計算式**
8. **住民の一意性**（住民台帳 1 体 = 世界に 1 個体、`byKey` の dedupe、`withPlayer` 優先）
9. **通常種族の生息地**（`HABITAT`）— 生態に合う地域に定住
10. **なかまの日替わり旅人**（`hash(id + 日付) % NORMAL_REGIONS`、`preferredRegions` 4 倍）
11. **同行中キャラの二重出現防止**（`withPlayer` を world から外し party に出す、`auditRegistry` の `follower-duplicate`）
12. **ナオトの特別扱い**（`memory_lake` / `deep` / `fixed` / behavior `watch` / 動かない）
13. **collision の world 座標正本**（COLLIDER 表・shape/hw/hd/ang・role 3 種・道を塞がない `clearCorridor`・共通ソルバー）
14. **住民生活 AI**（behavior/activity/emotion の 3 分離、予約制 interaction、3 層更新、静かな地域が静かなまま）
15. **emotion が表情正本の部分集合であること**（お世話状態を住民から出さない）
16. **既存セーブ互換**（K 節の全キー）
17. **Three.js へ移行できる 2 層構造**（simulation と renderer の分離、`worldLayers()` / `view().lifeOf()`）
18. **`auditSceneryFauna` 0 件 / `auditSceneryCharacters.issues` 0 件 / `auditRegistry().issues` 0 件**（景色に生きものを混ぜない、住民台帳に矛盾がない）— 今回実測で確認

---

## P. 実装するなら段階分け（**今回は実行しない**）

| Phase | 内容 | 既存への影響 | セーブ増加 |
|---|---|---|---|
| **0** | 現状仕様の固定。この監査を正本化し、**不変条件（O 節）を検査するテスト**を追加（13 地域の諸元・107 秘密・住民一意性・travelToRegion の副作用） | なし | なし |
| **1** | **世界地図だけ導入**。`regionsVisited` / `specialRegionsVisited` / `marks[].lm:` から「到達した region と tier1 landmark」を描く。region-local 世界は**一切変更しない**（座標案 A の範囲） | なし | なし |
| **2** | **接続データだけ追加**。`WORLDS[id].origin = {x, z, layer}` と `REGION_LINKS`（候補は M 節）。世界地図が実際の配置で描かれるようになる。歩行には影響しない（座標案 B の導入） | `WORLDS` に定数追加のみ | 接続線の id 集合 1 つ |
| **3** | **境界から隣地域へ遷移**。`clampToWorld` の境界 zone だけ「隣地域の入口へ引き渡す」に差し替え。`travelToRegion` の副作用は**初回だけ**通し、再訪はファストトラベル扱い（§20） | `clampToWorld` と `enterRegion` | プレイヤーの region 内座標（続きから同じ場所） |
| **4** | **住民の地域間移動**。旅人が境界を歩いて越える。single-instance を world 側でも保証 | 生活 AI に region 間の目的地 | 旅人の current region |
| **5** | **Three.js でシームレス描画**。origin オフセットを載せた `worldLayers()` を chunk streaming で読む | レンダラー総入れ替え | なし |

**Phase 1 と 2 はセーブをほぼ増やさず、既存の歩行体験に 1 ミリも触らない。** ここまでで「13 地域が 1 つの世界」という体験の大半は得られる。Phase 3 以降が本当に必要かは、Phase 2 を触ってから判断するのが安全。

---

## Q. §20「たび」の将来的な再解釈（分析のみ）

**「たび」を消す前提にはしない。** 意味を次のように広げられる:

- **初回**: 地域境界を自力で越えて発見 → `travelToRegion` の**初訪問側の副作用**（`visitedList.push`・`pushLifeLog`・`applyGrowth(初訪問)`）を**必ず通す**
- **再訪**: 既存の「たび」で発見済み地域へファストトラベル → 現在の `travelToRegion` を**そのまま**使う

維持すべき副作用の線引き:

| 副作用 | 徒歩で越えたとき |
|---|---|
| `state.regionId` 更新 | **必ず通す**（めぐるの切替トリガ） |
| `visitedList.push` + `pushLifeLog` | **必ず通す**（実績と人生ログ） |
| `applyGrowth` / `applyDecline` | **通す**（初訪問の意味が消える） |
| `energy −6` / `hunger −4` | **通さない**（歩いて行ったのに「たび」の消費は二重取り） |
| `travelStreak += 1` / たびづかれ | **通さない**（連続ファストトラベルへの罰なので、徒歩には無意味） |
| `speakEvent('travel')` / `checkStoryEvents('travel')` | **通す**（到着の演出） |
| げんざいち解除 | **通す** |

→ `travelToRegion(region, { onFoot: true })` のようなフラグで分岐できる形。**今回は実装しない。**

---

## R. §21 シームレス化の影響範囲（分析のみ、実装なし）

「森の北端を進む → 山へ入る」を実現する場合に触る必要が出るもの:

| 対象 | 影響 |
|---|---|
| 座標系 | `regionOrigin` 方式（案 B）なら local のまま。境界で原点だけ載せ替え |
| camera | `enterRegion` が `yaw = 0` にリセットしている。**シームレス化では進行方向を保つ必要がある** |
| player position | `world.entry` へのリセットをやめ、**隣地域の境界側の座標**へ載せ替える |
| zone | `zoneAt()` は現 world の zones しか見ない。境界付近では隣地域の zone も見る必要 |
| streaming | 現在は実質未使用（H 節）。ここで初めて本当に要る |
| collision | **変更不要**（E 節。境界に collider はない） |
| weather / region effects | `effectiveWeather()` は `state.regionId` で切り替わる。**境界で天気が瞬時に変わる**のをどう見せるか |
| resident loading | 隣地域の住民（ずかん全解放で 248 体、最大 292 体）の一部を先読みする必要。`buildWorld` が region 単位なので分割が要る |
| map discovery | `visitedZones` / `walkedPaths` は region キー。**境界を跨ぐ path は両方の region に属する**ので、キーの決め方が要る |
| travel logs | 徒歩越境のときの副作用の線引き（Q 節） |

**最も重い** のは resident loading と weather の遷移。**最も軽い**のは collision（変更ゼロ）。

---

## S. 監査で見つかった「気づき」

実装は変更していないが、統合前に知っておくべき点:

1. **`worldLayers()` は canvas レンダラーから呼ばれていない。** 呼び出し元は `mapData()` とテストだけ。3D 移行の土台として宣言されているが、実際の描画で 1 度も通っていない
2. **`L.streaming` はどこも使っていない。** 予約データ
3. **`zone.bounds` は秘密 spot 込み。** 地図は自前で再計算して回避しているが、3D 側が素直に使うと秘密の位置が形から漏れる
4. **世界の端は collider ではなく数値クランプ。** 統合にとって有利（消す壁がない）
5. **`role: 'boundary'` は世界の端という意味ではない**（崖・砂丘の景色）。名前が将来の混乱の種になりうる
6. **プレイヤーの座標は保存されていない。** 地域に再入場すると必ず入口から
7. **なかまの日替わり地域は保存されていない**（hash から毎回計算）。プールを変えると過去と違う場所に出る
8. **memory_lake だけ tier1 landmark が 0 個。** 世界地図に星を出す方針だと、記憶の湖だけ星のない地域になる
9. `home` の面積は `desert` の **1/9**。世界地図で実面積どおりに描くと中心が点になる
