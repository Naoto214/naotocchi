# めぐる Phase 3B-0 — `forest|snow` さくじょ と「1 spot 複数 gate」基盤(2026-09-21)

ブランチ `claude/meguru-phase3b0-multigate`。**PR #311(Phase 3A 監査)の上に積んでいます。**
#311 が main へ入ったあとで base を main に付けかえてください。**main へはマージしていません。**

前提となる監査: [`docs/qa/meguru-phase3a-connection-audit-2026-09-21.md`](../qa/meguru-phase3a-connection-audit-2026-09-21.md)

## 1. A — `forest|snow` を正式 connection から削除

Phase 3A 監査 #27 の結論をそのまま実行しました。

| 削除理由（監査で計測した実データ） | |
|---|---|
| 図上距離 | **6.03** — 全 connection 中で最長 |
| 他 region の貫通 | **`mountain` の楕円を全長の 37%(t=0.51–0.88)** |
| 説明文との矛盾 | `why` は「山地の**うら**をまわる」だが、地図の線は山地の**上**を通っていた |
| 代替 | `forest|mountain`(4.50) + `snow|mountain`(1.70) = **6.20** でほぼ同距離を地理的に正しく行ける |

**正式な経路は `forest → mountain → snow` になりました。**
`snow` の次数は 2 → 1。ゆきぐにへは、やまを越えてしか行けません。
これは地理正本 #13「snow は mountain より北側の高山・雪国」と合っています。

### 削除で動いた数字（すべて実コードから再計算）

| | 前 | 後 |
|---|---|---|
| `connections` 全件 | 16 | **15** |
| うち 2 地域を結ぶもの | 15 | **14** |
| 探索率の link 分母 | 14 | **13** |
| gate 実装済み | 5 | **5**（変化なし） |
| 未実装 connection | 10 | **9** |
| spot / path / zone / ひみつ | 471 / 654 / 118 / 107 | **変化なし** |

`forest.anc1`「ふるいもり」と `snow.pines`「まつばやし」は**ふつうの spot としてそのまま残しています**
（mouth でなくなっただけで、spot・path・zone・secret は 1 つも変えていません）。

### ゴーストが残らないこと

- **世界地図**: `worldMapData()` は `G.connections` から線を作るので、削除した id は**線になりません**
- **みちの発見**: `worldLinksFrom()` も `G.connections` 由来。発見できる link は 14 本
- **探索率**: 分母は `worldCountable()` が正本から数え、`C.links.filter((id) => linkSet.has(id))` で
  照合します。つまり**古いセーブに `'forest|snow'` が残っていても静かに無視される**だけで、
  **セーブの移行処理は要りません**。テストで実際に確認しています
  （`links: ['forest|snow', …4 件]` のセーブ → `links: 3 / linkTotal: 13`、ゴースト線 0）
- **Fog**: 変更していません。未発見の地域・みち・特殊移動は今までどおり 1 つも漏れません

## 2. B — 1 spot に複数 gate

### なぜ必要か

`home.bigtree`「おおきなき」は `home|forest` と `home|river_lake` の**両方の自然な anchor** です。
正本の `why` がまさに「**おうちの おくの 大きな木は 分かれみち**」と書いています。
ところが今までの sim は

```js
const gateOn = gates.find((g) => g.spot.id === curSpot.id);   // 先頭 1 本だけ
```

と**配列の先頭しか拾いませんでした**。Phase 3B-1 の前にここを直します。

### 追加したデータ（semantic data。Three.js でもそのまま使える）

`connection.gate.ends[region]` に 2 つの任意フィールドを足しました。

| フィールド | 意味 |
|---|---|
| `bearing: { x, z }` | **その region の world 空間での出口の向き**（x = よこ、z = おく）。長さは正規化されるので比だけ書けばよい |
| `priority: number` | 向きで決まらなかったときの優先度。小さいほど優先。既定 0 |

今回入れたのは `home|forest` の home 側 `bearing: { x: -1, z: 1 }` だけです
（おくへ進みながら西へ寄ると もり）。**新しい connection も spot も 1 つも足していません。**

### 決定ルール（`resolveGate()`）

`meguru.js` の純粋関数として export しました。使うのは **4 つだけ**です。

1. **出口の向き（`out`）と進行方向** — `out: 'far'` なら `mz > 0.3`、`'near'` なら `mz < -0.3`。
   さらに「その出口を越えたか」(`past`)。ここまでは今までと同じ
2. **その spot の中でのからだの位置** — spot の半径で正規化した `(player - spot)` と `bearing` の内積
3. **進んでいる向き** — 正規化した `(mx, mz)` と `bearing` の内積
4. **`priority`** — ①〜③ で並んだときだけ

```
score = dot(すすむむき, bearing) + 0.6 × dot(spot の中での いち, bearing)
```

いちばん高いものから `margin` (0.12) 未満の差にいるものを「同着」とみなし、
そこから `priority` の小さいものを選びます。**`priority` も同じなら、わざと選びません。**
まっすぐ木に向かって歩いただけのときに、勝手に片方へ出てしまわないようにするためです
（少し横へ寄れば決まります）。`priority` に差をつけてあれば、まっすぐでも既定側に出ます。

