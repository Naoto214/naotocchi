# めぐる collision semantics / visual geometry 監査(2026-09-29)

基準: main `05b31dfd`(RH-11 後)。**読むだけの 監査**。collision の 改修は していない。
測定: `tools/audit/meguru-collision-audit.cjs`(`walk` 付きで プレイヤーの 歩行)、`tools/audit/meguru-corridor-audit.cjs`、`tools/audit/meguru-corridor-depth.cjs`。
harness の `deterministic` で 同じ 数字が 出る。

## 0. 結論(3 行)

1. **party は 歩いて いる あいだ、当たり判定を 1 つも 通らない**。
   - `followParty` は 位置を 目標へ 直接 足すだけで、`moveWithCollision` を 通らない。
   - player が 木・壁で 止まっても、仲間は その 中を 通る。
   - 4000 フレーム(うち 歩行 3400)中 2900〜3536 フレーム(73〜88%)で、だれかが 障害物に めりこんで いる。
   - RH-7 で 直したのは「着いた とき」と「止まって いる とき」だけ。**既存の party obstacle バグと 同じ 原因**(party に 移動の 当たり判定が ない)で、統合して 扱う。
2. **見た目は かたいのに 当たりの ない もの** が、到達できる 範囲に 多い。
   - forest 220 / mountain 240 / city 366。
   - 主な 原因は 次の 3 つ。見た目は 残したまま、当たりだけが 消えたり 縮んだり して いる。
     - `clearCorridor`(道・spot の 通行帯に かかる 当たりを 消す / 縮める)
     - `fore` 層(道の すぐ わきの 岩・柵・枝。`solid` なし)
     - 小さい struct(size ≤ 120 は `solid` なし)
3. 当たりの 形は **circle と 回転した rectangle(box)だけ**。
   - world 座標の 正本(`COLLIDER`、「Three.js でも おなじ 値」と コメントに ある)なので、3D へ そのまま 流用できる。
   - 足りない もの: 高さ、道の そばで 当たりを 消すときに 見た目を 同時に 消す 規則、party の 移動の 当たり判定。

## 1. 当たり判定の しくみ(現行 2D)

| 誰 / 何 | 形 | 半径・大きさ | 通る 関数 |
|---|---|---|---|
| player(region) | 円 | `bodyRadius` 22 | `moveWithCollision`(押し出し + 「めりこみが 増える 動きは 取り消す」) |
| 住人 | 円 | 22 × `STAND_CLEAR` 0.8 = 17.6 | `moveWithCollision` / `standClear` |
| **party(歩行中)** | **点(当たりなし)** | — | `followParty` が `a.x += …` で 直接 動かす |
| party(着いた とき・止まって いる とき) | 円 | 17.6 | RH-7 の `clearSlot`(`standClear`) |
| player(corridor) | (s, u) 空間の 円 | 22 | 帯 `|u| ≤ uMax` + 端の 石(r 24)を chart 座標で 押し出し |
| party(corridor) | 帯だけ | — | 帯の はばで clamp。**端の 石は 見ない** |
| 物 | circle / box(回転) | `COLLIDER[struct].w/d × size` | `colliderOf` → `obstacleOf` → 空間グリッド(`COLL_CELL` 360) |

**表現の 内訳**

| 表現 | 使われかた | 件数(obstacles) |
|---|---|---|
| point | party の 歩行中(当たりなし) | — |
| circle | 木(幹だけ)・岩・柱・像・水たまり・絵文字の 建物 / 木・landmark(根もと 0.13) | forest 455 / mountain 262 / city 266 |
| rectangle | 回転 box: 建物・壁・崖・柵・丸太 | forest 14 / mountain 74 / city 124 |
| polygon | なし | 0 |
| tile | なし(`COLL_CELL` の グリッドは 検索用の 索引だけ。地面の 模様の マスは 見た目用) | — |
| ad-hoc | 下の 表 | — |

**ad-hoc な 条件**

| 条件 | 内容 |
|---|---|
| 世界の はし | `clampToWorld`(`minX / maxX`・`zMargin`) |
| 川・海の 岸 | `shoreX` による x の clamp |
| corridor の 帯 | `|u| ≤ uMax` |
| 道・spot の 通行帯 | `clearCorridor` が 当たりを 縮める / 消す |
| 大きさ | `solid: size > 120` |
| 絵文字 | 決まった 集合だけ solid(`SOLID_EMOJI_BUILD` / `SOLID_EMOJI_TREE`) |
| 水 | `role: 'water'` を 水の 住人は 無視 |
| 地面の エリア | `AREA_ROLE` の paddy / shallow / frozen は **当たりなし**(見た目だけ) |

## 2. 分類(forest / mountain / city)

