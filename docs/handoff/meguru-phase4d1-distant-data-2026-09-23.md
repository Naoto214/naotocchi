# Phase 4D-1 — 遠景の意味データ(DistantFeature)の基盤

日付: 2026-09-23 ／ 対象: `meguru.js` ／ 前提: [Phase 4D 設計監査](../design/meguru-phase4d-distant-world-streaming-renderer-2026-09-23.md)(main `51aa8b4`)

**Phase 4D-1 の完了条件は「corridor から導いた、まだ誰にも使われていない遠景の意味データ」であること。**
描画(Canvas / Three.js)・UI・セーブ・世界地図・`travelToRegion()`・当たり判定・住民は **1 行も変えていません**。
既存の遠景(`abyss` / `neonskyline` / パララックス / 手続きシルエット)にも触っていません。

---

## 0. やったこと / やっていないこと

| | |
|---|---|
| **足したもの** | `DISTANT_KIND_OF` ／ `DISTANT_RULES` ／ `distantFeatures(regionId)` ／ `distantRegistry()` ／ `visibleDistant(regionId, env, rec, opts)` ／ `distantInView(list, yawDeg, fovDeg, max)` |
| **変えたファイル** | `meguru.js`(Phase 4C ブロックのすぐ後に追加のみ)／ `tests/meguru-phase4d1-test.cjs`(新規 14 本)／ `tests/meguru-phase4b-test.cjs` と `tests/meguru-phase4c-test.cjs`(「消しても変わらない」テストが 4D-1 の export も一緒に消すように 1 か所ずつ)／ `package.json`(テスト登録)／ `index.html`(`npm run bump`) |
| **やっていない** | 遠景の描画 ／ `view` への追加 ／ Three.js ／ continuous walk ／ global collision ／ resident の地域間移動 ／ save・世界地図・UI の変更 ／ 既存 backdrop の `performance.now()` 直読みの修正(4D-2 で行う) |

---

## 1. DistantFeature の構造

```js
DistantFeature = {                      // すべて freeze。px・色・画面座標は持たない
  id,               // 'home>forest'(となり)/ 'home>>mountain'(2 手先)
  sourceRegion,     // 見る側
  targetRegion,     // 見られる側(graph の node。memory_lake は入らない)
  viaConnection,    // 最初に通る connection id(worldCorridors() に実在)
  via,              // 通る connection id の列
  kind,             // mountain / snow_mountain / forest / highland / city_glow / sea_horizon / desert_haze / island / sky_light / deep_dark / land_below
  bearingLocal,     // 見る側の local 方位(度、0 = local +Z)。たては null
  bearingGlobal,    // 同じ向きの global 方位(= corridorDirection(viaConnection, source).heading)
  anchor,           // mid だけ: { spot: 出口 spot の id, out: local の出る向き(単位ベクトル)}
  distanceClass,    // 'mid' | 'far' | 'vertical'
  elevationClass,   // 'low' | 'tall' | 'above' | 'below'
  silhouette,       // 行き先の WORLDS[id].backdrop(peaks / snowpeaks / treeline …)。island / sky_light / deep_dark / land_below はそのまま
  visibilityRule,   // { from, requiresLink, time, hide, fade }(§4)
  priority,         // mid 200+ / vertical 150+ / far 100+ と、種類ごとの weight の和
  lod,              // { layer: distanceClass, maxTier }(描くときの性能 tier の上限)
}
```

### 正本の順(上ほど強い。DistantFeature は一番下の派生)

1. `WORLD_GEOGRAPHY`(connection・`regions[].isle` / `layer`)
2. corridor / global graph(出口の向き・いちばん安いルート)— Phase 4C
3. 地域の意味データ(`WORLDS[id].backdrop` = 遠くからの見え方の種類)
4. 環境のルール(`DISTANT_RULES`: 種類ごと。時間・天気・季節)
5. **DistantFeature**(ここで導く)

**1 つずつ手で書いた遠景はありません。** 例外表もありません。「しま・ほしぞら・しんかいは見つけるまで見せない」は、
`WORLD_GEOGRAPHY` の `isle` / `layer` から「特別な行き先」を判定して自動で付けています。