**配列の先頭は一度も使いません。** `regionGates()` 自身も
`priority → id` の順に必ずソートして返すので、正本に書いた順に依存するコードは書けません。

### `gateLock` を spot id にした

以前は `true / false` でした。「出口のある spot から離れるまで封じる」という意味でしたが、
出口 spot が隣り合っていると**別の出口へ歩いていっても開かない**という穴がありました。
`gateLock` を**封じた spot の id** にして、別の spot へ移ったら解けるようにしています。

### ride（のる / もぐる / うかぶ）は 1 spot 1 本まで

`gateHere()` も同じ `resolveGate()` を通しますが、**UI にボタンを並べないため**に
「1 つの spot に ride の出口は 1 本まで」というルールを置き、テストで固定しました。
現在は ふね 2 / もぐる 2 / ゴンドラ 2 の 6 端点で、重複は 0 です。

### UI は 1 つも増えていません

徒歩の出口は**進む向きで自然に越える**方式のまま。常時ボタンは
`🧭 たび` / `🏠 もどる` の 2 つ、context action（`💬 はなす` / `のる` / `もぐる` / `うかぶ`）は
今までどおり 1 枠の入れかえです。実画面でも、おおきなきの上で「のる」は出ませんでした。

## 3. 変えていないもの

- `travelToRegion()` — **無変更**。発見済み地域への「たび」はこれまでどおり
- 既存 region 内部の spot / path / zone / secret — **471 / 654 / 118 / 107 のまま**
- Phase 2.1 の transition framework — `approach → cross → arrive → settle`、`walk / up / down / sail` そのまま
- 世界地図 Fog の仕様
- `regionOrigin` / global world / Three.js — **着手していません**

## 4. 検証

### 自動テスト

`tests/meguru-phase3b0-test.cjs`（17 テスト、`npm test` に追加済み）

| | |
|---|---|
| A1 | `forest\|snow` が正本・地図・みちの発見のどこにも残っていない |
| A2 | `forest → mountain → snow` が正式な経路。`snow` の次数 1 |
| A3 | link 分母 13。**古いセーブに残っていても壊れない**。100% は 100% のまま |
| A4 | spot / path / zone / ひみつ が 1 つも変わっていない |
| B1 | `regionGates()` は `priority → id` の決まった順。**正本の並びを入れかえても同じ** |
| B2 | 1 つの spot に出口 2 つを持てる |
| B3 | 位置と向きで決まる。**配列の順番に依らない**（2 通りの並びで同じ結果） |
| B4 | 向きでも priority でも決まらないときは選ばない。少し横へ寄れば決まる |
| B5 | 出口 1 つなら今までどおり。`bearing` なしでも動く |
| B6 | 実際に歩いて、西なら もり・東なら かわ へ出る |
| B7 | 1 回の横切りで gate は 1 度だけ（**演出の二重はじまりなし**） |
| B8 | ride は 1 spot 1 本まで。徒歩の出口では「のる」を出さない |
| C1–C5 | 既存 gate / 出口以外から出られない / たび不変 / Fog 漏洩なし / なかま追従・住民重複なし |

B2・B6・B7 は、**Phase 3B-1 でほんとうに入れる形の 2 本目の gate を
その harness の中だけに差しこんで**動かしています（正本には入れていません）。

```
npm test → 1061 / 1061 pass
```

既存テストの定数も新しい実データに合わせました
（`meguru-explore-ux` / `meguru-sea-route` / `meguru-transition` /
`meguru-transition-polish` / `meguru-world-map` / `meguru-phase3a-audit`）。

### 実画面（Chromium・実 DOM だけ。ゲームの中にフックは差しこんでいません）

390×844 / 375×667 / 360×640 の 3 サイズで、

| 確認 | 結果 |
|---|---|
| たび → めぐる に入る | `🏠おうち` ✓ |
| パッドをなぞって おおきなきから もりへ | `🌲もり` ✓（3 サイズとも） |
| transition 後もパッド・ボタンが生きている | ✓ |
| 右側の常時ボタン | `🧭 たび` / `🏠 もどる` の 2 つだけ。近くに誰か来たときだけ `💬 はなす` ✓ |
| おおきなきの上で「のる」が出ない | ✓ |
| 🗺 ちず → 🌍 せかい | `せかい 11% ・ 2／11 ちほう`。**ゆきぐにへの線なし** ✓ |
| 画面からのはみ出し | 0 件 ✓ |
| ページエラー | 0 件 ✓ |

## 5. つぎ（Phase 3B-1）

この基盤の上に **2 本だけ**実装します。

- `mountain|river_lake` — `mountain.foot`「ふもと」↔ `river_lake.lakelook`「みずうみのてんぼう」
- `home|river_lake` — `home.bigtree`「おおきなき」↔ `river_lake.riverside`「かわぎしのひろば」

`home.bigtree` に 2 本目の walk gate が付くのがまさに今回の基盤の出番です。
`home|forest` は `priority: 0` のままなので、**まっすぐ歩けば今までどおり もり**へ出ます。
