# Phase 4C — corridor と global graph の 基盤

日付: 2026-09-23 ／ 対象: `meguru.js` ／ 前提: [Phase 4B 引き継ぎ](./meguru-phase4b-region-frame-2026-09-22.md)（REGION_FRAME と 変換）

**Phase 4C の 完了条件は「REGION_FRAME から みちびいた、まだ だれにも つかわれて いない データ」で ある こと。**
えがき・あたりはんてい・住民・なかま・カメラ・セーブ・世界地図・`travelToRegion()` は **1 行も 変えて いません**。
UI も 変えて いません（データ ＋ テスト だけ）。

---

## 0. やった こと / やって いない こと

| | |
|---|---|
| **足した もの** | `worldCorridors()` ／ `orientCorridor()` ／ `corridorsFrom()` ／ `corridorDirection()` ／ `corridorGraph()` ／ `findRegionRoute()` ／ `compassLabel()` ／ `CORRIDOR_STAGE_LEN` ／ `CORRIDOR_WAY_FACTOR` |
| **変えた ファイル** | `meguru.js`（Phase 4B ブロックの すぐ あとに 追加のみ）／ `tests/meguru-phase4c-test.cjs`（新規 15 本）／ `tests/meguru-phase4b-test.cjs`（「消しても 変わらない」テストが 4C の export も いっしょに 消す ように 1 か所）／ `package.json`（テスト登録）／ `index.html`（`npm run bump`） |
| **やって いない** | renderer で corridor を えがく ／ continuous walk ／ global collision ／ resident の 地域間 移動 ／ save 変更 ／ world map 変更 ／ Three.js |

---

## 1. corridor とは

```
region A ── corridor ── region B
```

**connection 1 本に つき corridor 1 本。** gate を もつ connection（13 本）が そのまま 13 本の corridor に なる。
corridor は **うつしかえでは なく 生成物**で、はじめて よばれた ときに 1 どだけ 組み立てて とっておく（毎フレーム つくらない）。

1 本の corridor が もつ もの（`worldCorridors()` の 1 こ）:

| key | なかみ |
|---|---|
| `id` `a` `b` | connection の id と 両はし（正本の まま） |
| `kind` | `walk` / `sea` / `vertical`（gate.kind から） |
| `ways` | **むきごとの こえかた** `{ [from]: 'walk' | 'sail' | 'up' | 'down' }`。`regionGates()` と おなじ きめかた |
| `ride` | のりもの（正本の `sea.ride` / `vertical.ride`。walk と もぐる は `null`） |
| `ends[region]` | `spot`（gate の 出口 spot）・`mouth`（はっけんの 入口）・`layer`・`at`（spot の global 座標）・`leave`（gate を 出る むき、global の 単位ベクトル）・`land`（gate の land） |
| `physicalGap` `gapKind` | 両はしの X/Z の はなれ と その いみ（下の §4） |
| `heightDelta` | `b.y − a.y` |
| `stages` `origin` | 段の ならび と、その ならびが はじまる 地域 |
| `travelStages` `travelLength` | 段の かず と、いみの うえの ながさ（`段 × 1600`） |
| `costs` | むきごとの ほねおり（`travelLength × CORRIDOR_WAY_FACTOR[way]`） |
| `bend` | walk だけ。A を 出る むき と B へ 入る むき の さ（下の §5） |

`orientCorridor(cor, from)` で 「from から 見た」 かたちに なる（`from` `to` `fromSpot` `toSpot` `globalFrom` `globalTo` `leave` `enter` `heading` `compass` `vertical` `way` `cost` `stages` `terrain` …）。

---

## 2. 正本の ゆうせんじゅんい

1. **`WORLD_GEOGRAPHY.connections`** — どこと どこが つながるか・のりもの・transition の ことば
2. **gate の いみデータ**（`gate.ends[region]` の 出口 spot・`dir` / `bearing`・`land`）— `regionGates()` が よむ のと おなじ もの
3. **`REGION_FRAME`** — global への おきかた
4. **derived corridor**（これ）

corridor は 1〜3 から みちびく だけ。**手で うつした かずは 1 つも もたない**。
land の ことばも コードに 1 つも かかれて いない（テスト 6 で しばって いる）。
`CORRIDOR_STAGE_LEN` だけが 実測の めやす（§6）。

---

## 3. walk / special

