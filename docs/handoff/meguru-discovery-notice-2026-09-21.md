# めぐる — 発見したものが分かる通知（2026-09-21）

ブランチ `claude/meguru-discovery-ux-sa9kx1`（最新 main `0eb07f5` から独立）。**main へはマージしていません。**
connection / Phase 3B-3 の実装には一切触れていません（`WORLD_GEOGRAPHY.connections` は 1 行も変更なし）。

---

## 1. 元々「何が」発火していたのか（推測ではなく実コード＋実ブラウザで確認）

めぐる中の発見は `createSimulation().step()` が返す **6 種類のイベント**がすべてです（`meguru.js`）。

| event | 発火条件 | 直す前の見え方 | 探索率 |
|---|---|---|---|
| `spot` (`first`) | `spotAt(player)` が変わり、その id が `discovered` に無い | 帯 `「Xを みつけた」` 1.5 秒 + `pop` | 地域 % の分子 |
| `zone` (`first`) | `moodAt()` の地区が変わり、`visitedZones` に無い | **無言**。ちずボタンが光るだけ | 世界 % の `zones` |
| `mark` (`first`) | `MARK_SIGHT[tier]` 内に入った目印 | **無言**。ちずボタンが光るだけ | 世界 % の `tier1` |
| `path` | 道の上を `t` 0.12〜0.88 まで歩いた | 無言（ちずに線が増える） | 分母に入らない |
| `met` / `nearest` | 住民に `metRadius` / `talkRadius` まで近づいた | 「はなす」ボタンのみ | 無関係 |
| `gate` | 出口 spot で `resolveGate()` が成立 | region transition が始まる | — |

`connection`（世界地図の道）は**イベントではありません**。「両端の入口 spot を両方見つけた」ことを
`worldLinksFrom()` が判定し、**世界地図を開いたときにだけ** `recordWorldLinks()` されていました。

### 実ブラウザでの再現（chromium 390×844・もり・まっさらなセーブ）

パッドを実際になぞって歩き、`sim.step()` の戻り値と DOM を記録した結果：

```
t=474   gate  home|forest          ← 出口に入った（transition 開始）
t=897   spot  bigtree   first ★    ← おおきなき（landmark lmTier1）
t=897   zone  far       first ★    ← おおきなきのまわり
t=897   mark  mk:pond / lm:bigtree / hero:lane  first ★×3
```

**この 5 つが同じ 1 フレームに起きているのに、画面には何も出ませんでした。**
帯が出るのは非 transition 側の分岐だけで、transition 中は `recordSpot()` を黙って呼ぶだけだったためです。
プレイヤーに見えるのは 40ms 後の **ちずボタンの黄色い光だけ** — これが
「歩いていると何かを見つけたような演出が出るが、何を見つけたのか分からない」の正体でした。

### ついでに見つかった 2 つの実害

1. **目印が地図に載らないのにボタンだけ光る。** transition 中の `mark` イベントは
   `newMarks` に積まれず捨てられていました（`sim` 側の `foundMarks` には登録済みなので
   そのセッション中は二度と発火しない）。保存された `marks.home` は `["hero:back"]` だけで、
   `mk:pond` / `lm:bigtree` / `hero:lane` は消えていました。
2. **再訪のたびに光る。** 1 の結果、次に入り直すと同じ目印がまた `first` になり、
   `mapAdded = true` → またちずボタンが光る（記録は増えていないのに）。

---

## 2. 発見対象の分類（実コード上の実態に合わせた）

| 分類 | 実コード上の判定 | 通知 | 強さ | 表示 |
|---|---|---|---|---|
| region | `enterRegionByMove().first` | 既存の帯 `「はじめての X」` | 強 | 2000ms |
| secret | `spot.secret === true` | 専用トースト | 強 | 2400ms |
| landmark | `spot.landmark` が付いている（lmTier 1/2） | 専用トースト | 中強 | 2000ms |
| connection | `worldLinksFrom()` が新しく返した link | 専用トースト | 中 | 1800ms |
| zone | `zone` イベント `first` | トースト | 小 | 1600ms |
| 通常 spot | 上のどれでもない `spot` `first` | 小さいトースト | 小 | 1500ms |
| 目印 (mark) | `mark` イベント `first` | **通知しない**（地図に載るだけ） | — | — |
| resident | `met` / `nearest` | **通知しない**（context の「はなす」だけ） | — | — |

`hub` や `path` は「発見」として扱いません（実コード上も記録だけです）。

---