対象は、到達できる 範囲に ある「見た目が かたい もの」(木・岩・建物・柵・柱・水たまり・landmark)。草・花・葉・すなの うねり・橋は 通れて 正しい ので 除いた。

### forest(props 1233、obstacles 469)

| 分類 | 木 | 岩 | その他 |
|---|---|---|---|
| collision あり(形 おおむね 一致) | 400 | 41 | 2 |
| collision なし | 178 | 38 | 4 |
| collision あり、形が 大きく ずれる(道の そばで 60% 未満に 縮小 など) | 21 | 3 | 3 |
| player は 止まるが party は すり抜ける | 上の「あり」全部。party の めりこみ: 4000 フレーム(歩行 3400 + 停止 600)中 2980 フレーム(多い 順: bigtrunk・🌲・🌳・mistwood・stump) | | |
| player・party とも すり抜ける | collision なし の 全部 | | |

- collision なし の 内訳(木): `clearCorridor` で 消えた 156(🌲 68・bigtrunk 54・🌳 38 ほか)、絵文字(side 層)10、deco 12。
- collision なし の 内訳(岩): lane 層の 🪨 27 ほか。
- ランダム歩行で player が 当たりなしの 木の 中に 入った: 70 フレーム(log・stump)。

### mountain(props 747、obstacles 336)

| 分類 | 岩・崖 | 木 | 建物 | 柵 |
|---|---|---|---|---|
| collision あり(おおむね 一致) | 106 | 193 | 6 | 1 |
| collision なし | 159 | 68 | 12 | 0 |
| 形が 大きく ずれる | 24 | 2 | 2 | 0 |

- collision なし の 主な もの: fore 層の ledgerock 91、cliffwall 31(`clearCorridor` で 消えた)、🌲 55、bigrock 14、cairn 10、🏕️ / tent 8。
- 形の ずれ: cliffwall 19(道の そばで 縮小)。
- party の めりこみ: 4000 フレーム中 2900(cliffwall・🌲・bigrock・pinewall・tent)。
- player が 当たりなしの 岩の 中に 入った: 733 フレーム(ほぼ ledgerock)。木 86・⛩️ 29。

### city(props 1013、obstacles 390)

| 分類 | 建物 | 柵・柱 | 木 | 街灯 |
|---|---|---|---|---|
| collision あり(おおむね 一致) | 246 | 0 | 60 | 29 |
| collision なし | 181 | 155 | 24 | 11 |
| 形が 大きく ずれる | 50 | 0 | 3 | 0 |

- collision なし の 主な もの:
  - fore 層の guardpost 125
  - `clearCorridor` で 消えた 建物 147(building 42・🏢 39・shopblock 37・🏬 24 ほか)
  - 🚧 15・guardrail 15・vending 13
- 形の ずれ: building 23・alleywall 7・house 5(道の そばで 縮小)。
- party の めりこみ: 4000 フレーム中 3536。多い 順に alleywall・building・🏢・🏬。
- player が 当たりなしの 建物の 中に 入った: **1625 フレーム**(shopblock 12 棟ほか)。guardpost 223。

### corridor(10 本 × 両方向 = 20)

| 分類 | 内容 |
|---|---|
| collision あり | 帯の 端の 石(1 段に 最大 1。r 24。chart の (s, u) で 判定) |
| collision なし・到達できない | 両わきの 飾り(`solid:false`、1 本 74〜90)。帯 `uMax` は いつも 飾りの 列(`halfWidth + 20` より 外)の 内側に ある ので、player も party も 届かない(歩行で 0 フレーム)。**一致している** |
| 形が ずれる | 端の 石を chart 座標で 押し出す ので、曲がり道では world 座標で 最大 14 めりこんで 見える(46 の うち)。28 / 18112 フレーム |
| player は 止まるが party は すり抜ける | 端の 石。party は 帯でしか clamp されず、石の 中まで 入る(最大 40 = ほぼ 全部)。1709 / 18112 フレーム |
| 両方 すり抜ける | なし |

## 3. すり抜けの 原因(現行 2D)

