# めぐる Phase 3A — 全地域 connection・地理整合性 監査(2026-09-21)

**これは設計・監査文書です。コードは 1 行も変えていません。**
spot / path / zone / secret / connection / gate / `travelToRegion()` はすべて無変更です。

- 監査した HEAD: `337ef1a`(main)。作業ブランチ `claude/meguru-phase3a-audit` は main と同じツリーから切っています
- 正本コード: `meguru.js` の `WORLD_GEOGRAPHY`(`canon: 'v1'` / `version: 2` / `plan: 'D2'`)
- 上位の正本: [`docs/qa/meguru-world-geography-canon-v1-2026-09-20.md`](./meguru-world-geography-canon-v1-2026-09-20.md)
- 数値はすべて実コードから機械的に取り出したものです。手計算・記憶からは書いていません

---

## 1. 現行世界地理の要約

**二つの大きな山地にはさまれた細長い谷。その谷に「おうち」がある。**

| 層 | 地域 | `mapX, mapY` | belt | river |
|---|---|---|---|---|
| ground | `home` おうち | 2.1, 0.4 | valley | beside |
| ground | `river_lake` かわ・みずうみ | 2.55, 2.1 | valley | main |
| ground | `mountain` やま | 0.6, 3.5 | head | source |
| ground | `snow` ゆきぐに | -0.2, 5.0 | beyond | — |
| ground | `forest` もり | 0.4, -1.0 | forestbelt | — |
| ground | `countryside` いなか | -1.3, -2.1 | satoyama | branch |
| ground | `desert` さばく | -3.2, 1.4 | lee | — |
| ground | `city` とかい | -3.6, -3.0 | lowland | city |
| ground | `sea` うみ | -1.2, -6.1 | coast | mouth |
| ground | `jungle` ジャングル | -6.3, -7.8 | isle | — |
| below | `deepsea` しんかい | 1.3, -6.7 | below | — |
| sky | `star_stop` ほしぞら | -1.6, -1.8 | above | — |
| memory | `memory_lake` きおくのみずうみ | （座標を持たない） | memory | — |

- 地域 13 / うち ground 10 / `NORMAL_REGIONS` 11(ground 10 + `deepsea`)
- **なおとっちの世界は日本地図の再現ではありません。**借りているのは地形の記憶だけです
- 水系は 2 つ。**上流でつながりません**
  - 天竜川型 `tenryu`「たにのおおかわ」: やま源流域 → みなもとのみずうみ → 谷 → **おうちのすぐ東** → 峡谷 → 太平洋
  - 庄内川型 `shonai`「みやこがわ」: 分水界の向こう → とかい → 湾
- `memory_lake` は世界地図に出しません。座標・輪郭・connection を一切持ちません。Naoto は `memory_lake` の deep にいます

**今回の監査であらためて確認した構造**: `divide`「ぶんすいかい」の 4 点は `west-range`「にしのやまち」の南端 4 点と**完全に同一座標**です
(`(-1.6,-1.8) (-2,-2.45) (-2.45,-3.15) (-2.85,-3.85)`)。
分水界は独立した尾根ではなく、**西の大山塊がそのまま南へ下りたもの**です。データ上は意図どおりですが、
2 つの feature に同じ点列が重複して書かれているので、3D 化のときに二重に押し出さないよう注意が要ります(→ 11章)。

---

## 2. connection 全件一覧

`WORLD_GEOGRAPHY.connections` は **16 本**。うち `b` を持つ(2 地域を結ぶ)ものが **15 本**、
`memory_lake` だけが `b` を持ちません。**`gate` が実装済みなのは 5 本**、未実装が 10 本です。

#25 が求める 15 列は 1 つの表には収まらないので、**id をキーに 2 枚に分けています**。

### 2-1. 基本情報（id / A / B / 種類 / 距離 / 地図上の位置 / gate / 現状説明文）

| id | region A | region B | 現在の種類 | 距離 | 地図上の位置 | gate | 現状説明文(`why`) |
|---|---|---|---|---|---|---|---|
| `snow\|mountain` | snow | mountain | pass / nature | 1.70 | 北の高所どうし。世界の北端 | **なし** | おなじ山塊のうらおもて。どちらも おくが みね |
| `forest\|snow` | forest | snow | ridge / nature / long | 6.03 | 世界を南北に縦断 | **なし** | 山地のうらをまわる はりばやしの おび |
| `forest\|mountain` | forest | mountain | trail / nature / long | 4.50 | 西の山塊の南半分を北上 | **なし** | もりは山地の南のすそ |
| `mountain\|river_lake` | mountain | river_lake | lake / nature | 2.40 | 谷の頭。尾根から源の湖へ | **なし** | たにのおおかわの みなもとは さんちょうでは なく、たにの あたまの 湖 |
| `desert\|mountain` | desert | mountain | pass / nature / long | 4.34 | 山塊の西(雨陰)側から上部へ | **なし** | 山地のうらがわは あめが こえて こない |
| `countryside\|forest` | countryside | forest | wood / nature | 2.02 | 西の山塊の南、森と里の境 | **walk** | もりのおくの こけむした 石の かいだん |
| `countryside\|river_lake` | countryside | river_lake | river / nature / long | 5.70 | 里から谷の川下端へ | **なし** | 山里の水車と たなだの水は やまから おりる 支流 |
| `home\|forest` | home | forest | wood / people | 2.20 | 段丘の上から西へ | **walk** | おうちの おくの 大きな木は 分かれみち |
| `home\|river_lake` | home | river_lake | terrace / people | 1.76 | 段丘を東へ下りて川へ | **なし** | おうちは たにぞこでは なく 段丘の うえ |
| `city\|countryside` | city | countryside | road / people / long | 2.47 | 分水界をまたぐ | **なし** | 分水界を こえる 人の 道 |
| `city\|sea` | city | sea | port / people | 3.92 | みやこがわ沿いに湾へ | **なし** | みやこがわが 湾に そそぐ ところに まちが ある |
| `jungle\|sea` | jungle | sea | sea / people / long / **special:sea** | 5.38 | 外洋を南西へ渡る | **sea** | ジャングルは 南西の 外洋に うかぶ しま |
| `city\|desert` | city | desert | caravan / people / long | 4.42 | 山塊の西側を南北に走る | **なし** | ちけいでは なく 人が つくった ちょうきょり こうえきろ |
| `deepsea\|sea` | deepsea | sea | dive / nature / **layer:down** | 2.57 | 岬の外、外洋の棚のふち | **vertical** | 湾では なく、岬の そとの 外洋 |
| `countryside\|star_stop` | countryside | star_stop | sky / nature / **layer:up / special:vertical** | 0.42 | いなかの真上の山上層 | **vertical** | 山里のおくの 古い鳥居から 山へ 入り、山道の さきの のりばから 上空層へ |
| `memory_lake` | memory_lake | — | memory / nature / **hidden** | — | **地図に出さない** | なし | 地上の ざひょうを もたない |