### 導出ルール

| 種類 | 作りかた |
|---|---|
| **mid** | walk corridor 1 本 = 1 つ。方角 = その出口を出る向き。`anchor` あり |
| **far(2 手先)** | 歩きだけで 2 手先、かつ `DISTANT_RULES[kind].tall`(mountain / snow_mountain / city_glow / desert_haze)。行き先ごとに `findRegionRoute(…, { special: false })` のいちばん安いルートの **最初の出口の向き** |
| **far(海のむこう)** | sea corridor。行き先が `isle`(jungle)なら `island`、そうでなければ行き先の見え方(jungle から見た sea は `sea_horizon`) |
| **vertical** | vertical corridor。上へ = `sky_light`、下へ: 空の layer から = `land_below`、それ以外 = `deep_dark` |

### 重複をなくすルール

1. **同じ行き先は 1 つ**: 行き先ごとに、いちばん安いルート(`findRegionRoute` の結果。同点はダイクストラの順で決定的)の 1 本だけ
2. **同じ出口の向きに far は 1 枚**: 1 本の出口の先に far 候補が複数あるときは、`weight` のいちばん大きいものだけ(forest の 45° は snow_mountain を残し desert_haze を落とす、river_lake の 0° も同じ)
3. **となりの地域は far にしない**(mid で出ている)

→ 設計監査の **39 → 37**(ルール 2 で 2 つ減)。

---

## 2. 37 個の内訳(最新 main から再計算)

| 区分 | 数 |
|---|---:|
| mid | 20 |
| far | 13 |
| vertical | 4 |
| **計** | **37** |

| kind | 数 | kind | 数 |
|---|---:|---|---:|
| mountain | 7 | city_glow | 5 |
| highland | 6 | forest | 3 |
| desert_haze | 5 | sea_horizon | 2 |
| snow_mountain | 4 | sky_light | 2 |
| island | 1 | deep_dark | 1 |
| land_below | 1 | | |

### 12 地域すべて