| # | 原因 | 影響 | 関係 |
|---|---|---|---|
| C1 | `followParty` が 当たり判定を 通らない(region・corridor とも)。party の 半径も 決まって いない | 「leader は 止まるが 仲間が 突き抜ける」の ほぼ 全部 | **RH-7 の party obstacle バグと 同じ 原因**。RH-7 は 着いた とき・止まった ときだけ 直した(部分的な 修正)。統合して 1 件として 扱う |
| C2 | `clearCorridor` が 道・spot の 通行帯に かかる 当たりを 消す / 縮めるが、**見た目は そのまま** | 道ばたの 木・建物・崖の すり抜けと 形の ずれ | 見た目と 当たりの 正本が 2 つに 分かれて いる |
| C3 | `fore` 層(道から 20〜66 外の 岩・柵・枝)に `solid` が ない | mountain の ledgerock、city の guardpost | 見た目は かたい が、演出用として 当たりなし |
| C4 | 小さい struct(size ≤ 120)、`solid` の ない 層(lane / field / side / hint)の 絵文字の 木・岩・建物 | 🪨・🌲・🏢 など | 大きさと 層で solid を 決めて いて、「何が かたいか」の 意味で 決めて いない |
| C5 | corridor の 端の 石を chart 座標で 判定 | 曲がり道で 最大 14 めりこむ | 3D では world 座標に すれば 消える |
| C6 | player 22 と 住人・party 17.6 で 半径が ちがう | 同じ すき間を 仲間だけ 通れる | 3D で 1 つに する |

## 4. 3D へ 流用できる もの / 足りない もの

**そのまま 使える**
- `COLLIDER`: 形(circle / box)・world 単位の 半径・向き(`ang`)。コメントどおり Three.js でも 同じ 値。
- `STRUCT_ROLE`(building / vegetation / terrain / water / light / obstacle / road)と `COLLIDER_ROLE`(solid / water / boundary)。
- prop の `x, z, size, ang, layer, struct / emoji / landmark`。
- 空間グリッド(`buildCollisionGrid`)と 押し出し(`pushOutCollider`)と「めりこみを 増やさない」規則(`moveWithCollision`)。

**足りない もの**
- ほとんどの prop に 固定の **id** が ない(`mid` が ある のは 目じるしだけ)。
- **高さ**: `OCCLUDER_BOX[1] × size` は 見た目の 高さで、当たりの 高さは ない。
- 当たりを 消す / 縮めた ときに、見た目を 同じ 所で 決める 規則が ない(C2)。
- 絵文字の 見た目の 接地の 大きさ(0.32 × size の 見当だけ)。

**world object に まとめる 案(3D prototype 用。いまは 実装しない)**

```
world object
  id          (region + 生成の seed から 決まる。いまの mid の 形)
  type        (tree / rock / building / fence / post / water / plant / deco …)= STRUCT_ROLE を 1 段 こまかく
  position    { x, z, ang }
  visual      { struct | emoji | mesh, size, layer }
  collision   { shape: circle | box, hw, hd, ang } | null   ← 見た目と 同じ object に もつ
  height      (当たりの 高さ。とりあえず OCCLUDER_BOX[1] × size)
  walkable    solid | water | boundary | walkable
```

- いまの `props[]` に `collision` を **生成の とき 1 回だけ** 決めて 持たせれば、ほぼ この 形に なる(`obstacleOf` の 結果を prop に 付けるだけ)。
- **規則を 1 つ 足す**: 通行帯に かかって 当たりを 消す / 縮める 物は、見た目も おかない / ずらす / 小さく する(C2 を 生成の 段で 防ぐ)。
- fore・小さい struct・絵文字は `type` で solid か どうかを 決める(C3・C4)。
- party は player・住人と 同じ `moveWithCollision` を、同じ 半径で 通す(C1・C6)。

## 5. forest 3D prototype の 最低限の 成功条件(collision)

1. **木・岩・建物・柵** の うち 到達できる もの で、「見た目 あり・当たり なし」が 0 件。
   - 監査スクリプトの `no-collision` が 0 に なる こと。
   - 草・花・葉など 通れる もの は `type` で 明示する。
2. 当たりの 形が 見た目に 合って いる こと。
   - 木: 幹の メッシュの 半径 = `collision` の 半径(± 20%)。
   - 岩・建物・柵: 接地の 大きさ / 向きが `collision` の circle / box と 一致(± 20%)。
   - 道の そばで 縮める 物は 見た目も 同じ だけ 縮める。
3. **party**
   - 27 にんで、決めた 歩行ルート(直進・曲がり・木の 列の わき・止まる)を 通す。
   - 歩行中・停止中とも「障害物への めりこみ > 2」の フレームが **0**。
   - 「leader は 止まるが 仲間が 突き抜ける」は **失敗** と する。
4. player と party は **同じ 当たり判定の 関数・同じ 半径**。
5. corridor を prototype に ふくめる 場合は、端の 石を world 座標で 判定し、party も 石を よける。

## 6. いまは やらない こと

- collision の 全面改修。
- 2D の `clearCorridor` の 挙動の 変更。
- fore 層に 当たりを 足す こと(見た目・遊びやすさが 変わる)。
- party の 移動に 当たり判定を 入れる こと(C1)。2D で 先に 直すかは オーナーの 判断。
  - 直すなら RH-7 の 続きとして 1 件で 扱う。受け入れ条件は §5 の 3。