## 3. 新しい通知ルール

帯（`.mgr-banner`・画面上部 18%）は **region 専用**のまま。
場所の発見は新しいトースト（`.mgr-found`・canvas 下端・ちずボタンの上）に分けました。
**上と下で位置が分かれているので、2 つが重なって読めなくなりません。**

必ず 2 行出します。

```
① なにを みつけたか（なまえ）
② それが どうなったか（ちずに きろくした）
```

| 分類 | 1 行目 | 2 行目 |
|---|---|---|
| 通常 spot | `ひだまりを みつけた` | `ちずに きろくした` |
| landmark | `✨ おおきなきを みつけた！` | `ちずに きろくした` |
| secret | `🔍 ひみつのばしょを みつけた！` | `かくれたいけ・ちずに きろくした` |
| connection | `🧭 やまへのみちを みつけた` | `せかいの ちずに きろくした` |
| zone | `🗺 あかるいもりに きた` | `ちずが すこし ひろがった` |

- **secret は未発見時に名前を先出ししません。** 見つけた瞬間に初めて `sub` に名前が出ます。
- **zone は内部 id（`bright` / `deep`）を出しません。** `Z()` の label（`あかるいもり`）だけです。
- 通常 spot は `mgr-found-spot`（黒い小さいピル）。landmark は金の枠、secret は紫のグラデーション＋
  `mgr-found-strong`（少しだけ大きい）。効果音も通常は `pop`、強いものは `good`。
- **モーダル・OK ボタン・停止は一切ありません。** `pointer-events: none` なので、
  出ている間もパッドをなぞって歩き続けられます（ブラウザで実測：通知中も 40 フレームで 60px 以上前進）。

### 優先順位とキュー

```
region（帯） → secret → landmark → connection → zone → 通常 spot
```

1 フレームに何個発見しても、**画面に出るのは常に 1 つ**です。`queueFound()` が rank 順に並べ、
`stepFound()` が 1 つずつ（間に 180ms の隙間を置いて）出します。溜め込みは 4 件まで（弱いものから捨てる）。

- **帯が出ている間はトーストを出しません**（`stepFound` が `banner` を見ている）。
- **region を越えている間も出しません**（`trans` を見ている）。溜めておいて、越え終わってから出します。
- **はじめての region に着いたときは、その region の spot / zone トーストを捨てます**（§9 の二重表示防止）。
  残すのは connection だけ（世界地図の話なので意味が別）。**記録自体は済んでいるので地図には載っています。**

### 下部ヘルプとの競合（§16）

トーストが出ている間だけ `#mgrHint` に `.mgr-hint-quiet`（opacity 0.38）を付けます。**消しません**
（なぞり方を忘れた人が困る）。終わったら戻します。

> CSS のセレクタが長い理由: `world-scene.css` が後から
> `.world-mode .minigame-overlay :is(…,.mg-hint,…) { opacity: 1 }` を当てるため、
> 短い `.mgr-hint-quiet` では負けて見た目が変わりませんでした。

---

## 4. 再訪時の扱い（§13）

「初回発見だけ」は**既存の仕組みをそのまま使っています**。

- spot … `sim.discovered`（セーブの `meguru.spots[regionId]` から復元）
- zone … `sim.visitedZones`（`meguru.zones[regionId]`）
- mark … `sim.foundMarks`（`meguru.marks[regionId]`）

**セーブの形は 1 バイトも変えていません**（キーは `visits / talkCount / met / talks / spots / zones / paths / marks / world` のまま）。
旧セーブの `seedMapRecords()` による作り直しもそのままです。

加えて、上の「実害 1・2」を直しました。

- transition 中の `mark` も `newMarks` に積むようにした（`flushMarks()` に共通化）
- その結果、目印がちゃんと保存され、**再訪で `first` に戻らなくなった**
  → ちずボタンも「本当に増えたときだけ」光ります

実ブラウザでの再訪（同じ経路をもう一度歩く）: トースト 0 件・ちずボタンの発光 0 回・`first` イベント 0 件。

---

## 5. 地図との連動（§14）

`noteSpotFound()` / `noteZoneFound()` は **記録 → 地図 → 通知** の順です。

```js
if (typeof S.recordSpot === 'function') S.recordSpot(rid, s.id);   // ① セーブ
mapAdded = true;                                                    // ② ちずボタンの光
queueFound({ … sub: 'ちずに きろくした' });                          // ③ 通知
```