| region | id | kind | LOD | local 方位 | 経由 | なぜ見える | 条件 | priority |
|---|---|---|---|---:|---|---|---|---:|
| home | `home>forest` | forest | mid (tier≤2) | 315° | home\|forest | となりの出口の先 | うすく: 雨 0.6・雪 0.6 | 214 |
| home | `home>river_lake` | highland | mid (tier≤2) | 45° | home\|river_lake | となりの出口の先 | うすく: 雨 0.5・雪 0.6 | 210 |
| home | `home>>mountain` | mountain | far (tier≤1) | 315° | home\|forest → forest\|mountain | 2 手先の高いもの | 雨で見えない／うすく: くもり 0.7・雪 0.6 | 120 |
| city | `city>sea` | sea_horizon | mid | 135° | city\|sea | となりの出口の先 | うすく: 雨 0.5 | 216 |
| city | `city>desert` | desert_haze | mid | 315° | city\|desert | となりの出口の先 | 雨・雪で見えない／うすく: くもり 0.6 | 212 |
| city | `city>countryside` | highland | mid | 0° | city\|countryside | となりの出口の先 | うすく: 雨 0.5・雪 0.6 | 210 |
| city | `city>>mountain` | mountain | far | 315° | city\|desert → desert\|mountain | 2 手先の高いもの | 雨で見えない／うすく: くもり 0.7・雪 0.6 | 120 |
| countryside | `countryside>city` | city_glow | mid | 315° | city\|countryside | となりの出口の先 | **夕方(0.5)・夜だけ**／うすく: 雨 0.6 | 218 |
| countryside | `countryside>forest` | forest | mid | 0° | countryside\|forest | となりの出口の先 | うすく: 雨 0.6・雪 0.6 | 214 |
| countryside | `countryside>star_stop` | sky_light | vertical (tier≤1) | — | countryside\|star_stop | たてののりもの | **道を見つけてから** | 176 |
| countryside | `countryside>>mountain` | mountain | far | 0° | countryside\|forest → forest\|mountain | 2 手先の高いもの | 雨で見えない／うすく: くもり 0.7・雪 0.6 | 120 |
| countryside | `countryside>>desert` | desert_haze | far | 315° | city\|countryside → city\|desert | 2 手先の高いもの | 雨・雪で見えない／うすく: くもり 0.6 | 112 |
| forest | `forest>mountain` | mountain | mid | 45° | forest\|mountain | となりの出口の先 | 雨で見えない／うすく: くもり 0.7・雪 0.6 | 220 |
| forest | `forest>countryside` | highland | mid | 0° | countryside\|forest | となりの出口の先 | うすく: 雨 0.5・雪 0.6 | 210 |
| forest | `forest>home` | highland | mid | 180° | home\|forest | となりの出口の先 | うすく: 雨 0.5・雪 0.6 | 210 |
| forest | `forest>>snow` | snow_mountain | far | 45° | forest\|mountain → snow\|mountain | 2 手先の高いもの | 雨で見えない／うすく: くもり 0.7・夏 0.8 | 122 |
| forest | `forest>>city` | city_glow | far | 0° | countryside\|forest → city\|countryside | 2 手先の高いもの | **夕方(0.5)・夜だけ**／うすく: 雨 0.6 | 118 |
| mountain | `mountain>snow` | snow_mountain | mid | 0° | snow\|mountain | となりの出口の先 | 雨で見えない／うすく: くもり 0.7・夏 0.8 | 222 |
| mountain | `mountain>forest` | forest | mid | 135° | forest\|mountain | となりの出口の先 | うすく: 雨 0.6・雪 0.6 | 214 |
| mountain | `mountain>desert` | desert_haze | mid | 315° | desert\|mountain | となりの出口の先 | 雨・雪で見えない／うすく: くもり 0.6 | 212 |
| mountain | `mountain>river_lake` | highland | mid | 180° | mountain\|river_lake | となりの出口の先 | うすく: 雨 0.5・雪 0.6 | 210 |
| mountain | `mountain>>city` | city_glow | far | 315° | desert\|mountain → city\|desert | 2 手先の高いもの | **夕方(0.5)・夜だけ**／うすく: 雨 0.6 | 118 |
| snow | `snow>mountain` | mountain | mid | 0° | snow\|mountain | となりの出口の先 | 雨で見えない／うすく: くもり 0.7・雪 0.6 | 220 |
| snow | `snow>>desert` | desert_haze | far | 0° | snow\|mountain → desert\|mountain | 2 手先の高いもの | 雨・雪で見えない／うすく: くもり 0.6 | 112 |
| sea | `sea>city` | city_glow | mid | 135° | city\|sea | となりの出口の先 | **夕方(0.5)・夜だけ**／うすく: 雨 0.6 | 218 |
| sea | `sea>deepsea` | deep_dark | vertical | — | deepsea\|sea | たてののりもの | **道を見つけてから・出口の近くだけ** | 176 |
| sea | `sea>jungle` | island | far | 336° | jungle\|sea | 海のむこう | **道を見つけてから**・朝/昼/夕方(0.7)・雨で見えない | 124 |
| sea | `sea>>desert` | desert_haze | far | 135° | city\|sea → city\|desert | 2 手先の高いもの | 雨・雪で見えない／うすく: くもり 0.6 | 112 |
| river_lake | `river_lake>mountain` | mountain | mid | 0° | mountain\|river_lake | となりの出口の先 | 雨で見えない／うすく: くもり 0.7・雪 0.6 | 220 |
| river_lake | `river_lake>home` | highland | mid | 180° | home\|river_lake | となりの出口の先 | うすく: 雨 0.5・雪 0.6 | 210 |
| river_lake | `river_lake>>snow` | snow_mountain | far | 0° | mountain\|river_lake → snow\|mountain | 2 手先の高いもの | 雨で見えない／うすく: くもり 0.7・夏 0.8 | 122 |
| jungle | `jungle>sea` | sea_horizon | far | 180° | jungle\|sea | 海のむこう(本土) | うすく: 雨 0.5 | 116 |
| desert | `desert>mountain` | mountain | mid | 180° | desert\|mountain | となりの出口の先 | 雨で見えない／うすく: くもり 0.7・雪 0.6 | 220 |
| desert | `desert>city` | city_glow | mid | 135° | city\|desert | となりの出口の先 | **夕方(0.5)・夜だけ**／うすく: 雨 0.6 | 218 |
| desert | `desert>>snow` | snow_mountain | far | 180° | desert\|mountain → snow\|mountain | 2 手先の高いもの | 雨で見えない／うすく: くもり 0.7・夏 0.8 | 122 |
| star_stop | `star_stop>countryside` | land_below | vertical | — | countryside\|star_stop | たてののりもの(下の地上) | いつでも | 176 |
| deepsea | `deepsea>sea` | sky_light | vertical | — | deepsea\|sea | たてののりもの(水面の光) | いつでも | 176 |

