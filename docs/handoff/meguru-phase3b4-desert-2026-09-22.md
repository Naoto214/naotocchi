# めぐる Phase 3B-4 — さばくを せかいへ つなぐ

2026-09-22 / ブランチ `claude/meguru-phase3b4-desert` / base `0be2f5d`

`city|desert` と `desert|mountain` の 2 本を徒歩 connection として実装し、
**両方の接続が未実装だったため世界ネットワークから孤立していた `desert` を、
通常世界の徒歩ネットワークへ正式に接続した。**

Phase 3B-0 で入れた「1 spot に複数 gate を安全に持てる」基盤の上に gate 定義を足すだけで、
`travelToRegion()` にも region 内部の spot / path / zone / secret にも手を入れていない。
`meguru.js` の差分は **+20 行のみ**。

対象は**この 2 本だけ**。`countryside|river_lake` は保留のまま。
F 分類 scenery 改善・Three.js / regionOrigin / global world にも進んでいない。

---

## 1. 実装した 2 本

### `city|desert` — キャラバンのかいどう（人がつくった長距離交易路）

| 側 | anchor | 種類 | 座標 | 地区 | dir | bearing |
|---|---|---|---|---|---|---|
| city | `stalls`「やたいのならび」 | shop | x−1150 / z2600 (39%) / r180 | market | `far` | x −1 / z +1 |
| desert | `caravan`「キャラバンのテント」 | shelter | x+1100 / z1400 (16%) / r200 | tents | `near` | x +1 / z −1 |

non-region geography（両側 6 段、逆順で対称）:

```
いちばの はずれ → かわいた こうがい → くさの まばらな あれち
→ かぜの つよい みち → すなちの はじまり → すなやまの せかい
```

**都会の隣がいきなり完全な砂漠になる見せ方にはしていない。**郊外 → 乾いた平野・荒地
→ 風の強い道 → 砂地 → 砂丘世界、と段階を踏む。`made: 'people'` のとおり、地形の道ではなく
市場と宿をつなぐ街道として書いた。

### `desert|mountain` — うかげのとうげ（雨陰の峠）

| 側 | anchor | 種類 | 座標 | 地区 | dir | bearing |
|---|---|---|---|---|---|---|
| desert | `gate`「さばくのいりぐち」 | plaza | x0 / z250 (3%) / r200 | gate | `near` | x 0 / z −1 |
| mountain | `windnotch`「かぜのきれめ」 | edge | x−300 / z5550 (62%) / r160 | upper | `far` | x −1 / z +1 |

non-region geography:

```
かぜの きれめ → かわいた こうげん → いわやまの かげ
→ あかい されきち → すなの まじる ざれば → すなやまの ふち
```

Phase 3A が `windnotch` を desert 用に空けていたとおりに採用した。
正本 `from`「『かぜのきれめ』を**にしへ**ぬけると くさが きえる」に合わせ、bearing は西向き。

**どちらも徒歩。**新しい電車・バス・砂上車・そりは 1 つも追加していない。

---

## 2. 干渉実測（項目 7 / 10）

座標差だけで判断せず、**3 region の全非秘密 spot × 8 方向 × 横 5 か所 = 4560 回**歩いて、
実際に開いた出口ごとに行き先を数えた。

| region | 試行 | 行き先 | 出口 spot ごと |
|---|---|---|---|
| city | 1720 | none 1652 / desert 26 / countryside 31 / sea 11 | `stalls`→desert のみ / `cross4`→countryside のみ / `boatpier`→sea のみ |
| desert | 1440 | none 1389 / mountain 30 / city 21 | `gate`→mountain のみ / `caravan`→city のみ |
| mountain | 1400 | none 1294 / river_lake 32 / forest 25 / desert 19 / snow 30 | `foot`→river_lake / `lookout1`→forest / `windnotch`→desert / `summit`→snow |

- **混線した出口 spot = 0**（1 つの spot から 2 つ以上の region へ出ることは一度もない）
- **決められた出口以外から出た回数 = 0**
- **mountain の役割分散は Phase 3B-1 / 3B-2 のまま維持**（foot=かわ / lookout1=もり /
  summit=ゆきぐに / windnotch=さばく）。`windnotch` を採用しても他 3 つを塞いでいない。

半径の重なりも 0:

| anchor | いちばん近い spot | 距離 | 半径すきま |
|---|---|---|---|
| city.stalls | alley | 541 | +211 |
| desert.caravan | tentwell | 808 | +448 |
| desert.gate | well | 650 | +170 |
| mountain.windnotch | ridge | 711 | +331 |

### desert の 2 つの入口が団子にならないこと（項目 9）

`gate`(x0 / z250 / 地区 gate) と `caravan`(x+1100 / z1400 / 地区 tents) は **1591 離れ、
地区も別**。やま側の入口は region の front、まち側の入口は東に寄った深部と、自然に分かれている。

### のりもの（項目 12）

city / desert / mountain の 3 region とも `kind !== 'walk'` の gate は **0**。
`のる` / `もぐる` ボタンは 1 つも増えていない。

---

## 3. 数の変化

| | 前 | 後 |
|---|---|---|
| connection | 15 | **15**（変化なし） |
| gate 実装済み | 11 | **13** |
| gate 未実装 | 3 | **1**（`countryside|river_lake` のみ） |
| gate 端点 | 22 | **26** |
| link 分母 | 13 | **13**（変化なし） |
| region / tier1 / zone 分母 | 11 / 17 / 103 | **変化なし** |
| spot / path / zone / secret | 471 / 654 / 118 / 107 | **変化なし** |