### 2-2. 評価（id / 地理的に自然か / 推奨分類 / 移動方式 / non-region terrain / 実装優先度 / 問題点 / 提案）

| id | 地理的に自然か | 推奨分類 | 移動方式 | non-region terrain | 優先度 | 問題点 | 提案 |
|---|---|---|---|---|---|---|---|
| `snow\|mountain` | ◎ | **A / E** | 徒歩 | `west-range` 北端の尾根・万年雪 | **3B-2** | 両側とも region の最奥。往復が長い | 既存 mouth のまま gate 化 |
| `forest\|snow` | ✕ | **B(削除候補)** | — | `west-range` 全長 | 保留 | **mountain を 37% 貫通**。最長 6.03。説明文は「山地のうらをまわる」なのに地図では山地の上を通る | `forest\|mountain` + `snow\|mountain`(4.50+1.70)で同じ所へ行ける。**削除を提案** |
| `forest\|mountain` | ◎ | **A / E** | 徒歩 | `west-range` 南半分の尾根 | **3B-2** | 距離 4.50 は平均超。mountain 側 mouth が 9% と浅い | mountain 側 anchor を `trailhead` に確定（`foot` は別 connection と衝突） |
| `mountain\|river_lake` | ◎ | **A / E** | 徒歩 | `west-range` 東斜面・`source-lake`・`tenryu` 源流域 | **3B-1** | なし | **最優先。正本 #8 の川筋がこれで歩ける** |
| `desert\|mountain` | ○ | **A / E** | 徒歩 | `west-range` 西(雨陰)斜面・レキ・メサ | **3B-4** | 直線は `west-range` の点列と交差しない — ただし交差は **mountain の楕円の内側**で起きており、`windnotch`「かぜのきれめ」がその峠そのもの。矛盾ではない | 現状維持。gate 化のとき `windnotch` をそのまま使う |
| `countryside\|forest` | ◎ | **A(実装済み)** | 徒歩 | 屋敷林・雑木林・鎮守の森 | 完 | なし | 変更なし |
| `countryside\|river_lake` | △ | **F(保留)** | 徒歩 | （feature をひとつも横切らない） | 保留 | **forest を 43%、home を 7% 貫通**。長さ 5.70 は 2 番目。「支流が おおかわに 合流する」という説明なのに、地図上では大川(`tenryu`)にも触れていない | C(差し替え)は**成立しない**(`home\|countryside` 直結は正本 #14 が禁止)。**保留**し、削除した場合の分母だけ 9 章に記録 |
| `home\|forest` | ◎ | **A(実装済み)** | 徒歩 | はたけ・かじゅえん・ざつぼくりん | 完 | なし | 変更なし |
| `home\|river_lake` | ◎ | **A / E** | 徒歩 | 河岸段丘のふち・かわらの石原 | **3B-1** | **`home.bigtree` は `home\|forest` の gate spot と同じ**。現エンジンは 1 spot に 1 gate しか拾えない(→ 4 章) | **最優先。ただしエンジン側の「1 spot 複数 gate」対応が前提** |
| `city\|countryside` | ○ | **A / E** | 徒歩 | `divide` = `west-range` 南端の峠、反対側の谷、山間部のやど | **3B-3** | 分水界を越える大峠なのに図上距離 2.47(long 群で 2 番目に短い)・楕円のすきま 0.39 しかない | 距離は動かさない。**transition の 6 段階が長さを担保している**ことを正本に明記。将来 city を西へ寄せる案は 11 章へ |
| `city\|sea` | ◎ | **A / E** | 徒歩 | `shonai`「みやこがわ」下流・運河・岸壁 | **3B-3** | `long: false` の徒歩 6 本の中ですきま 1.77 が最大（次が 0.43）| 実装時に `long: true` を提案(図上で弧になるだけ。距離も意味も変わらない) |
| `jungle\|sea` | ◎ | **A / D(実装済み)** | **ふね** | `coast`・南西の外洋・`jungle-isle` | 完 | なし。次数 1 は**島なので自然**(正本どおり) | 変更なし。次数を増やすためだけの connection は追加しない |
| `city\|desert` | ○ | **A / E** | 徒歩 | 山塊の西の礫原・石だらけの平地・街道のやど | **3B-4** | region も feature も 1 つも横切らない。**山塊の西側だけを通る**ので地理的には正しい | 現状維持。`made: 'people'` の交易路として実装 |
| `deepsea\|sea` | ◎ | **A / D(実装済み)** | **もぐる** | 浅瀬・藻場・棚のふち | 完 | 次数 1 だが垂直層なので自然 | 変更なし |
| `countryside\|star_stop` | ◎ | **A / D(実装済み)** | **ゴンドラ** | 鎮守の森・古い鳥居・山道・山麓ののりば | 完 | 図上 0.42 は真上だから。`divide`/`west-range` と交差して見えるのは**端点が分水界の第 1 点と同一座標**なだけ | 変更なし。city・sea・home の真上には置かれていない |
| `memory_lake` | ◎ | **A(特殊)** | （条件） | — | — | なし | 世界地図に出さない。通常 link 分母に入れない |

---

## 3. 距離監査

図上距離は `mapX/mapY` のユークリッド距離。
「すきま」は**その方向での楕円のふちどうしの距離**で、`worldMapShape()` の `rx`/`ry` から計算しています
(負なら 2 つの地域が図の上で重なっている)。

| id | 距離 | すきま | `long` | 貫通している region | またぐ非 region 地形 |
|---|---|---|---|---|---|
| `forest\|snow` | **6.03** | 2.95 | Y | **mountain(t=0.51–0.88 / 全長の 37%)** | `west-range` ×1 |
| `countryside\|river_lake` | **5.70** | 3.32 | Y | **forest(t=0.16–0.58 / 43%)、home(t=0.73–0.80 / 7%)** | なし |
| `jungle\|sea` | 5.38 | 3.60 | Y(special) | なし | `jungle-isle` ×1、`coast` ×1 |
| `forest\|mountain` | 4.50 | 1.11 | Y | なし | `west-range` ×1 |
| `city\|desert` | 4.42 | 1.37 | Y | なし | なし |
| `desert\|mountain` | 4.34 | 2.08 | Y | なし | なし（交差は mountain の内側） |
| `city\|sea` | 3.92 | 1.77 | **n** | なし | `shonai` ×1 |
| `deepsea\|sea` | 2.57 | 0.96 | n(垂直) | なし | なし |
| `city\|countryside` | 2.47 | **0.39** | Y | なし | `divide` ×1、`west-range` ×1（同じ尾根の重複） |
| `mountain\|river_lake` | 2.40 | 0.43 | n | なし | `west-range` ×1 |
| `home\|forest` | 2.20 | 0.13 | n | なし | なし |
| `countryside\|forest` | 2.02 | **-0.34** | n | なし | なし |
| `home\|river_lake` | 1.76 | **-0.69** | n | なし | なし |
| `snow\|mountain` | 1.70 | **-0.97** | n | なし | なし |
| `countryside\|star_stop` | 0.42 | -2.01 | n(垂直) | なし | 端点が分水界の第 1 点と同一 |

### 異常に長い徒歩 connection

徒歩想定(`layer: 'ground'` かつ `special` なし)12 本の統計:
**最短 1.70 / 最長 6.03 / 平均 3.46 / 中央値 3.20 / 平均+1.5σ = 5.68**。

しきい値 5.68 を超えるのは **2 本だけ**で、それがそのまま**他の region を貫通している 2 本と一致**します。

- `forest|snow` 6.03 → mountain を 37% 貫通
- `countryside|river_lake` 5.70 → forest を 43%・home を 7% 貫通

### 異常に短い special connection

- `countryside|star_stop` 0.42 — **問題なし**。真上へ上がる垂直 connection なので図上距離は意味を持ちません
- `deepsea|sea` 2.57 — **問題なし**。うみの岬(`seacave` 78%)から外洋の棚へ下りるので、
  図の上で離れているのは「湾ではなく岬の外」という正本どおりです

### 他の地域を飛びこえている connection

上表のとおり **2 本**。どちらも「異常に長い」2 本と同じものです。
`long: true` は世界地図で弧を描くだけ(`drawWorldMap` の `bow = d * 0.13`)で、
**37% / 43% の貫通を隠しきれる曲がりではありません**。

---

## 4. gate 実装状況

### 実装済み 5 本 / 未実装 10 本

```
gate あり(5): countryside|forest(walk)  home|forest(walk)
              jungle|sea(sea)  deepsea|sea(vertical)  countryside|star_stop(vertical)
gate なし(10): snow|mountain  forest|snow  forest|mountain  mountain|river_lake
               desert|mountain  countryside|river_lake  home|river_lake
               city|countryside  city|sea  city|desert
```

`regionGates()` を 13 地域すべてで実行した結果(gate 端点は合計 **10**):

| region | 出口 | region | 出口 |
|---|---|---|---|
| `home` | forest @ `bigtree` | `sea` | jungle @ `breakwater` / deepsea @ `seacave` |
| `countryside` | forest @ `woods` / star_stop @ `skyland` | `deepsea` | sea @ `reef` |
| `forest` | countryside @ `anc2` / home @ `entry` | `jungle` | sea @ `entry` |
| `star_stop` | countryside @ `stop` | | |

**`city` / `mountain` / `snow` / `river_lake` / `desert` / `memory_lake` には出口が 1 つもありません。**
未実装 10 本は A 側・B 側とも gate が無いことを機械的に確認しました(片側だけ実装されている中途半端な状態は 0 本)。

### いま歩いて到達できる範囲

gate だけを辺とした連結成分は **2 つに割れています**:

```
{ home, countryside, forest, star_stop }      ← 生活圏 + 山の上
{ jungle, sea, deepsea }                      ← 海の三つ
{ river_lake } { mountain } { snow } { desert } { city }   ← すべて孤立
```

地域の行き来は今も `script.js` の `travelToRegion()`(「たび」)だけが担っています。**今回これは変更していません。**

### 実装上の制約（Phase 3B の前提）

`meguru.js` の sim ループは

```js
const gateOn = curSpot ? gates.find((g) => g.spot.id === curSpot.id) : null;
```

と書かれていて、**1 つの spot にある gate を 1 本しか拾いません**。`gateHere()` も同じです。
歩き出しの判定も `out === 'far' ? mz > 0.3 : mz < -0.3` と**奥行き方向だけ**なので、
同じ spot にある同じ向きの 2 本は現状では区別できません。

`home` は spot が 14 個しかなく(`len` 3000)、**`home|forest` と `home|river_lake` が
どちらも `bigtree`「おおきなき」に付いています**。正本の「おうちの おくの 大きな木は 分かれみち」
はまさにこの状態を指しているので、**3B-1 で `home|river_lake` を実装するには
「1 spot 複数 gate」の対応が前置きになります**。これはデータではなくエンジンの課題です。

### `ends` 宣言と mouth の実深度のずれ

`ends: ['口','脇','奥']` は説明用のラベルで、コードの分岐には使われていません
(`meguru.js` で `.ends` を読むのは `c.gate.ends` だけ)。
念のため、mouth spot の実際の深さ(`z / len`)と突き合わせました(しきい値 奥 ≥68% / 口 ≤18% は**この監査が置いたもの**で、コード上の定数ではありません)。

| connection | region | mouth | 実深度 | 宣言 |
|---|---|---|---|---|
| `forest\|snow` | forest | `anc1` | 81% (奥) | 脇 |
| `forest\|mountain` | mountain | `trailhead` | 9% (口) | 脇 |
| `city\|countryside` | city | `cross4` | 69% (奥) | 脇 |
| `city\|sea` | sea | `port` | 53% (脇) | 口 |
| `city\|desert` | desert | `caravan` | 16% (口) | 脇 |

**残り 25 端点はすべて一致**。5 件はどれも境界付近で、動作には影響しません。
表示に使い始めるときだけ直せば十分です(→ 11 章)。

---

## 5. 各 connection の地理評価

2-2 の表が結論です。ここでは判断の根拠だけ残します。

### `snow|mountain`（#29）
`snow` は `mapY 5.0`、`mountain` は `3.5`。**ゆきぐにのほうが北で高い**という正本どおりです。
すきま **-0.97** で 2 つの楕円は図の上で重なっており、mouth も両側とも region の最奥
(`peak` 93% / `summit` 94%)。「おなじ山塊のうらおもて」がデータとして成立しています。
**未実装 10 本の中で地理的にいちばん無理がありません。**
唯一の設計上の論点は、両側とも最奥なので**やまを端から端まで歩かないとゆきぐにへ行けない**こと。
これは矛盾ではなく難度なので、正本どおり残します。

### `forest|mountain`（#28）
`forest`(0.4, -1.0) は西の山塊の南のすそ、`mountain`(0.6, 3.5) はその本体。
直線は `west-range` を 1 回横切ります(森の東から尾根へ乗る)。**正しい形です。**
気になるのは mountain 側の mouth `trailhead`「とざんぐち」が 9% と浅いこと。
ただしやまは南端が入口の region なので、**森から来て「とざんぐち」に出る**のは自然です。

### `mountain|river_lake`（#30）
正本 #8「天竜川型の主要河川は北 → みなもとのみずうみ → 谷 → home の東」を、
**この 1 本だけが直接表しています**。`mountain.foot`(3%)と `river_lake.lakelook`(83%)を結び、
`west-range` の東斜面を下って `source-lake`「みなもとのみずうみ」の岸へ出ます。
説明文も「たにのおおかわの みなもとは さんちょうでは なく、たにの あたまの 湖」と諏訪湖型を明言しています。
**最優先で実装すべき 1 本です。**

### `home|river_lake`（#31）
距離 1.76・すきま -0.69。「おうちは たにぞこでは なく 段丘の うえ」「大きな木の さきの さかを おりる」。
`tenryu` の点列も `(2.62, 0.4) region: home` = **おうちのすぐ東**を通っています。
正本 #7 の「home region 内部に水域を無理に作らない」は守られていて、
`home` の 14 spot に `kind: 'water'` は秘密の `pond`「ひみつのいけ」1 つだけです。
**川は home の外(feature)にあり、region の中には作られていません。**
実装の障害は地理ではなく 4 章のエンジン制約だけです。

### `countryside|river_lake`（#32）
**問題あり。** `countryside`(-1.3, -2.1) → `river_lake`(2.55, 2.1) の直線は
**forest を 43%、home を 7% 貫通**します。距離 5.70 も全体で 2 番目です。
さらに「支流が おおかわに 合流する」という説明なのに、直線は `tenryu` の点列を**一度も横切りません**。

いなかの水(棚田・水車)が谷の大川へ落ちること自体は地理的に正しく、
いなかは分水界の**東**(天竜川型の側)にあるので水系も合っています。
問題は**合流点の位置**です。いなかの沢は西の山塊の東斜面を下るので、
本来は `home` のあたりか、もっと南で大川に合流するはずで、
`river_lake` の川下端(`bank` 3%)まで北上するのは遠回りです。

**C(別地域との connection へ差し替え)は成立しません。**
差し替え先になりうるのは `countryside|home` ですが、正本 #14 が
「home → countryside の直接徒歩 connection は復活させない」と明示しています。
よって **F(保留)** とし、削除した場合の分母だけ 9 章に数字で残します。
保留のまま残す場合は、**世界地図の線を尾根の裾に沿わせ、説明文を
「沢の源から山腹の道を北へたどって谷に出る」へ書き直す**のが最小の修正案です(今回は実施しません)。

### `city|countryside`（#33 — とくに重要）
正本 #17「city は大きな峠・分水界を越えた先の名古屋型大都市。home の直接隣ではない」。
データはこれを**満たしています**:

- `divide`「ぶんすいかい」の点列が `countryside` と `city` のちょうど間を走る
- `city`(-3.6, -3.0) は分水界の**西**、`countryside`(-1.3, -2.1) は**東**（同じ緯度での分水界の x と比べて確認）
- `home` と `city` を直接結ぶ connection は**存在しません**
- transition landscape が全 connection 中いちばん長い **6 段階**
  (たなだ → やまあいのみち → **とうげ(ぶんすいかい)** → はんたいがわのたに → さんかんぶのやど → しょうてんがい)

**弱いのは図上距離だけ**です。2.47 は long 群で 2 番目に短く、楕円のすきまは 0.39 しかありません。
「大きな峠を越えた別の流域の大都市」が、図の上ではほとんど隣り合って見えます。
ただし**距離を動かすと世界地図のレイアウトと探索率の見え方が両方動く**ので、
今回は動かしません。11 章に判断事項として残します。

### `city|sea`（#34）
「みやこがわが 湾に そそぐ ところに まちが ある」。
`shonai` の点列は `(-2.95,-3) countryside → city → (-2.95,-5.35) sea` と流れ、
`bay`「わん」は city と sea の間にあります。**正本 #18 の別水系がきちんと通っています。**
`tenryu` は `(0.35,-5.85) sea` で太平洋にそそいでおり、**みやこがわとは合流しません**。

すきま 1.77 は `long: false` の徒歩 6 本の中で最大です（次に大きいのは `mountain|river_lake` の 0.43）。

うみ側の mouth `port`「みなと」は 53% の深さです。正本 #19 は
「入口側: いりえ/みなと/ぼうはてい、深い側: みさき/とうだい/はてのはま」としていますが、
データ上のうみは `beach`(3%) → `shore`(10%) → `pier`(18%) → `bay`(30–40%) → `port`(53%) → `breakwater`(59%)
→ `cape`(69%) → `seacave`(78%) → `farbeach`(92%) という並びで、
**みなとは「入口側のいちばん奥」**にあたります。#19 と矛盾はしていません。

### `city|desert`（#35）
`city`(-3.6,-3.0) → `desert`(-3.2,1.4)。**region も feature も 1 つも横切りません。**
これは欠陥ではなく、**両方が西の山塊の西(雨陰)側にある**からです:

- 同じ緯度で比べると city は `divide` より西、desert は `west-range` より西
- つまりこの街道は**尾根を一度も越えない、山塊の西側だけを南北に走る道**

`made: 'people'`、説明文も「ちけいでは なく 人が つくった ちょうきょり こうえきろ」と
**地形の道ではないことを自分で明言しています**。正本 #22 の「北西の極端なファンタジー乾燥地」とも整合します。

### `desert|mountain`（#36）
「うかげのとうげ — 山地の うらがわは あめが こえて こない」。
直線は `west-range` の**点列とは交差しません**が、これは矛盾ではありません。
`west-range` の尾根線は `mapX` 0.65–0.75 あたりを通り、`mountain` の楕円は `rx 0.81` なので
**尾根は mountain の内側にあります**。つまり峠越えは **mountain region の中で起きる**設計で、
mouth の `windnotch`「かぜのきれめ」(62%・`zone: upper`・x=-300 = 西より)がその峠そのものです。
**データは正しく、監査ツールの直線交差判定では見えないだけ**でした。

### `forest|snow`（#27 — 削除候補）
**最も危険な地理矛盾です。**

- 距離 **6.03**(全 connection 中最長)、平均+1.5σ の 5.68 を超える
- **mountain の楕円を全長の 37%(t=0.51–0.88)貫通**する
- 説明文は「**山地のうらをまわる** はりばやしの おび」— だが地図上の線は**山地をまわらず、上を通る**
- forest 側 mouth `anc1` は 81% の深さで、宣言 `脇` とも合っていない
- 同じ目的地へは `forest|mountain`(4.50) + `snow|mountain`(1.70) = 6.20 で行ける。
  **ほぼ同じ距離で、しかも地理的に正しい**

`forest` の次数は 4 で、1 本減らしても 3 残ります(`countryside` / `home` / `mountain`)。
`snow` は 2 → 1 になり `mountain` だけとつながります。
これは正本 #13「snow は北方の高山・雪国。mountain より北側」と**むしろ合います**
——ゆきぐにへは、やまを越えてしか行けない。

**B(削除候補)として提案します。今回は削除していません。**

### `jungle|sea` / `deepsea|sea` / `countryside|star_stop` / `memory_lake`
4 本とも実装済みで、正本 #19 / #20 / #21 / #16 / #10 どおりです。変更提案はありません。
`jungle` と `deepsea` の次数 1 は、**島と垂直層なので自然**です。
正本 #37 のとおり、**次数を増やすためだけの connection は提案しません**。

### 世界の形は一本道か（#38）

通常 11 地域の次数:

```
forest 4   mountain 4   city 3   countryside 3(+ほしぞら)   river_lake 3   sea 3
home 2     snow 2       desert 2   jungle 1   deepsea 1        合計端点 28 = 14 本 × 2
```

**一本道ではありません。**大きな輪が 1 つあります:

```
mountain — desert — city — countryside — forest — mountain
```

この輪に、谷の枝(`river_lake` — `home`)、北の枝(`snow`)、海の枝(`sea` — `jungle` / `deepsea`)が
ぶら下がる形です。`forest` と `mountain` が次数 4 のハブになっています。

評価: **「探索順が分かりやすくて良い」寄りです。**
おうちから出ると まず もり、そこから いなか か かわ、という
**生活圏の三角がはっきりしていて**、その外側に山・海・砂という三方向が開いています。
ただし `home` の次数 2 は全 ground region で最少で、**しかもその 2 本が同じ spot(`bigtree`)に付いています**。
おうちの出口が実質 1 か所しかない状態なので、3B-1 で `home|river_lake` を割るとき
「大きな木は 分かれみち」がちゃんと**分かれ道として体験できる**かどうかが要点になります。

---

## 6. anchor 候補（未実装 10 本）

**すべて既存の非秘密 spot です。新しい spot は 1 つも提案していません。実装もしていません。**
優先順位つき、各側 最大 3 つ。★ は現在の `mouths` に書かれているものです。

### `snow|mountain`
| 側 | 1 | 2 | 3 |
|---|---|---|---|
| snow(奥) | ★ `peak`「ゆきやま」 edge 93% | `peakfoot`「ゆきやまのふもと」 path 85% | `blizzard`「ふぶきのはら」 plaza 72% |
| mountain(奥) | ★ `summit`「ちょうじょう」 edge 94% | `eastpeak`「ひがしのみね」 edge 88% | `snowpatch`「のこりゆき」 path 77% |

**既存 mouth で成立。新 spot 不要。**

### `forest|mountain`
| 側 | 1 | 2 | 3 |
|---|---|---|---|
| forest(脇) | ★ `stonelook`「いわばのみはらし」 edge 66% | `fernlook`「くぼちのみはらし」 edge 37% | `fork`「みつまた」 plaza 38% |
| mountain(脇→実際は口) | ★ `trailhead`「とざんぐち」 plaza HUB 9% | `lookout1`「いちのてんぼう」 edge 17% | `steps`「いしだん」 path 14% |

**`mountain.foot` は使わないでください** — `mountain|river_lake` の mouth と同じ spot になり、4 章の制約に当たります。

### `mountain|river_lake`
| 側 | 1 | 2 | 3 |
|---|---|---|---|
| mountain(口) | ★ `foot`「ふもと」 plaza 3% | `torii`「とざんどうのとりい」 path 13% | `mtvillage`「やまのしゅうらく」 plaza 17% |
| river_lake(奥) | ★ `lakelook`「みずうみのてんぼう」 edge 83% | `lakeshore`「みずうみのはま」 plaza 89% | `upperlook`「かみながれのてんぼう」 edge 71% |

**既存 mouth で成立。新 spot 不要。**`trailhead`(HUB) は `forest|mountain` のために空けておくことを推奨します。

### `desert|mountain`
| 側 | 1 | 2 | 3 |
|---|---|---|---|
| desert(口) | ★ `gate`「さばくのいりぐち」 plaza 3% | `well`「いどのひろば」 plaza HUB 10% | `dune1`「すなやま」 path 16% |
| mountain(脇) | ★ `windnotch`「かぜのきれめ」 edge 62% | `ridge`「おね」 plaza 57% | `cliff`「がけのうえ」 edge 42% |

**既存 mouth で成立。**`desert.caravan` は `city|desert` 用に空けておいてください。

### `home|river_lake`
| 側 | 1 | 2 | 3 |
|---|---|---|---|
| home(奥) | ★ `bigtree`「おおきなき」 edge 87% — **`home\|forest` と同じ spot。エンジン対応が前提** | `swing`「きのしたのブランコ」 rest 80% | `park`「こうえん」 plaza 65% |
| river_lake(口) | ★ `riverside`「かわぎしのひろば」 plaza HUB 10% | `riverbend`「かわのまがり」 path 17% | `river1`「かわ」 water 13% |

**新 spot は不要です。**ただし 2・3 は正本の「大きな木の さきの さかを おりる」から外れるので、
**本筋は `bigtree` のまま 1 spot 複数 gate に対応すること**です。
`river_lake.bank` は `countryside|river_lake` の mouth なので候補から外しています。

### `city|countryside`
| 側 | 1 | 2 | 3 |
|---|---|---|---|
| city(脇) | ★ `cross4`「おおどおりのはし」 path 69% | `steps`「ながいかいだん」 path 71%(uptown) | `lookout`「てんぼうひろば」 edge 85% — **採ると `ends` が 奥 になる** |
| countryside(脇) | ★ `terracelook`「たなだのてんぼう」 edge 57% | `hamlet`「となりのしゅうらく」 plaza 57% | `watermill`「みずぐるま」 edge 43% |

**既存 mouth で成立。**峠道らしさを最優先するなら `lookout`「てんぼうひろば」(高台・edge)が
いちばん形は合いますが、`ends` の書き換えを伴うので**第 3 候補**に置いています。

### `city|sea`
| 側 | 1 | 2 | 3 |
|---|---|---|---|
| city(脇) | ★ `boatpier`「ふなつきば」 rest 55%(river) | `rivercross`「かわぞいのこうさてん」 path 58% | `riverpark`「かわらのひろば」 plaza 45% |
| sea(口) | ★ `port`「みなと」 plaza 53%(port) | `boats`「ふねのふとう」 rest 22% | `pier`「さんばし」 path 18% |

**既存 mouth で成立。**`port`(4200) と `breakwater`(4700 / `jungle|sea` の gate)は
同じ `port` 地区に 500 離れて並びます。**別 spot なので 4 章の制約には当たりません**が、
「みなとに 2 つの出口が並ぶ」体験になるので、3B-3 の実機確認で見ておく必要があります。

### `city|desert`
| 側 | 1 | 2 | 3 |
|---|---|---|---|
| city(脇) | ★ `stalls`「やたいのならび」 shop 39%(market) | `marketback`「いちばのうら」 path 37% | `market`「よいちのひろば」 plaza 45% |
| desert(脇→実際は口) | ★ `caravan`「キャラバンのテント」 shelter 16% | `ruins`「いしのいせき」 plaza 22% | `dunecrest`「すなやまのおね」 edge 22% |

**既存 mouth で成立。新 spot 不要。**

### `countryside|river_lake`（保留）
| 側 | 1 | 2 | 3 |
|---|---|---|---|
| countryside(脇) | ★ `riverbank`「かわぞい」 water 36% | `watermill`「みずぐるま」 edge 43% | `fishspot`「かわのつりば」 water 50% |
| river_lake(口) | ★ `bank`「かわぎし」 plaza 3% | `riverbend`「かわのまがり」 path 17% | `river1`「かわ」 water 13% |

**保留中のため実装順には入れていません。**anchor 自体は既存 spot で足ります。

### `forest|snow`（削除候補）
| 側 | 1 | 2 | 3 |
|---|---|---|---|
| forest(脇→実際は奥) | ★ `anc1`「ふるいもり」 grove 81% | `fernlook`「くぼちのみはらし」 edge 37% | `fork`「みつまた」 plaza 38% |
| snow(脇) | ★ `pines`「まつばやし」 grove 35% | `snowfield2`「ひろいゆきはら」 plaza 26% | `lodgeback`「ロッジのうら」 path 22% |

**削除を提案しているため実装順には入れていません。**記録のためだけに残します。

### まとめ

**10 本すべてが既存の非秘密 spot だけで anchor を確保できます。
「将来、新 spot が必要」と記録すべき connection は 1 本もありません。**

---

## 7. non-region terrain（connection の間にある地形）

正本 v1 の「地形と みちは 別もの」を、connection 単位で棚おろししたものです。
`transition.landscape` は実コードの値をそのまま引いています。

| connection | またぐ非 region 地形 | transition landscape（実データ） |
|---|---|---|
| `snow\|mountain` | `west-range` 北端の稜線、万年雪 | がんかいのみち → かぜの くさはら → のこりゆき → まんねんゆき → ゆきはら |
| `forest\|snow` | `west-range` 全長（**mountain の内側を通ってしまう**） | こうようじゅ → こんこうりん → まつばやし → そりん → ゆきはら |
| `forest\|mountain` | `west-range` 南半分の尾根、岩まじりの斜面 | いしのもり → しゃめんの ほそいき → いわまじりのみち → かんぼく → いわば |
| `mountain\|river_lake` | `west-range` 東斜面、滝つぼ、`source-lake`、`tenryu` 源流域 | いわ → こけのいわ → たきつぼ → こはん → かわぎし |
| `desert\|mountain` | `west-range` 西（雨陰）斜面、赤いレキ、メサ、砂山 | たにあい → かぜのきれめ → あかいれき → メサ → すなやま |
| `countryside\|forest` | 屋敷林、雑木林、鎮守の森 | はたけ → やしきりん → ぞうきばやし → ちんじゅのもり → あかるいもり |
| `countryside\|river_lake` | （feature をひとつも横切らない） | たなだ → みずぐるま → かわぞいのみち → とびいし → かわぎし |
| `home\|forest` | にわ、はたけ、かじゅえん、ざつぼくりん | にわ → はたけ → かじゅえん → ざつぼくりん → こだち → あかるいもり |
| `home\|river_lake` | 河岸段丘のふち、坂、かわらの石原 | おおきなき → だんきゅうのふち → さかみち → かわらの いしはら → かわぎしのひろば |
| `city\|countryside` | `divide`（= `west-range` 南端）、反対側の谷、山間部 | たなだ → やまあいのみち → とうげ(ぶんすいかい) → はんたいがわのたに → さんかんぶのやど → しょうてんがい |
| `city\|sea` | `shonai` 下流、倉庫街、運河、岸壁 | かわぞいのみち → そうこがい → うんが → がんぺき → みなと → すなはま |
| `jungle\|sea` | `coast`、南西の外洋、`jungle-isle` | みなと → がんぺき → ぼうはてい → みなとが とおざかる → がいよう → しまかげ → かいがん → こい もり |
| `city\|desert` | 山塊西側の石だらけの平地、街道のやど | しょうてんがい → かいどうのやど → いしだらけのひらち → キャラバンのあたり |
| `deepsea\|sea` | 浅瀬、藻場、浅瀬の棚、棚のふち | はてのはま → あさせ → もば → あさせのたな → たなのふち → おちこみ |
| `countryside\|star_stop` | 鎮守の森、古い鳥居、山道、山麓ののりば、雲の下 | ちんじゅのもり → ふるいとりい → やまみち → すぎが たかくなる → もりが ひらける → やまろくの のりば → そらが ひらける → くものした → ていりゅうじょ |
| `memory_lake` | — | きりが こくなる → おとが きえる → きし |

### region ではない地形の一覧（現行 10 個）

| id | kind | label | role | walk | 点数 |
|---|---|---|---|---|---|
| `tenryu` | river | たにのおおかわ | flow | ○ | 10 |
| `source-lake` | lake | みなもとのみずうみ | flow | ✕ | 10 |
| `divide` | divide | ぶんすいかい | gate | ○ | 4 |
| `shonai` | river | みやこがわ | flow | ○ | 5 |
| `west-range` | range | にしのやまち | gate | ○ | 14 |
| `east-range` | range | ひがしのやまなみ | wall | ✕ | 14 |
| `bay` | bay | わん | edge | ✕ | 5 |
| `coast` | coast | かいがんせん | edge | ○ | 7 |
| `jungle-isle` | island | みなみにしの しま | beyond | ✕ | 8 |
| `jungle-islets` | island | こじま | beyond | ✕ | 4 |

**正本 #12 のとおり、東の大山塊は region ではありません。**`east-range` は `walk: false` / `role: 'wall'` で、
14 点すべての `region` が `home` か `river_lake` ＝「谷に立てば見えるが、歩いては行けない」を表しています。
**region として追加する提案はしません。**

世界の外縁(`rim`)も region ではありません:
北 `ice`「こおりのはら」/ 北西 `sand`「すなのはて」/ 南西 `ocean`「がいよう」/ 南 `ocean`「たいへいよう」/ 東 `cliff`「ひがしのやまなみ」。

---

## 8. 残す / 削除候補 / 差し替え候補

#4 の A〜F で 16 本すべてを分類しました。

| 分類 | 本数 | connection |
|---|---|---|
| **A. 正式に残す** | **16**（下の E/D と重複） | 全件。B の 1 本だけが例外候補 |
| **B. 削除候補** | **1** | `forest\|snow` |
| **C. 別地域との connection へ差し替え候補** | **0** | 該当なし（`countryside\|river_lake` は差し替え先が正本 #14 で禁止のため F へ） |
| **D. special 移動にすべき** | **3**（すべて実装済み） | `jungle\|sea`(ふね) / `deepsea\|sea`(もぐる) / `countryside\|star_stop`(ゴンドラ) |
| **E. 徒歩 connection として実装すべき** | **8** | `mountain\|river_lake` / `home\|river_lake` / `snow\|mountain` / `forest\|mountain` / `city\|countryside` / `city\|sea` / `city\|desert` / `desert\|mountain` |
| **F. 保留** | **1** | `countryside\|river_lake` |

（実装済みの徒歩 2 本 `countryside|forest` / `home|forest` と、地図に出さない `memory_lake` は A のみ。）

正本 #39 のとおり、**special 移動はゴンドラ・ふね・もぐるの 3 つで十分**です。
新しい電車・そり・カヌーなどは 1 つも提案しません。正本 #40 のとおり、**通常 region 間は徒歩が基本**です。

---

## 9. 将来の探索率への影響

```
せかい % = 0.40 × (通常 region / 11)
        + 0.25 × (主要 link / 14)
        + 0.20 × (tier1 / 17)
        + 0.15 × (通常 zone / 103)
```

**今回の監査では分母を変えていません**(正本 #48)。以下は「もし変えたら」の数字だけです。

### 現在

- link 分母 **14**。1 本見つけるごとに **0.25 / 14 = 1.786%**
- link の発見条件は `worldLinksFrom()`、すなわち **両側の mouth spot を両方見つけたとき**です。
  **gate の有無とは無関係**なので、**14 本すべてが今日すでに発見可能**です。
  歩けないだけで、地図には出ます

### `forest|snow` を削除した場合（B 案）

- link 分母 **14 → 13**。1 本あたり **1.923%**(+0.137pt)
- 100% はそのまま 100% です(比率なので)
- **セーブの移行は不要**です。`worldMapData()` は
  `C.links.filter((id) => linkSet.has(id))` と**正本側から数えている**ので、
  セーブに残った古い `forest|snow` は自動的に無視されます
- 途中のセーブでは表示が動きます。例えば 14 本中 7 本発見(link 項 12.50%)の人は、
  削除後 13 本中 6 本(`forest|snow` を持っていた場合)で **11.54%**、
  持っていなければ 13 本中 7 本で **13.46%** になります。**最大で ±1 pt 程度**です
- `snow` の次数は 2 → 1 になります。**ゆきぐにへはやま経由でしか行けなくなります**

### `countryside|river_lake` も削除した場合（F を削除に倒した場合）

- link 分母 **14 → 12**。1 本あたり **2.083%**(+0.298pt)
- `countryside` 通常次数 3 → 2、`river_lake` 3 → 2
- `river_lake` は `mountain` と `home` だけにつながる**谷の川筋そのもの**になります。
  これは正本 #8 の水の流れとしては**むしろきれい**です
- ただし輪が 1 つ消えるので、6 章の「輪＋枝」構造が
  `snow — mountain — river_lake — home — forest — countryside — city — sea — jungle/deepsea` ＋
  `mountain — desert — city` の 1 本の輪に痩せます

### 分母を変えない選択（推奨）

削除を実際に行うときは、**Phase 3B の実装 PR とは別の PR**にすることを推奨します。
探索率の分母変更は世界地図・セーブ・テスト(`meguru-explore-ux-test.cjs` ほか 4 ファイル)に波及するので、
gate 実装と混ぜると切り分けができなくなります。

---

## 10. Phase 3B の実装順序

正本 #52 / #53 のとおり、**1 PR あたり 2〜4 本**、**地理的に近いものをまとめる**方針です。
**10 本を一度に実装する計画にはしていません。**

### 3B-0（前提・コードのみ / connection 0 本）

**1 spot に複数 gate** への対応。4 章の
`gates.find((g) => g.spot.id === curSpot.id)` と `gateHere()` を複数対応にし、
同じ spot・同じ向きの 2 本を選べるようにします。
**これが無いと 3B-1 の `home|river_lake` が正本どおりの `bigtree` に置けません。**
先に単独 PR で済ませるか、3B-1 の冒頭に含めるかは実装時の判断です。

### 3B-1 — 谷の川筋（2 本）

`mountain|river_lake` ＋ `home|river_lake`

- どちらも `tenryu` の軸上。正本 #8「北 → みなもとのみずうみ → 谷 → home のすぐ東」が**歩いて確かめられるようになります**
- 距離 2.40 / 1.76 と短く、すきまも 0.43 / -0.69。**地理的リスクが最小**
- anchor はすべて既存 mouth のまま
- これで `home` — `river_lake` — `mountain` がつながり、孤立していた 2 地域が生活圏に入ります

### 3B-2 — 西の大山塊（2 本）

`snow|mountain` ＋ `forest|mountain`

- 3B-1 で `mountain` が到達可能になったあと、その先へ伸ばします
- `snow|mountain` は距離 1.70 で全体最短。`forest|mountain` は `west-range` を 1 回越えます
- `mountain` 側 anchor の割り当てを確定させる回でもあります
  (`foot` = river_lake 用 / `trailhead` = forest 用 / `summit` = snow 用 / `windnotch` = desert 用に 4 本が分散し、**衝突しません**)
- ここまでで 徒歩の連結成分は `{home, forest, countryside, star_stop, river_lake, mountain, snow}` の 7 地域になります

### 3B-3 — 分水界を越えて海へ（2 本）

`city|countryside` ＋ `city|sea`

- **2 つに割れている連結成分がここで 1 つになります**
  (`{…生活圏…}` ＋ `{jungle, sea, deepsea}` → 全部つながる)
- `city|countryside` は transition 6 段階の峠越えで、**めぐる全体でいちばん見せ場のある 1 本**です
- `city|sea` は実装時に `long: true` を提案します(図の弧だけ。距離は変えません)
- `sea` 側で `port` と `breakwater` が 500 離れて並ぶので、実機確認が要ります

### 3B-4 — 乾燥地の輪（2 本）

`city|desert` ＋ `desert|mountain`

- 最後の孤立地域 `desert` が入り、**輪 `mountain — desert — city — countryside — forest — mountain` が閉じます**
- `city|desert` は `made: 'people'` の交易路、`desert|mountain` は雨陰の峠。**性格が対になっています**

### 保留（3B に入れない 2 本）

- `forest|snow` — **削除候補**。分母変更を伴うので専用 PR
- `countryside|river_lake` — **保留**。説明文と地図線の見直しが先

---

## 11. global world へ進む前に残る判断

`regionOrigin` / Three.js / global world へ進む前に、**人が決めるべきこと**だけを並べます。
どれも今回は実装していません。

1. **`forest|snow` を削除するか**
   削除すれば最長・最大貫通の矛盾が消え、`snow` の位置づけ(やまの向こう)も正本どおりになります。
   代わりに link 分母が 14 → 13 に動きます。**このドキュメントの推奨は削除です。**

2. **`countryside|river_lake` をどうするか**
   forest を 43% 貫通しています。差し替え先(`home|countryside`)は正本 #14 が禁止。
   選択肢は「説明文と地図線を書き直して残す」か「削除して分母 12 にする」かの 2 つです。

3. **`city` の図上位置を動かすか**
   「大きな峠を越えた別の流域の大都市」が、図の上では `countryside` と 0.39 しか離れていません。
   西へ寄せれば地理は締まりますが、**世界地図のレイアウト・Fog の広がりかた・`bounds` が全部動きます**。
   今回は動かしていません。

4. **1 spot に複数 gate を許すか**
   許さないなら、`home|river_lake` の anchor を `bigtree` 以外にせざるを得ず、
   正本の「大きな木は 分かれみち」が崩れます。**許す方向を推奨します。**

5. **`divide` と `west-range` の点列重複をどう扱うか**
   同じ 4 点が 2 つの feature に書かれています。2D の地図では意図どおりですが、
   3D で押し出すときに**同じ尾根が二重に生える**おそれがあります。
   「分水界は west-range の部分集合である」という関係をデータに持たせるか、現状のまま描画側で処理するか。

6. **`ends` を表示に使うか**
   5 端点が実際の深さとずれています(4 章)。説明用のままなら実害はありませんが、
   UI に出すなら先に直す必要があります。

7. **正本 v1 の §10「接続 17 本」の更新**
   PR #309 / #310 で `desert|jungle` が削除され、`jungle|sea` の うみ側 mouth が
   `rockarch` → `breakwater` に変わり、link 分母が 15 → 14 になりました。
   `docs/qa/meguru-world-geography-canon-v1-2026-09-20.md` の §10 の表と §11 の式は**その前の状態のまま**です。
   この文書からの参照は付けましたが、**正本側の表そのものは書き換えていません**（正本の改訂は別の判断です）。

8. **`travelToRegion()` と徒歩 gate の関係**
   3B-4 まで終わると全 11 地域が徒歩でつながります。そのとき「たび」を残すか、
   ショートカットとして残すか、体験としてどう位置づけるか。**今回は一切変更していません。**

---

## 付録: 自動検証で固定した数値

`tests/meguru-phase3a-audit-test.cjs` が以下をすべて検査します。

| 項目 | 値 |
|---|---|
| connection 総数 | 16（`b` あり 15 / `memory_lake` 1） |
| gate 実装済み | 5 |
| gate 未実装（`b` あり） | 10 |
| gate 端点合計 | 10 |
| special | 2（`jungle\|sea` sea / `countryside\|star_stop` vertical） |
| 地域 | 13（ground 10 / `NORMAL_REGIONS` 11） |
| 探索率の分母 | region 11 / link **14** / tier1 17 / zone 103 |
| spot / path / zone / ひみつ | 471 / 654 / 118 / 107 |
| jungle 内部 | spot 40 / path 57 / zone 10 / ひみつ 10 |
| `travelToRegion()` | 無変更 |