(tier の上限は mid = 2、far / vertical = 1。表では地域ごとの最初の行だけに書いています)

---

## 3. 方角

- **正本は corridor の出口の向き**。`bearingGlobal` は `corridorDirection(viaConnection, sourceRegion).heading` と一致(テスト 3)
- `bearingLocal` はそれを `dirToLocal` で見る側の local に戻したもの。歩きの出口は 45° 刻み
- **REGION_FRAME の原点どうしの向きは使っていない**。コードは `dirToLocal` 以外の frame 変換(`toGlobal` `toLocal` `regionFrame` `REGION_FRAME`)を呼ばない(テスト 3)。
  実データでも、原点どうしの向きと 45° 以上ちがうものが多い(= 使っていれば一致するはず)
- 方位ラベル(きた・みなみ など)は作っていない

---

## 4. visibilityRule(見える条件)

`visibleDistant(regionId, env, rec, opts)` → `[{ id, feature, alpha }]`。純関数。

| 引数 | 中身 |
|---|---|
| `env` | `{ time, weather, season }`。`currentEnvironment()` と同じ形。**省略時は昼・晴れ・春**(実時刻ではない) |
| `rec` | `{ links: [見つけた connection id] }`。`worldLinksFrom()` と同じもの(セーブの発見記録から導く。遠景用に何も保存しない) |
| `opts` | `{ nearGates: [いま出口の近くにいる connection id] }`(`from: 'nearGate'` の種類だけが使う) |

| ルール | 中身 |
|---|---|
| `requiresLink` | 行き先が **特別な行き先**(`isle` または layer が ground 以外)のとき、その道を見つけるまで出さない。**sea>jungle / countryside>star_stop / sea>deepsea の 3 つ**。逆向き(島から本土、空から地上、しんかいから水面)は条件なし |
| `from` | `'anywhere'`(既定)か `'nearGate'`(deep_dark だけ) |
| `time` | その時間帯だけ見える(値 = 濃さ)。**city_glow は夕方 0.5・夜 1**、island は朝・昼・夕方 0.7 |
| `hide.weather` | その天気で見えない(山・雪山は雨、メサは雨と雪、島は雨) |
| `fade` | 天気・季節・時間で薄くなる(濃さの掛け算) |

**決定性**: `Date` `performance.now` `currentEnvironment` `Math.random` を読まない(テスト 6)。
時計をずらした 2 つのハーネス(`pinDate` あり / なし)で、12 地域 × 64 環境 × 発見 2 通りの結果が 1 文字も変わらないことを確認。

---

## 5. priority と 1 画面の数

- `priority = distanceClass の土台(mid 200 / vertical 150 / far 100)+ 種類の weight`。**mid が必ず far より上**
- `distantInView(list, yawDeg, fovDeg, max = 3)` は、視野に入るもの(方位を持つものだけ)を priority の高い順に `max` まで返す
- 実測(55.5° の視野、5° 刻みで一周、全部見つけた状態、昼と夜):
  - **絞らないと最大 4**(forest の夜: mountain・snow_mountain・countryside・夜の街)
  - `max = 3` で絞ると **最大 3**。設計監査の「同時視野 最大 2」は出口の数(mid)の話で、far を足すと 1 つ増える