テスト `⑤-1` が、通知が出た**その時点**で `sim.mapData().spots` にその id が入っていること、
zone なら `mapData().zones` で `visited: true` になっていることを確かめます。

connection は `recordWorldLinks()` を**その場で**呼んでから通知します（「せかいの ちずに きろくした」が本当になる）。

---

## 6. 探索率への影響 — **なし**

計算式・分母のどちらも 1 文字も触っていません。

- 地域 %: `(見つけた非秘密 + 見つけた秘密) / (非秘密ぜんぶ + 見つけた秘密)` … `computeMapData()` のまま
- 世界 %: `WORLD_PROGRESS_WEIGHT { regions: 0.4, links: 0.25, marks: 0.2, zones: 0.15 }` … そのまま
- 分母: region 11 / link 13 / tier1 17 / zone 103 … `worldCountable()` そのまま

`recordWorldLinks()` を早く呼ぶようになりましたが、**値は変わりません**。
`worldRecord()` はもともと「保存済み ∪ `worldLinksFrom(spots)` の計算結果」を渡しており、
`worldLinksFrom()` の条件（両端の入口 spot を両方見つけている）も変えていないためです。

`travelToRegion()` / `enterRegionByMove()` / context UI（`#mgrTalk` の 1 枠）も無変更です。

---

## 7. 実画面（chromium・reduced motion）

`tests/meguru-discovery-browser.cjs` を `home-layout` の CI に接続しました。
**390×844 / 375×667 / 360×640** の 3 サイズ × 7 場面（通常 spot・landmark・同時発見・secret・
歩行中・context ボタン表示時・再訪時）。スクリーンショットは `test-results/home-layout/` に出ます。

各場面で測っているもの:

- canvas と viewport への**はみ出し 0px**（左右上下）／ページ横スクロール 0px
- ちずボタン・「はなす」・下部ヘルプ・なぞるパッドとの**重なり面積 0**
- 文字が切れていない（title は 2 行まで、sub は省略記号なし）
- 同時に出ているトーストが**常に 1 つ**
- 下部ヘルプの実効 opacity が 0.38（かつ空文字になっていない）
- **JS エラー 0 件**

結果: `PASS chromium-meguru-discovery-iphone-390 / -iphone-375 / -android-360`。

---

## 8. テスト

`tests/meguru-discovery-test.cjs`（19 件・`npm test` に接続）

| | 内容 |
|---|---|
| ①-1〜4 | 通常 spot / landmark / secret / zone の文言と見た目。zone は内部 id を出さない |
| ②-1〜3 | 再訪で出さない・セーブを読み直しても出さない（キーの形も固定）・目印は通知せずボタンも再訪で光らない |
| ③-1〜3 | 同時発見は 1 つずつ・rank 順・はじめての region では spot/zone を重ねない |
| ④-1〜3 | 住民接近は発見にしない（「はなす」だけ）・歩行を止めない・下部ヘルプを弱める |
| ⑤-1〜4 | 通知と地図が一致・transition 中の目印も残る・**探索率の式が不変**・connection の開通条件が不変 |
| ⑥-1〜2 | `travelToRegion()` と context UI が無変更・閉じたら通知も残らない |

既存の めぐる 系テスト（`meguru-test` / `audit` / `map` / `explore-ux` / `transition` / `transition-polish` /
`world-map` / `region-identity` / `collision` / `phase3b0` / `phase3b1` / `phase3b2` / `phase3a-audit` /
`sea-route`）と合わせて **pass 251 / fail 1**。

> 唯一の fail は `meguru-life-test.cjs` の
> 「far-away residents drop to the cheap update…」で、**この変更前の main でも同じく落ちます**（既存の不具合）。
> 発見通知とは無関係なのでこの PR では触っていません。

---

## 9. さわったファイル

| ファイル | 内容 |
|---|---|
| `meguru.js` | 通知キュー（`queueFound` / `showFound` / `stepFound`）・`noteSpotFound` / `noteZoneFound` / `newLinksFor` / `flushMarks`・transition 中のイベント処理・`foundInfo()`（調べもの用） |
| `style.css` | `.mgr-found` 一式と `.mgr-hint-quiet` |
| `index.html` | キャッシュトークンの bump のみ |
| `tests/meguru-discovery-test.cjs` | 新規（19 件） |
| `tests/meguru-discovery-browser.cjs` | 新規（実ブラウザ 3 サイズ） |
| `tests/home-layout-browser.cjs` | 上をランナーに接続 |
| `package.json` | `npm test` に接続 |