| 種類 | 本数 | corridor |
|---|---:|---|
| **walk** | 10 | `snow|mountain` `forest|mountain` `mountain|river_lake` `desert|mountain` `countryside|forest` `home|forest` `home|river_lake` `city|countryside` `city|sea` `city|desert` |
| **sea**（ふね） | 1 | `jungle|sea`（しまわたりの ふね） |
| **vertical** | 2 | `deepsea|sea`（もぐる。のりもの なし）・`countryside|star_stop`（ほしぞらの ゴンドラ） |
| 入らない | — | `memory_lake` の connection（b が ない・frame が ない） |

### 実値

| corridor | kind | way (a→b / b→a) | physicalGap | heightDelta | 段 | travelLength | cost (a→b / b→a) | 方角 | bend |
|---|---|---|---|---:|---:|---:|---|---|---:|
| `snow|mountain` | walk | walk / walk | 55.2 (closure) | 0 | 6 | 9600 | 9600 / 9600 | snow→ みなみにし 215° ／ mountain→ みなみ 166° | 131° |
| `forest|mountain` | walk | walk / walk | 83.9 (closure) | 0 | 6 | 9600 | 9600 / 9600 | forest→ きたにし 325° ／ mountain→ きたにし 301° | 156° |
| `mountain|river_lake` | walk | walk / walk | 32.6 (closure) | 0 | 6 | 9600 | 9600 / 9600 | mountain→ きた 346° ／ river_lake→ きた 338° | 172° |
| `desert|mountain` | walk | walk / walk | 57.7 (closure) | 0 | 6 | 9600 | 9600 / 9600 | desert→ きた 350° ／ mountain→ みなみひがし 121° | 49° |
| `countryside|forest` | walk | walk / walk | 28.6 (closure) | 0 | 5 | 8000 | 8000 / 8000 | countryside→ にし 282° ／ forest→ にし 280° | 178° |
| `home|forest` | walk | walk / walk | 77.6 (closure) | 0 | 6 | 9600 | 9600 / 9600 | home→ みなみにし 205° ／ forest→ ひがし 100° | 75° |
| `home|river_lake` | walk | walk / walk | 52.3 (closure) | 0 | 6 | 9600 | 9600 / 9600 | home→ きたにし 295° ／ river_lake→ みなみ 158° | 43° |
| `city|countryside` | walk | walk / walk | 34.0 (closure) | 0 | 6 | 9600 | 9600 / 9600 | city→ みなみにし 230° ／ countryside→ みなみにし 237° | 173° |
| `city|sea` | walk | walk / walk | 4.6 (closure) | 0 | 6 | 9600 | 9600 / 9600 | city→ きた 5° ／ sea→ きたひがし 24° | 162° |
| `jungle|sea` | sea | sail / sail | 7998.1 (crossing) | 0 | 6 | 9600 | 25728 / 25728 | jungle→ きたひがし 45° ／ sea→ みなみにし 225° | — |
| `city|desert` | walk | walk / walk | 49.7 (closure) | 0 | 6 | 9600 | 9600 / 9600 | city→ みなみ 185° ／ desert→ きたにし 305° | 60° |
| `deepsea|sea` | vertical | up / down | 3.4 (drift) | +1600 | 6 | 9600 | 22656 / 19200 | deepsea→ うえ ／ sea→ した | — |
| `countryside|star_stop` | vertical | up / down | 5.4 (drift) | +4800 | 6 | 9600 | 22656 / 19200 | countryside→ うえ ／ star_stop→ した | — |

### special の あつかい

- **`jungle|sea`（ふね）**: 外洋を ほんとうに わたる。**gap 約 7998 が 正しい**（closure を もとめない）。
  方角は 両はしを むすんだ むき（うみ から みなみにし。正本の「みなみにしの がいよう」と あう）。
  段は 正本の `sea.stages`（approach / board / depart / sail / arrive / land。move は walk / boat）、うみ が origin。
  けしき（terrain）は gate の land 4 段。
- **`countryside|star_stop`（ゴンドラ）**: **+4800**。よこにも ながれる（drift。しばらない）。
  段は 正本の `vertical.stages`（move は walk / gondola）、いなか が origin。
  はっけんの 入口（`mouths`）は **とりい**、出口（gate の spot）は **のりば（skyland）**。corridor の はしは **gate の spot**。
  mouths と gate の spot が ちがうのは 13 本の うち この 1 本だけ。
- **`deepsea|sea`（もぐる）**: **−1600**（うみ → しんかい）。X/Z の ずれは 3.4 だけ。
  段 object は 正本に ない ので `transition` の ことば 6 つ（はてのはま → おちこみ）。うみ から だと move `dive`、しんかい から だと さかさ で `rise`。