- 4D-2 では **max = 2〜3** を tier で選ぶ(tier 0 = 3、tier 1 = 2、tier 2 = mid 1)

---

## 6. LOD

| layer | maxTier | 中身 |
|---|---:|---|
| mid | 2 | となりの出口の先(`anchor` で位置の視差あり) |
| far | 1 | 2 手先の高いもの・海のむこう(方角だけ) |
| vertical | 1 | 上の光・下の暗さ・下の地上(方位なし) |

near(今の地域の scenery)は DistantFeature の対象外。

---

## 7. 環境との関係

- `DISTANT_RULES` は **種類ごと**に time / weather / season を持つ(地域ごと・遠景ごとの例外はない)
- 季節は snow_mountain の「夏はうすく(0.8)」で使用
- 4D-2 では sim が今持っている `view.env`(= `currentEnvironment()` 由来)をそのまま渡す

---

## 8. memory_lake

- DistantFeature には **1 つも入らない**(corridor にないので導けない)。`distantFeatures('memory_lake')` も `[]`
- どの地域からも「memory_lake が見える」状態にならない(テスト 1)
- 将来の特別演出は **別の層 `memoryHint()`**(設計監査 §11: 入口条件が成立したときだけ、水辺に方角も形もない霧と灯)。今回は実装しない

---

## 9. performance

- `distantRegistry()` は **はじめて呼ばれたときに 1 回だけ** 12 地域分を組み立てて freeze(`worldCorridors()` と同じ)
- 隣の地域の `buildWorld()` は **呼ばない**(見え方は静的な `WORLDS[id].backdrop` から)。コードに `buildWorld(` がないことをテストで縛る
- `visibleDistant` は 1 地域あたり最大 5 個をなめるだけ。4D-2 でも「env / 発見記録が変わったときだけ」呼ぶ想定
- **今は誰も呼んでいないので、実行時の負荷は 0**

---

## 10. 変わっていないこと(テストで確認)

- **remove-it**: 4D-1 のブロックと export を丸ごと消した `meguru.js` で、spot / path / zone / secret の数・分母・REGION_FRAME・corridor・13 地域の world(backdrop を含む)・gate・4 地域の歩き 300 フレーム・`sim.view()` のキー・世界地図の指紋が 1 文字も変わらない
- 4D-1 の名前は、ブロックと export 行以外(simulation・Canvas renderer・script.js ほか)に出てこない
- `sim.view()` に `distant` はまだない
- 分母: spot 471 / path 654 / zone 118 / secret 107、region 11 / link 12 / tier1 17 / zone 103
- `travelToRegion()` はそのまま動き、セーブに遠景の痕跡はない
- mapX / mapY を使っていない(コード + mapX を書き換えても同じ)

---

## 11. 4D-2 への入力

1. **最初に描く 2 地域: home と sea**
   - **home**: `home>forest`(mid・森・315°)、`home>river_lake`(mid・高原・45°)、`home>>mountain`(far・山・315°)。山と川べり方向の見え方の確認
   - **sea**: `sea>city`(夜の街の光・135°)、`sea>jungle`(島影・336°・見つけてから)、`sea>deepsea`(出口の近くの深み)、`sea>>desert`(far)。水平線・島影・たての確認
2. `sim.view()` に `distant: visibleDistant(regionId, env, rec)` を足すのは 4D-2 から(env / 発見記録が変わったときだけ再計算)
3. 投影は設計監査 §7 の `x = W/2 + F·tan(rel)`。mid は `anchor`(出口 spot + 出る向き × 約 3000)への方角を毎フレーム計算
4. 1 画面の数は `distantInView(…, max)` で tier ごとに絞る
5. 既存の `abyss` / `neonskyline` の `performance.now()` 直読みは、4D-2 で遠景に手を入れるときに `now` へ揃える(4D-1 では触っていない)
6. 受け入れ基準は設計監査 §16.2(2D 命令 +30 以下、rAF p95 悪化 2ms 以下、layout 不変)