**徒歩で行けるかたまり:**

```
前: {city, countryside, deepsea*, forest, home, jungle*, mountain,
     river_lake, sea, snow, star_stop*} / {desert} / {memory_lake}
後: {city, countryside, desert, forest, home, mountain, river_lake, sea, snow}  ← 9 地域
```

**desert の孤立が解消された。**のりものも含めると `memory_lake` 以外の 12 地域が
ひとつの世界になる（memory_lake は `b: null` / `hidden: true` で地上の座標を持たないため別）。

**輪になっている:**

```
city → desert → mountain → forest → countryside → city
```

`city|desert` を使わずに mountain から city へ戻れるので、行き止まりの枝ではなく輪として読める。

### 世界地図（項目 14）

100% 時の link は **13 本**（増やしていない）。desert の位置は北西のまま動かしていない
（`mapX -3.2 / mapY 1.4`、`meguru.js` の差分に `mapX` / `mapY` は 1 行もない）。
未発見時の漏洩もなし — おうち + もりだけ知っている状態の `worldMapData()` に
`desert` の文字列は 1 度も出てこない。片側だけ見つけても線は出ない。

---

## 4. ジャングルとはつなげていない（項目 6）

`desert|jungle` は正本から削除済みで、**復活させていない**。
desert の隣は `city|desert` と `desert|mountain` の 2 本だけ。
北西の砂の世界と南西外洋のジャングル島は別方向の外縁地域のまま。

---

## 5. transition（項目 11）

既存 Phase 2.1 をそのまま再利用。4 経路とも `way: 'walk'` /
`approach → cross → arrive → settle`。**新しいエンジンは作っていない。**

---

## 6. テスト

`tests/meguru-phase3b4-test.cjs` を新設（**20 本すべて pass**）。

| # | 見るもの |
|---|---|
| 1–2 | 2 本に gate がついた / connection 15 のまま / **新しい spot は 1 つも作っていない** |
| **3–4** | **desert の 2 入口が団子にならない / まち・やま以外へ出ない**（全 spot × 8 方向実測） |
| **5–6** | **city 3 出口・mountain 4 出口が混線しない**（役割分散の維持） |
| 7–8 | まち ⇄ さばく / さばく ⇄ やま を行って戻れる |
| 9–10 | **さばくの孤立が解けた** / 輪になっている |
| 11–12 | `desert|jungle` を復活させていない / のりものを増やしていない |
| 13–14 | Phase 2.1 をそのまま使う・gate 配列順に依存しない / transition の二重開始なし |
| 15 | non-region terrain 両側 6 段・semantic data として持つ |
| 16 | 決められた出口以外からは出られない |
| 17 | **探索率の分母が 1 つも動いていない**（11 / 13 / 17 / 103・重み・片側だけでは 0 本） |
| 18 | **Fog: まちを知っただけで さばく・やまは漏れない** |
| 19 | anchor は entry から到達可能・**travelToRegion() 不変**・party 追従・resident 重複なし |
| 20 | `countryside|river_lake` には手をつけていない（保留のまま） |

既存テストの期待値も更新した（gate 11 → 13 / 未実装 3 → 1 / 端点 22 → 26 /
mountain の出口 3 → 4 / city の出口 2 → 3 /「あるく 8」→「あるく 10」）。

---

## 7. 実画面（項目 18）

390×844 / 375×667 / 360×640 の 3 サイズ。

**① 静的チェック — city / desert / mountain × 3 サイズ = 9 ケースすべて OK**
JS エラー 0 / 横はみ出し 0px / 余計な `のる`・`もぐる` ボタン 0。

**② 往復 — 3 サイズ × 2 経路 = 6 ケースすべて OK**

```
city→desert→city        stalls[up]→desert    caravan[down]→city     はみ出し 0px / err 0
desert→mountain→desert  gate[down]→mountain  windnotch[down]→desert はみ出し 0px / err 0
```

Phase 3B-2 / 3B-3 と同じくブラインドのパッド操作では深部 anchor に届かないため、
**既存の browser テストと同じ `setPlayer` で出口に立ち、そこから先は本物のパッド入力**で
越えている。新しい経路探索 bot は作っていない。

> パッドの向きはカメラの yaw 次第で、region を越えると変わる。最初 `dir` から
> up/down を決め打ちしたら復路が 6 ケースとも動かなかったので、
> 「何もない所で up を押すと z がどちらへ動くか」をその場で測ってからキーを選ぶようにした。
> 製品側の問題ではなく確認スクリプト側の不備だった。

加えて自動テスト側で

- 19 番の **path グラフ到達性**（city / desert / mountain とも全非秘密 spot が entry から到達可能）
- 4〜8 番の **実機と同じコードパス**（`regionGates()` → `resolveGate()` を実座標と movement vector で叩く）

をカバーしている。

---

## 8. 次に残るもの

**`countryside|river_lake` 1 本だけ**が未実装。今回は指示どおり触っていない。

Phase 3A の監査では「**forest の楕円を 43% 貫通する**」問題が挙がっており、保留の理由はそこにある。
一方で本 Phase の結果、`countryside` は `city` 経由・`forest` 経由の 2 方向で、
`river_lake` は `mountain` 経由・`home` 経由の 2 方向で、すでに世界とつながっている。
**この 1 本がなくても世界の連結性は損なわれない**ので、

- 実装するか（anchor は `countryside.riverbank` ↔ `river_lake.bank` で既存 spot のまま足りる）
- 正式に削除するか（`forest|snow` と同じ扱い）

を、地理の筋と「歩いて回れる距離感」の両面から最後に再判断できる状態になっている。