---

## 4. physicalGap と travelLength は べつもの

- **`physicalGap`** = 両はしの spot を global に うつした X/Z の はなれ。
  - walk: **closure の のこり**（4.6〜83.9）。**みちの ながさでは ない**。
  - sea: ほんとうに わたる 外洋（7998）。
  - vertical: のりものの よこずれ（drift）。
- **`travelLength`** = いみの うえの ながさ = `段の かず × CORRIDOR_STAGE_LEN`。
- **`cost`** = `travelLength × CORRIDOR_WAY_FACTOR[way]`（ルートさがし用）。

walk の travelLength（8000〜9600）は gap の 100 ばい いじょう。chart は 1.51 ばい かさなって いるので、
global の X/Z で みちの ながさを はかる ことは できない。

---

## 5. 方角の きめかた

**方角に chart の 中心も、walk の `globalFrom → globalTo` も、`mapX / mapY` も つかわない。**

- **walk**: その gate を **出る むき（leave）** を global に うつした もの。
  gate に `bearing` が あれば それ、なければ 口（`dir: near`）= local −Z、奥（`dir: far`）= local +Z。`dirToGlobal()` で global へ。
  → 「その ばしょで じっさいに あるく むき」なので、その gate の まえで 出す ことばと しては いつも 正しい。
- **sea**: 両はしを むすんだ むき（ほんとうに わたる ので いみが ある）。
- **vertical**: 方位を もたない。`うえ` / `した`。
- ことば: `compassLabel(deg)` → 8 方位（`きた` `きたひがし` `ひがし` `みなみひがし` `みなみ` `みなみにし` `にし` `きたにし`、漢字も もつ）。
  0° = 北、とけいまわり、さかいめは 22.5° ずつ。
- UI から よぶ 入口は `corridorDirection(connectionId, from)` ひとつ。

### わかった こと: corridor は まがって いる（bend）

A を 出る むき と B へ 入る むき（= B の 出口の はんたい）が 一致しない。walk 10 本で **43°〜178°**。
`bend > 150°` の 5 本（`forest|mountain` `mountain|river_lake` `countryside|forest` `city|countryside` `city|sea`）は
**A から 出る むき と B から 出る むき が ほぼ おなじ 方位**（たとえば いなか → もり も もり → いなか も「にし」）。

- REGION_FRAME を「むきも つながる」ように 解きなおす ことも ためした（Phase 4C 調査）:
  むきの ずれの RMS は **70° より 下がらず**、そのとき closure は さいだい **844** まで こわれる。→ 採らない。
- 原因: chart は 1 まいずつ べつに かかれた 地図帳の ページで、gate の むきも ページごとに かかれて いる。
- 方針: leave と enter を べつべつに もち、その さを `bend` と して のこす。
  **「○○は あちら」は その gate を 出る むき（leave）** を つかう（いきと かえりで おなじ 方位に なる ことが ある のは 承知の うえ）。

---

## 6. travelLength の めやす（CORRIDOR_STAGE_LEN = 1600）

land の 1 段（はたけ・ざつぼくりん・かわいた こうげん…）は 地区 1 つ ぶんの けしきの おび、と みる。
**となりあう 地区の 中心どうしの きょりの 中央値 1576**（四分位 1256〜1874、13 地域 165 くみ を 実測）を まるめて 1600。

### こえかたの おもみ（CORRIDOR_WAY_FACTOR）

**TRANSITION の span の 合計を walk と くらべた ひ**。じぶんで かずを 足して いない。

| way | span 合計 | おもみ |
|---|---:|---:|
| walk | 1.25s | 1 |
| up | 2.95s | 2.36 |
| down | 2.50s | 2.00 |
| sail | 3.35s | 2.68 |

→ のぼり（しんかい → うみ、いなか → ほしぞら）は くだりより ほねがおれる。

---

## 7. global graph

- `corridorGraph()` = `{ nodes, edges }`
  - **node = frame を もつ 12 地域**（layer つき: ground 10 / sky `star_stop` / below `deepsea`）
  - **edge = corridor 13 本**（むきごとの `ways` / `costs` つき）
- 12 地域は ひとつながり（おうち から ぜんぶへ とどく）。
- **global 座標 → region の 逆引きは 作らない**（chart が かさなる ので 一意に きまらない）。graph は region id で ひく。
- `findRegionRoute(from, to, opts)` — ダイクストラの 純関数。
  - cost は walk = travelLength、special = travelLength × おもみ（むきごと）
  - `opts.special = false` で あるく みち だけ
  - frame を もたない（きおくのみずうみ）・しらない id・とどかない → `null`
  - **「たび」（`travelToRegion()`）は この graph の そと**

### だいひょうの みち

| from → to | regions | ways | cost | travelLength |
|---|---|---|---:|---:|
| home → jungle | home → forest → countryside → city → sea → jungle | walk ×4, sail | 62528 | 46400 |
| snow → sea | snow → mountain → desert → city → sea（あるきだけ） | walk ×4 | 38400 | 38400 |
| desert → deepsea | desert → city → sea → deepsea | walk ×2, down | 38400 | 28800 |
| home → star_stop | home → forest → countryside → star_stop | walk ×2, up | 40256 | 27200 |
| star_stop → home | star_stop → countryside → forest → home | down, walk ×2 | 36800 | 27200 |

`home → jungle` を あるき だけで さがすと `null`（しまへは ふねで しか いけない）。

---

## 8. きおくのみずうみ

frame を もたない ので corridor にも graph にも 入らない。
`findRegionRoute('home', 'memory_lake')` → `null`、`corridorsFrom('memory_lake')` → `[]`。
正本の connection は けして いない（たびの そとの 特別な ばしょ、の まま）。

---

## 9. セーブ・renderer・ほかへの えいきょう

- **セーブ**: 変えて いない。corridor / global / route の あとかたは セーブに 入らない（テスト 15）。
- **renderer / collision / resident / party / camera / world map / travelToRegion**: 1 行も 変えて いない。
- **消しても 変わらない**（テスト 14）: Phase 4C の ブロックと export を まるごと 消した `meguru.js` で、
  spot / path / zone / secret の かず・分母・13 地域の world・gate・3 地域の あるき（300 フレーム）・世界地図 の 指紋が 1 文字も かわらない。
  Phase 4B の おなじ テストも 4B ＋ 4C を いっしょに 消して とおる。
- 分母 など: spot 471 / path 654 / zone 118 / secret 107、region 11 / link 12 / tier1 17 / zone 103、connection 14 / gate 13 — 変化 なし。

---

## 10. Phase 4D への 申し送り

1. **bend を どう あつかうか が いちばんの 課題。** continuous walk で A の 出口から B の 入口まで ひとつづきに するには、
   corridor を まっすぐな 線では なく **曲線（A.leave で 出て −B.leave で 入る）** に する ひつようが ある。
   bend 178° の `countryside|forest` は U ターンに なる。曲線の ながさは travelLength（8000〜9600）に あわせれば、
   gap（< 84）より ずっと ながい ので U ターンも おさまる。
2. 方角の ことばを UI に 出す なら `corridorDirection()` だけを よぶ こと（ほかで けいさんしない）。
   いきと かえりで おなじ 方位に なる 5 本は、ことばを 出す まえに 見せかたを きめる（出口の まえでだけ 出す、など）。
3. special 3 本は 「のりものの じかん」で つなぐ。ふねの 7998 を あるかせない。ゴンドラ と もぐる は layer を またぐ。
4. graph は region id の グラフ。global 座標から region を さがす しくみは 作らない まま すすめる。
5. corridor は `worldCorridors()` の キャッシュ 1 つ。えがく がわが よむ ときも 毎フレーム つくりなおさない。

---

## 11. 確認

- `tests/meguru-phase4c-test.cjs` 15 本 pass。`tests/meguru-phase4b-test.cjs` 12 本 pass。
- `npm test` **1208 / 1208**（main 1193 ＋ Phase 4C 15）。
  - ただし 2026-09-23 は main でも `economy-test` / `quick-daily-economy-v2-test` が 終わらない（その日の daily ゲーム `domino-run` が 定数 random で ループする。Phase 4C とは 無関係）。
    テストだけの 修正を **べつ PR #328** に した。上の 1208 は #328 の 2 ファイルを 一時的に あてて はかった もの（Phase 4C の ブランチには ふくめて いない）。
- 実画面 390×844 / 375×667 / 360×640 × home / mountain / city / sea: はみ出し 0、パッド・もどる は 画面内、
  レイアウト値は Phase 4B の ときと **12 / 12 一致**。JS エラーは 390×844-home の 1 件（さいしょの 読みこみの 404）だけで、Phase 4B の ときにも 同じ ものが ある。
