# Phase 4E — continuous corridor world 設計監査

日付: 2026-09-23 ／ 対象: めぐる(`meguru.js` / `script.js` の `meguruBridge`)
前提: [Phase 4A 設計](./meguru-phase4a-region-origin-global-world-2026-09-22.md)(アトラス方式)・[Phase 4C 引き継ぎ](../handoff/meguru-phase4c-corridor-2026-09-23.md)(corridor 13 本)・[Phase 4D 設計](./meguru-phase4d-distant-world-streaming-renderer-2026-09-23.md)(遠景・streaming)・[4D-2c 引き継ぎ](../handoff/meguru-phase4d2c-backdrop-yaw-2026-09-23.md)(遠景の角度系そろえ)

> ## 追記(2026-09-23)— 設計監査は完了し、4E-1 を実装しました
>
> この設計監査は PR #335 で main(`a564730`)に入り、**Phase 4E 設計監査として完了**しました。
> Phase 4E-1(corridor の形と状態の pure data)→ [`../handoff/meguru-phase4e1-corridor-geometry-2026-09-23.md`](../handoff/meguru-phase4e1-corridor-geometry-2026-09-23.md)
>
> 実装で決めた点(この文書との差分):
> - 幅クラスの名前は `road` / `trail` / `pass` ではなく **`wide` / `normal` / `narrow`**(幅 520 / 380 / 260)
> - 地面の種類は 12 種ではなく **11 種**(`forest` `field` `road` `slope` `ridge` `rock` `river` `shore` `dry` `snow` `urban-edge`)。gate の data には足さず、4E-1 のブロックの中の表に持つ(消せば消える)
> - 段の言葉は「A 側を前半・B 側を後半」ではなく **向きごとにその側の land をそのまま使う**(形は共有、言葉は gate end ごと)
> - 曲がりは 5 段に等分の台形(峠・坂を多めにする重みづけはしない)。30°/s を超える corridor には印だけ付け、補正は 4E-4

**この文書は設計監査です。ゲームのコードは 1 行も変えていません。**
continuous walk・global collision・resident の地域間移動・save schema の変更・Three.js には進んでいません。

目的: 「region A → 出口 → corridor 空間 → region B」を、同じ世界の中の連続した移動として扱うために何が要るかを決める。

---

## 0. 結論(先に)

| 項目 | 結論 |
|---|---|
| **方式** | **案 A′: corridor 専用の一時的な chart(アトラスの 1 ページ)**。region の中は今の local のまま。corridor は自分の平面を持ち、**global とは「向き(yaw)」だけで**つなぐ |
| **global の位置を使わない理由** | 実測。corridor を歩く長さ(2250〜2700)の曲線の両端は 1741〜2637 離れる。一方、出口どうしの global 距離は 4.6〜83.9 しかない。**歩ける長さの corridor は、出口と出口のあいだに物理的に入らない**(§2.2) |
| **player の正本** | region 内は `region + local`(今のまま)。corridor 中は **`connectionId + s(弧長) + u(横ずれ)`**。t = s / walkLength。global 位置は導出値(表示・デバッグ用で、物理的な意味は持たない) |
| **形** | **段ごとの曲率スプライン**(land 6 段の境目を checkpoint とし、段ごとに曲がる量を割り当てる)。Bezier / Catmull-Rom は使わない(§5) |
| **長さの正本** | 意味の長さは `travelLength`(段 × 1600、今のまま)。歩く長さは **`walkLength = 段 × 450`**(2250 / 2700 = 初回 8.7〜10.4 秒) |
| **handoff** | **出口の pose(位置 + 向き)どうしを合わせる**。global の位置を経由しないので、closure の誤差(最大 83.9)は handoff に入らない。向きは REGION_FRAME の yaw でつながる(誤差 0) |
| **collision** | region 内は今の local collision。corridor 中は **帯の左右の境界 + 段ごとの簡単な障害物(1 本 24 個まで)**。同時に 2 つの collision は持たない |
| **streaming** | corridor 中に持つのは **corridor 本体 + 両側の遠景 metadata だけ**。出発 region は t ≥ 0.25 で捨てる。**到着 region は到着の handoff で `buildWorld()`**(短い暗転の中)。t ≈ 0.7 の先読みは 4E-3 で性能を見て決める |
| **save / reload** | **save schema は変えない。corridor の状態は保存しない。** `state.regionId` は到着の handoff まで出発 region のまま。**途中で reload すると出発 region から再開**(今の transition 途中の reload と同じ性質) |
| **UI** | pad は使える。**たび・ちず は corridor 中は使えない**。もどる(めぐるを出る)は使える(save は出発 region) |
| **special** | `jungle|sea`(ふね)・`countryside|star_stop`(ゴンドラ)・`deepsea|sea`(もぐる)は **今の transition のまま**。memory_lake は対象外 |
| **resident / party** | corridor に住民は出さない。**なかま・こいびと(party)だけ**ついてくる |
| **fallback** | いつでも今の transition(approach → cross → arrive → settle)に戻れる。reduced motion・perfTier 2・失敗時は transition |
| **PoC の 1 本** | **`home|forest`**(次点 `home|river_lake`) |
| **Three.js** | **不要**。Canvas の PoC を先に作る |
| **分割** | 4E-1(形と状態の data)→ 4E-2(1 本の Canvas PoC)→ 4E-3(streaming / 先読み / 暗転なし)→ 4E-4(walk 10 本へ展開) |

---

## 1. 現状

### 1.1 そろっているもの(Phase 4B〜4D)

- `REGION_FRAME`(12 地域)と local ↔ global の変換(`toGlobal` / `toLocal` / `dirToGlobal` / `yawToGlobal` / `yawToLocal`)
- corridor 13 本(walk 10 / sea 1 / vertical 2)、`orientCorridor()`、global graph、`findRegionRoute()`、`corridorDirection()`
- DistantFeature 37 と、全 12 地域の方角固定の遠景(Canvas)
- backdrop 帯の角度系も遠景とそろった(4D-2c: 逆向き 0、C 評価 0)

### 1.2 まだ region に閉じているもの

| 項目 | 今の実装(読解) |
|---|---|
| 座標 | region ごとに独立した local(`buildWorld()` の `x ∈ [−halfW, halfW]`, `z ∈ [0, len]`) |
| corridor | semantic data だけ。形・幅・当たり判定はない |
| collision | `buildObstacles()` → `buildCollisionGrid()`(ます目 `COLL_CELL = 360`)。`moveWithCollision(pt, nx, nz, world)` は world を引数に取る |
| resident | `world.residents`。region の外へは出ない |
| party | `followParty(dt)` が `camera.yaw` を基準に player の後ろ・横へつく |
| save | **座標を 1 つも持たない**。`state.regionId` と、spot / zone / path / mark / world の **id だけ** |
| 越えかた | gate の spot に入る → `beginTransition(g)` → `approach → cross → arrive → settle`。**`cross` の頭で `S.enterRegionByMove()`(regionId の書きかえと `saveState()`)と `enterWorld()`(`buildWorld()`)**。transition 中は たび・ちず・もどる を止める |
| reload | `start()` は `state.regionId` の **`world.entry`** から始まる(出口の spot ではない)。位置は保存されない |
| もどる | `homeBtn` → `stop()` = **めぐるモードを出る**(home 地域へ戻る操作ではない) |

### 1.3 実測値(このブランチの main = `bf65b5b`、Node・デスクトップ・暖機後の最小値)

| region | `buildWorld` | props | colliders | len | 端から端まで歩く時間 |
|---|---:|---:|---:|---:|---:|
| home | 9.5ms | 236 | 75 | 3000 | 11.5s |
| forest | 95.0ms | 1230 | 469 | 7900 | 30.4s |
| river_lake | 56.2ms | 677 | 294 | 8000 | 30.8s |
| countryside | 60.0ms | 653 | 286 | 7700 | 29.6s |
| city | 60.3ms | 1013 | 390 | 6600 | 25.4s |
| mountain | 61.9ms | 747 | 336 | 9000 | 34.6s |
| desert | 37.9ms | 496 | 261 | 8800 | 33.8s |
| sea | 30.8ms | 460 | 221 | 8000 | 30.8s |
| snow | 32.5ms | 470 | 230 | 7600 | 29.2s |
| jungle | 83.7ms | 1297 | 552 | 8100 | 31.2s |

- 歩く速さ `RULES.playerSpeed = 260`(道の上)、道の外は 0.62 倍
- corridor 13 本の data は JSON で約 14KB
- rAF(4D 設計 §1.3、CPU 4 倍): home p50 10.9ms / p95 14.5ms、mountain p50 18.3ms / p95 28.3ms

---

## 2. 3 案の比較

### 2.1 案

| 案 | なかみ |
|---|---|
| **A′. corridor 専用の一時 chart**(推奨) | corridor を「アトラスの 1 ページ」として扱う。region A / corridor / region B は **どれか 1 つだけ**が有効。corridor の平面は global の向きにそろえるが、位置は global に置かない |
| B. 同じ global scene に A / corridor / B を載せる | 3 つを REGION_FRAME の global 位置に同時に置き、1 枚の scene として歩く |
| B′. pose で縫う scene | B の変形版。A と B を REGION_FRAME ではなく **corridor の端の pose に合わせて**置く |
| C. full continuous world | 全 region と corridor を 1 つの global 平面に置く |

### 2.2 決め手になった実測 — corridor は出口と出口のあいだに入らない

walk corridor の出口どうしの global 距離(`physicalGap`)は **4.6〜83.9**(Phase 4B の closure の残り)。
一方、曲がる量が決まった曲線(一定曲率)の弦の長さ = 両端の距離は次のとおり。

| corridor | 曲がる量 | gap | 弦(長さ 9600 = travelLength) | 弦(長さ 2700 = walkLength) |
|---|---:|---:|---:|---:|
| `home|river_lake` | 43° | 52.3 | 9376 | 2637 |
| `desert|mountain` | −49° | 57.7 | 9304 | 2617 |
| `city|desert` | −60° | 49.7 | 9165 | 2578 |
| `home|forest` | 75° | 77.6 | 8926 | 2511 |
| `snow|mountain` | 131° | 55.2 | 7649 | 2151 |
| `forest|mountain` | 156° | 83.9 | 6900 | 1941 |
| `city|sea` | −162° | 4.6 | 6722 | 1891 |
| `mountain|river_lake` | 172° | 32.6 | 6383 | 1795 |
| `city|countryside` | −173° | 34.0 | 6339 | 1783 |
| `countryside|forest` | 178° | 28.6 | 5149(長さ 8000) | 1741(長さ 2250) |

- 曲がる量は、A の出口の向き(global)から B へ入る向き(global)までの符号つきの差です(+ = 右まわり)。絶対値は Phase 4C の `bend` と同じ
- **どの長さを選んでも、端と端は gap の 20〜500 倍離れる。** global の位置どおりに置くには、corridor を大きく輪にして戻すしかない。そうすると、輪がほかの region の chart と重なる
- そもそも Phase 4A §2.3 で「地上 10 地域は 1 枚の平面に重ならずに並べられない(混み具合 約 1.5 倍)」と分かっている

### 2.3 比較表

| 軸 | A′ 一時 chart | B global scene | B′ pose で縫う | C full world |
|---|---|---|---|---|
| region の local 座標 | **そのまま** | そのまま | そのまま | 書きかえが必要 |
| global の重なり(§2.2・4A §2.3) | **影響なし**(同時に 1 ページ) | A と B が重なって見える / ぶつかる | 影響なし | 解けない |
| 同時に持つ world | **1 つ + corridor** | 2 + corridor | 2 + corridor | 全部 |
| 住民 AI / collision grid | **1 地域分** | 2 地域分 | 2 地域分 | 全部 |
| 出口の段差(closure 83.9) | **pose 合わせで 0** | 最大 83.9 のずれ | pose 合わせで 0 | — |
| 遠景の方角(4D) | **yaw でつながる** | そのまま | yaw でつながる | そのまま |
| save 変更 | **不要** | 不要 | 不要 | 必要 |
| 暗転なしの到着 | 4E-3 で B′ の手法を部分的に使う | ○ | ○ | ○ |
| リスク | **低** | 高(重なり) | 中(2 world 分のメモリ・負荷) | **高**(4A で不適と判定済み) |

### 2.4 推奨

**案 A′ を採用します。** B′ は「到着の直前だけ B の出口まわりを corridor の端に合わせて描く」手法として、4E-3 で部分的に使います(§9.3)。
案 C は採りません(Phase 4A の判定どおり)。

---

## 3. 推奨案 — corridor は「向きだけ global」の一時 chart

```
 region A(local)          corridor chart(自分の平面)          region B(local)
 ┌──────────┐  出口 pose    ┌─────────────────────┐   入口 pose   ┌──────────┐
 │  …  ●gate │ ───────────▶ │ s=0 … 段1 … 段6 … s=L │ ───────────▶ │ gate●  … │
 └──────────┘  向き: A.leave └─────────────────────┘ 向き: −B.leave └──────────┘
       │                          │ yaw だけ global にそろえる             │
       └──── yawToGlobal ─────────┴──────────── yawToLocal ───────────────┘
                     (遠景 DistantFeature・backdrop は global yaw で描く → 継ぎ目なし)
```

- 有効な chart は **いつも 1 つ**(region A か、corridor か、region B)
- corridor chart の原点 = A の出口 spot、+z = A を出る向き。chart の global yaw = `headingGlobal(A.leave)`
- corridor の曲線は「段ごとに曲がる量」で決める。**終点の向きは必ず B へ入る向き(global)と一致**する(総回転 = §2.2 の曲がる量)
- 終点の **位置** は global では B の出口と一致しない(しなくてよい)。到着の handoff では **B の出口 spot に pose を合わせて**置く
- このため、corridor の global 位置は「目安の導出値」で、物理的な意味を持たない。**global 座標から region や corridor を逆引きしない**(4C の決まりのまま)

---

## 4. corridor state

### 4.1 CorridorSegment(4E-1 で data にする。今回は作らない)

corridor 1 本に 1 つ。`worldCorridors()` と同じく **正本から導出する生成物**で、手で写した数は持たない。

```
CorridorSegment {
  connectionId,            // 'home|forest'
  a, b,                    // 正本の両端(向きは orient で決める)
  eligible,                // walk・両端 ground・frame あり・memory_lake でない
  startGlobal, endGlobal,  // 両端の出口 spot の global 位置(目安・表示用。handoff には使わない)
  startPose: { region, spot, localX, localZ, localHeading },   // A の出口 pose(local)
  endPose:   { region, spot, localX, localZ, localHeading },   // B の入口 pose(local。heading = −B.leave)
  frameYaw,                // corridor chart の global yaw = heading(A.leave)
  turn,                    // 符号つきの総回転(°)。= heading(enterB) − heading(leaveA)
  curve: [{ s0, s1, turn, kind }],   // 段ごと: 始まりと終わりの s、この段で曲がる量、straight / ramp / arc
  travelLength,            // 意味の長さ(段 × 1600、今のまま。graph・cost 用)
  walkLength,              // 歩く長さ(段 × CORRIDOR_STAGE_WALK = 450)
  terrainStages: [{ label, terrain, width }],   // land 6 段(A 側から)+ 地面の種類 + 幅クラス
  width,                   // 幅クラス(§5.5)
  layer: 'ground', way: 'walk',
  collisionProfile: { halfWidth: [...], edge, obstacles: { seed, max: 24 } },
  visibilityProfile: { drawAhead: 1200, fog, distantBlend: [0.4, 0.6], backdrop: { from, to } },
}
```

- `terrain` は land の言葉から推測しない。**4C のテスト 6 が「land の言葉をコードに書かない」と縛っている**ので、正本(`WORLD_GEOGRAPHY` の gate の `land`)の横に **地面の種類タグ**(閉じた語彙 12 種: `town` `field` `orchard` `grove` `forest` `slope` `pass` `riverbank` `rocky` `sand` `snowfield` `shore`)を 4E-1 で足す。data の追加で、save には入らない
- land は両端で書かれている(A 側の 6 段と B 側の 6 段)。逆順にして一致するのは 3〜6 / 6 段。**corridor では A 側を前半(段 1〜3)、B 側の逆順を後半(段 4〜6)に使う**(両側の言葉を活かす。どちら向きに歩いても同じ段の並びになる)

### 4.2 player state

| 案 | 正本 | 評価 |
|---|---|---|
| A. `region + local` だけ | corridor 中も A か B の local | × corridor は A でも B でもない。どちらの collision grid にも乗らない |
| **B. `connectionId + s + u`**(推奨、corridor 中だけ) | 弧長 s ∈ [0, walkLength]、横ずれ u ∈ [−halfWidth(s), +halfWidth(s)] | ◎ 帯の外へ出ない。t = s / walkLength で進み具合が一意 |
| C. `globalPosition` | global x/z | × §2.2 のとおり物理的な意味がない。chart の重なりで region を逆引きできない |

```
region 内:   { mode: 'region',   region, x, z, heading }                     ← 今のまま
corridor 中: { mode: 'corridor', connectionId, from, s, u, heading }         ← 新しい(メモリだけ。保存しない)
導出値:       corridor chart の x/z = curve(s) + normal(s)·u
              global = toGlobal(from, startPose) + Rot(frameYaw)·(x, z)      ← 表示・デバッグ用
              t = s / walkLength、stage = floor(t × 段数)
```

- 入力は今と同じ(カメラから見た向き)。前後の成分を ds、横の成分を du にする(帯の接線と法線に分ける)
- 引き返し: s は減ってもよい(§11.4)

---

## 5. geometry

### 5.1 曲線の比較

| 方式 | 総回転を指定できる | 長さを指定できる | 曲率の連続 | 評価 |
|---|---|---|---|---|
| Bezier(3 次 1 本) | △(端の接線だけ) | × 弧長は数値積分。178° だとループやとがりが出やすい | × | × |
| Catmull-Rom | △ | × | △ | × 通る点(位置)が要るが、§2.2 のとおり正しい位置がない |
| multi-stage spline(Bezier / CR を段ごと) | △ | △ | △ | △ 段ごとに位置を決める必要が残る |
| **段ごとの曲率スプライン**(推奨) | **◎ 段ごとに曲がる量を直接持つ** | **◎ 作り方から正確** | **◎ 台形の曲率で連続** | **◎** |

**段ごとの曲率スプライン**: 向き θ(s) = frameYaw + ∫κ(s)ds。κ は段ごとの台形(はしの 20% で 0 から上げ下げする)。位置は θ を積分して出す(1 本 64 点を最初の 1 回だけ作ってとっておく。毎フレームは作らない)。

### 5.2 land 6 段を checkpoint に

- 段の境目 s_i = i × 450 を **意味の checkpoint** にする(ヒント行の「【はたけ】」、地面の種類、遠景の blend、先読みのきっかけ)
- **段 1 の前半と段 6 の後半は直線**(出口の向きのまま)。出口が見えている範囲で曲がらない = handoff の向きが正確にそろう
- 曲がりは段 1 の後半〜段 6 の前半(5 段 = 2250)に割り当てる。割り当ては等分を基本にし、`pass`(峠)・`slope`(坂)の段を少し多めにする

### 5.3 walkLength(歩く長さ)と travelLength(意味の長さ)

| 長さ | 値 | 何に使う |
|---|---|---|
| `physicalGap` | 4.6〜83.9 | 使わない(closure の残り。§2.2) |
| `travelLength`(今のまま) | 段 × 1600 = 8000 / 9600 | **意味の長さ・graph の cost・ルート探し**(`findRegionRoute`) |
| **`walkLength`**(新) | **段 × 450 = 2250 / 2700** | **歩く距離の正本**(s の範囲・collision・時間) |

- 450 の根拠: 初回に歩く時間が **8.7〜10.4 秒** = home を端から端まで歩くくらい(11.5 秒)。region の横断(25〜35 秒)より短く、今の walk transition(1.25 秒)の約 8 倍
- 再訪は形を変えず、**歩く速さを 1.4 倍**(6.2〜7.4 秒)。今の `TRANSITION.repeat = 0.62` と同じ考え(形を変えると同じ道の長さが変わってしまう)

### 5.4 曲がりの速さ(酔いにくさ)

曲がりを 5 段(2250)に台形で割り当て、道の上を歩く(260/s)とき:

| corridor | 総回転 | 平均 °/s | 最大 °/s | 最小半径 |
|---|---:|---:|---:|---:|
| `home|river_lake` | 43° | 5.0 | 6.2 | 2398 |
| `desert|mountain` | −49° | 5.7 | 7.1 | 2105 |
| `city|desert` | −60° | 6.9 | 8.7 | 1719 |
| `home|forest` | 75° | 8.7 | 10.8 | 1375 |
| `snow|mountain` | 131° | 15.1 | 18.9 | 787 |
| `forest|mountain` | 156° | 18.0 | 22.5 | 661 |
| `city|sea` | −162° | 18.7 | 23.4 | 637 |
| `mountain|river_lake` | 172° | 19.9 | 24.8 | 600 |
| `city|countryside` | −173° | 20.0 | 25.0 | 596 |
| `countryside|forest` | 178° | 25.7 | 32.1 | 464 |

- カメラの回る速さの上限は今 `turnRate = 1.9 rad/s ≒ 109°/s`。これより十分遅い
- **目安: 最大 30°/s 以下。** 超えるのは `countryside|forest`(5 段で U ターン)だけ。4E-4 で曲がりを 5 段全部に広げるか、再訪の 1.4 倍をこの 1 本だけかけない
- 最小半径 464 > 帯の半幅(最大 260)なので、内側の端が自分と重ならない

### 5.5 幅(semantic な幅クラス)

既存の `PATH_HALF`(wide 170 / path 120 / narrow 75 / secret 60)は「道の通行帯」。corridor の帯は **道 + 路肩(歩ける範囲)**。

| クラス | 半幅(歩ける範囲) | 道の半幅(描く) | 使う段 |
|---|---:|---:|---|
| `road`(街道) | 260 | 170 | `town` `field` `orchard` |
| `trail`(小道) | 190 | 120 | `grove` `forest` `riverbank` `sand` `shore` |
| `pass`(峠道) | 130 | 75 | `pass` `slope` `rocky` `snowfield` |

- 一本道すぎないが、region ほど自由には歩けない
- 段の境目で幅は 1 段の 20% をかけてなめらかに変える

---

## 6. coordinate handoff(変換の約束)

### 6.1 出口(region A → corridor)

```
① gate の判定は今のまま(resolveGate。出口の spot に入って、出る向きに動いている)
② startPose = { A の出口 spot の local 位置, A.leave の local の向き }
③ player の local の、spot 中心からの差 d を startPose の向きで分ける:
     s0 = max(0, d · leave_local)             (前に出たぶん)
     u0 = clamp(d · right_local, ±halfWidth(0))
④ yaw: corridor chart の yaw = camera.yaw(local)− localHeading(startPose)
       (global では yawToGlobal(A, camera.yaw) − frameYaw。どちらも同じ値)
⑤ global は通らない(位置)。向きだけ REGION_FRAME の yaw でつながる
```

### 6.2 到着(corridor → region B)

```
① s ≥ walkLength になったら
② endPose = { B の入口 spot の local 位置, −B.leave の local の向き }
③ B の local = endPose の位置 + enter_local × (s − walkLength) + right_local × u
   → spot の半径の中に clamp → resolveObstacles(今の enterRegion と同じ)
④ heading / camera.yaw = yawToLocal(B, 今の global yaw)
   corridor の総回転が曲がる量と一致するので、これは enterFacing(= −B.leave)と誤差なく一致する
⑤ gateLock = B の入口 spot(今のまま。着いた瞬間に戻されない)
```

### 6.3 引き返し(corridor → region A)

s ≤ 0 になったら、§6.2 と同じ手順を **A の startPose の向きを逆にして**行う(入る向き = −A.leave)。`state.regionId` は A のままなので、`enterRegionByMove` は呼ばない。

### 6.4 tolerance(closure 最大 83.9 の吸収)

| 方式 | 何が起きるか | 評価 |
|---|---|---|
| snap(global 位置から B の spot へ飛ぶ) | 最大 84 の瞬間移動が見える | × |
| blend(数十 frame で位置を寄せる) | 2 つの座標系を同時に持つ。collision が 2 重 | × |
| 短い approach(暗転の中で寄せる) | 見えないが、暗転が要る | △ |
| **pose 合わせ**(推奨) | **global 位置を使わないので、誤差そのものが入らない** | ◎ |

**向き**は REGION_FRAME の yaw で厳密につながる。遠景(DistantFeature)と backdrop 帯は global yaw で描くので、handoff の前後で **1° も跳ばない**(4D-2c の成果がそのまま効く)。

---

## 7. collision

### 7.1 分離

| 場所 | collision | 持つもの |
|---|---|---|
| region 内 | **今の local collision**(`moveWithCollision(pt, nx, nz, world)`・grid 360) | 変えない |
| corridor 中 | **corridor 専用の簡単な collision** | 帯の境界 + 障害物 24 個まで |
| global | **作らない**(4A X3 のまま) | — |

**同時に両方を持たない。** handoff の frame で切り替える(region の world を持っていない間は、region の collision もない)。

### 7.2 corridor の collision

- **左右の境界**: |u| ≤ halfWidth(s) − bodyRadius(22)。はみ出したら u を clamp(横にすべる。前には進める)
- **簡単な障害物**: 段の地面の種類から、決まった seed で置く円(岩・木の根元・柵の杭)。**帯のはし側だけ**に置き、道の通行帯(道の半幅 + `COLL_CLEAR` 26)には置かない。1 本 24 個まで、段ごとに分けて探す(grid は要らない)
- **terrain edge**: 川原・崖などは境界の形(halfWidth(s) を狭める)で表す。水に入れる判定は持たない
- **special passage boundary**: 不要(special は corridor にならない)
- region の数百個の collider は持ちこまない

---

## 8. streaming

### 8.1 corridor 中に持つもの

| もの | 大きさ | いつ |
|---|---|---|
| CorridorSegment(曲線 64 点・段・幅・障害物) | 数 KB | corridor に入るとき(`worldCorridors()` と同じくとっておく) |
| 地面の帯と両脇の飾り(段の種類から生成) | 150 個まで | corridor に入るとき |
| 出発側の遠景 metadata(`visibleDistant(A)`) | 3 個まで | すでにある |
| 到着側の遠景 metadata(`visibleDistant(B)`) | 3 個まで | corridor に入るとき(計算 < 1ms) |
| region の world(`buildWorld`) | 1 region 分 | **§9 のとおり** |

**到着 region の full `buildWorld()` は到着直前まで呼ばない。**

### 8.2 遠景と backdrop の blend

- **遠景(DistantFeature)**: t < 0.4 は A 側のリスト、0.4〜0.6 は両方(alpha で入れかえ、合わせて 3 個まで)、t > 0.6 は B 側
  - B 側のリストには「A の方角の遠景」が入るので、**振り返ると出発地が見える**
  - どちらも global yaw で投影する(4D のまま)
- **backdrop 帯**: t < 0.4 は A の種類、0.4〜0.6 は 2 本を crossfade、t > 0.6 は B の種類
  - crossfade の間だけ帯の描画が 2 本になる(+40 命令ほど。corridor の 20% の区間だけ)
- 空・時間・天気は今の `view.env` のまま(corridor で変えない)

---

## 9. preload / unload

### 9.1 unload(出発 region をいつ捨てるか)

| 時点 | 引き返し | メモリ | 評価 |
|---|---|---|---|
| corridor 開始直後(t = 0) | 引き返すたびに A を作りなおす(暗転) | 最小 | △ |
| **t ≥ 0.25(段 1 と半分)** | すぐ引き返すなら A はまだある。暗転なしで戻れる | 短い間だけ A + corridor | **◎ 推奨** |
| 中盤(t ≥ 0.5) | 半分まで暗転なし | A を長く持つ | △ |
| 到着直前 | ずっと暗転なし | A + B + corridor が重なる | × |

- 捨てる = `world` の参照を切るだけ(住民 AI は corridor 中は動かさない)
- t < 0.25 の間、A の住民は止める(corridor 中は region の sim を進めない)

### 9.2 preload(到着 region をいつ作るか)

| 時点 | 引っかかり | 評価 |
|---|---|---|
| **到着の handoff(暗転の中)** | `buildWorld` の 9.5〜95ms(デスクトップ)を暗転 0.25〜0.35 秒で隠す = **今の walk の cross(0.30 秒)と同じ** | **◎ 4E-2 はこれ** |
| t ≈ 0.7 で一気に作る | 歩いている最中に 1 frame 止まる(forest ならデスクトップで 95ms、iPhone ではその数倍) | × |
| t ≈ 0.6〜0.9 で分けて作る(1 frame 4ms まで) | 止まらない。**暗転なしの到着ができる** | ○ **4E-3 で試す**(`buildWorld` を段階に分ける作業が要る) |
| corridor 開始時 | A + B を同時に持つ | × |

**4E-2 の結論: 「到着の handoff で作る」。** 4E-3 で iPhone の `buildWorld` の実測を見て、暗転が目立つなら分割先読みに進む。

### 9.3 暗転なしの到着(4E-3 の目標)

B を先に作っておけば、corridor の最後の 1 段で **B の出口まわりを endPose に合わせて描ける**(案 B′ の手法。B の local を「endPose → corridor の終点」の剛体変換で corridor chart に置く)。
その間も collision は corridor のものだけを使う。B の collision に切り替えるのは s ≥ walkLength の frame。

---

## 10. save / reload

### 10.1 比較

| 案 | 途中でアプリが終わったら | save の変更 | 評価 |
|---|---|---|---|
| **① 出発 region に戻す**(推奨) | `state.regionId` = A のまま → 次は A の `world.entry` から | **なし** | ◎ |
| ② 到着側に寄せる(t ≥ 0.5 で regionId を B に) | B から再開 | なし。ただし「B の出口 spot を見つけていないのに B にいる」状態ができ、みちの発見(`worldLinksFrom`)とずれる | △ |
| ③ corridor state を保存 | corridor の途中から再開 | **schema 変更**(`meguru.corridor = { id, s, u }`)。旧セーブ・migration・reload 直後の描画準備が要る | × 今回はしない |

### 10.2 最終推奨(4E 実装前に確定する約束)

1. **corridor の状態(connectionId / s / u)は保存しない。** メモリだけ
2. **`S.enterRegionByMove(B)` を呼ぶのは到着の handoff の 1 回だけ**(今は `cross` の頭)。これが唯一の「commit」
3. corridor の途中で reload・アプリ終了・バックグラウンドで終了した場合は、**出発 region の `world.entry` から再開**する
   - 今も reload は `world.entry` から始まる(出口の spot からではない)ので、体験は今の transition 途中の reload と同じ
4. corridor の途中で save が走っても(`saveState()` は発見・会話のたびに走る)、書かれるのは A のまま。**半端な状態は保存されない**
5. corridor 中は発見が起きない(§12.3)ので、途中の save で失うものはない
6. 実装の注意: `frameFn` の「`state.regionId !== sim.world.regionId` なら `enterWorld`」は、corridor 中は **比べない**(corridor chart の id は region id ではない)

---

## 11. UI

### 11.1 corridor 中のボタン

| ボタン | corridor 中 | 理由 |
|---|---|---|
| pad | **使える** | 歩く・引き返す・左右 |
| はなす / のる(1 枠) | 出さない | 住民がいない。のりばもない |
| たび | **使えない**(transition 中と同じ `disabled`) | corridor から `travelToRegion()` が走ると、regionId の commit が 2 つになる |
| ちず | **使えない**(4E-2)→ 4E-4 で **世界地図だけ**開ける | region の地図は corridor に当てはまらない。世界地図なら「いま ○○ と △△ の あいだ」を出せる |
| もどる | **使える** | めぐるを出るだけ。save は A のまま(§10)。出られない方が困る |

### 11.2 「もどる」の比較(§46)

| 案 | 評価 |
|---|---|
| **A. 出発 region に戻す** = めぐるを出る。次に入ると A | **◎ 推奨**。今の「もどる」(`stop()`)の意味のまま、結果が A になる |
| B. home へ戻す | × 「もどる」はめぐるを出る操作で、home 地域へ行く操作ではない |
| C. 無効 | × 出る手段がなくなる |

### 11.3 表示

- ヒント行(`mgrHint`、既存)に **いまの段の言葉**: `【はたけ】もりの ほうへ`。新しい DOM は足さない
- 着いた帯: 今の transition と同じ(初回は「はじめての もり」、2 回目からは小さく地域名)

### 11.4 引き返し(§43)

できる。pad を後ろへ入れれば s が減る。s ≤ 0 で A の出口 spot へ戻る(§6.3)。
**corridor の途中で分かれ道は作らない**(§44)。次の connection は region に着いてから選ぶ。

### 11.5 route guidance(§37)

`findRegionRoute()` は region id の graph なので、corridor の中では使いみちがない(分かれ道がない)。
region にいるときに「○○へは この出口」と出す用途は 4E のあと(自動移動もしない)。

---

## 12. party / resident

### 12.1 resident

- **corridor に住民は出さない。** resident registry から corridor へ新しい住民を置かない
- 地域間を動く住民(4A R4)は **4E でも不要**。corridor は 10 秒前後で、住民の生活 AI を動かす場所ではない

### 12.2 party(なかま・こいびと)

- corridor 中もいっしょに歩く。**`followParty` は corridor chart の x/z と camera.yaw でそのまま動く**(corridor chart も平面なので、今の式が使える)
- 帯の外に出ないよう、party も u を clamp する
- handoff では party の位置を player の後ろに並べなおす(今の `enterRegion` の `companionsOf` と同じ)

### 12.3 encounter / discoveries

| | 4E-1〜4E-3 | 4E-4 以降 |
|---|---|---|
| encounter(住民・item・event) | **出さない**(保留) | 必要なら検討 |
| 発見(段・道・landmark) | **追加しない**。corridor 中は spot / zone / path / mark の event が起きない | 「歩いた corridor」を記録するなら save の追加が要るので別 phase |
| 世界地図 | **今の connection 発見のまま**。B の入口 spot に着いた時点でその spot が発見され、`worldLinksFrom` で みち が開く(今と同じ規則) | corridor を線で描くのは 4E-4 で検討(表示だけ) |

---

## 13. special connection

| connection | kind | 4E |
|---|---|---|
| `jungle|sea` | sea(ふね) | **今の transition(sail)のまま**。外洋 7998 を歩かせない |
| `countryside|star_stop` | vertical(ゴンドラ) | **今の transition(up / down)のまま**。layer をまたぐ |
| `deepsea|sea` | vertical(もぐる) | **今の transition(up / down)のまま**。layer をまたぐ |
| memory_lake | frame なし | **対象外**。通常の corridor を作らない。今の特別な入口のまま |

- corridor にするのは **walk 10 本だけ**。判定は `CorridorSegment.eligible`(walk・両端 ground・frame あり)1 か所に集める
- テストで「special 3 本と memory_lake は eligible にならない」を縛る(誤って混ざらないように)

---

## 14. performance

### 14.1 PoC(4E-2)の性能基準案(実測が前提)

| 項目 | 基準 |
|---|---|
| rAF(CPU 4 倍、390×844 / 360×640) | corridor 中の p95 が **home の同条件 +4ms 以内** |
| 2D 命令 / frame | corridor 中は **region の平均(約 1,100)以下**。handoff の frame は +100 以内 |
| `buildWorld` の山 | 到着の handoff で **デスクトップ 100ms 以下**(forest 95ms)。暗転 0.35 秒の中に収まる。iPhone の実測は 4E-2 で取る |
| メモリ | corridor 本体 **200KB 以下**。同時に持つ region world は 1 つ(t < 0.25 の間だけ A + corridor) |
| corridor の中身 | 飾り 150 個まで、collider 24 個まで |
| 暗転 | handoff 1 回 **0.35 秒以下**(今の walk の cross 0.30 秒と同程度) |

### 14.2 perfTier(§33)

| tier | corridor | 理由 |
|---|---|---|
| 0(ふつう) | **continuous corridor** | |
| 1(やや重い) | **continuous corridor**(飾り 0.6 倍・遠景 2 個まで) | 今の `TRANSITION.density` と同じ減らしかた |
| 2(重い・`halfRate`) | **今の transition** | 描画が 2 frame に 1 回の端末で長い前進移動は見づらい |

- corridor 中に重くなっても **途中で切り替えない**(歩いている途中の切り替えの方が不快)。そのセッションの次の出口から transition にする

### 14.3 iPhone(390×844 / 375×667 / 360×640)

- canvas は 390×844 で 338×533、360×640 で 322×359
- **遠くまで見えすぎない**ように、帯は **前方 1200(約 2.7 段)まで**描き、その先は霧で消す。曲線なので先は自然に隠れる
- ヒント行・パッド・もどる の位置は変えない(4B〜4D と同じ layout の確認をする)

---

## 15. reduced motion / 酔いにくさ

| 対策 | 内容 |
|---|---|
| **reduced motion** | **既定は今の transition へ fallback**(`TRANSITION.reduced = 0.45`)。酔いやすさを優先 |
| 体の上下の揺れ | corridor 中は `camFx.bob = 0` |
| 急な向き | 曲がりは台形の曲率で、最大 30°/s 以下(§5.4)。止まっている間は向きを変えない(今と同じ) |
| 長さ | 初回 10.4 秒以下、再訪 7.4 秒以下 |
| 加速 | 今の歩く速さのまま。corridor 専用の加速はしない |
| 遠景 | 4D のまま(reduced motion では横ずれ 3 割・明滅なし) |

---

## 16. fallback

**いつでも今の transition に戻れることを守ります。** `TRANSITION` の data と `transitionPlan()` は変えません。

### 16.1 選び方(1 か所)

```
corridorMode(gate) =
  gate が CorridorSegment.eligible でない            → 'transition'
  PoC の許可リストに入っていない(4E-2 は home|forest だけ) → 'transition'
  reduced motion                                    → 'transition'
  perfTier ≥ 2 / このセッションで重かった               → 'transition'
  このセッションで corridor が失敗した                  → 'transition'
  それ以外                                           → 'corridor'
```

### 16.2 transition の段の変えかた(§31)

| 今(transition) | continuous(corridor) |
|---|---|
| approach(0.35s、見えなくなっていく) | **approach**(出口の spot で 0.2 秒。暗転は 4E-2 だけ) |
| cross(0.30s、ここで世界を入れかえ) | **corridor walk**(歩いた時間だけ。cross を連続移動に置きかえる) |
| arrive(0.35s、見えてくる) | **arrive**(到着の handoff。4E-2 は暗転 0.35 秒の中で `buildWorld`) |
| settle(0.25s、ここで操作を戻す) | **settle**(同じ) |

- 音の cue(step / pop)も同じ位置で鳴らす
- `enterRegionByMove` の位置だけが変わる(cross の頭 → arrive の頭)

### 16.3 failure mode(§59)

| 起きること | 対処 |
|---|---|
| 到着の `buildWorld(B)` が例外 | regionId はまだ A なので、**A を作りなおして A の出口 spot へ戻す**。その corridor はこのセッションでは transition にする |
| 先読み(4E-3)が間に合わない | 到着で待つ(暗転を延ばす。上限 1 秒)。超えたら同期で作る |
| corridor の途中で reload | §10: A の `world.entry` から。save に半端な状態はない |
| 低性能端末 | tier 2 は最初から transition。途中で重くなったら次から transition |
| special の誤混入 | `eligible` 1 か所で判定 + テストで縛る。special の gate は corridor を作れない(`CorridorSegment` が null) |
| メニュー(たび など)が開いた | 今と同じく sim を止める(`S.menuOpen()`)。corridor も止まる |
| 画面の回転・サイズ変更 | 今の `layoutCanvas()` のまま。corridor の描画は W / H から計算する |

---

## 17. PoC 候補

### 17.1 比較(walk 10 本)

| corridor | 総回転 | 段 | B の `buildWorld` | 両側の land が逆順で一致 | 出口 spot の出口数 | 評価 |
|---|---:|---:|---:|---:|---|---|
| **`home|forest`** | 75° | 6 | forest 95.0ms(最重の地上) | 4 / 6 | home.bigtree 2(もり / かわ) | **◎ 推奨** |
| `home|river_lake` | 43° | 6 | river_lake 56.2ms | 3 / 6 | home.bigtree 2 | ○ 次点(曲がりが最も小さい) |
| `city|desert` | −60° | 6 | desert 37.9ms | 6 / 6 | 1 | △ 景色の変化が大きい(まち → さばく) |
| `desert|mountain` | −49° | 6 | mountain 61.9ms | 6 / 6 | 1 | △ 高さの印象が強い |
| `snow|mountain` | 131° | 6 | mountain 61.9ms | 5 / 6 | 1 | × 長距離・高低差(避ける) |
| `countryside|forest` | 178° | 5 | forest 95.0ms | 3 / 6 | 1 | × U ターン(最大 32°/s) |
| `city|sea` / `city|countryside` / `mountain|river_lake` / `forest|mountain` | 156〜173° | 6 | — | — | 1 | × ほぼ U ターン |

### 17.2 推奨: `home|forest`

- 生活圏。いちばん最初に歩く人が多い、ふつうの徒歩の出口
- 景色の筋が分かりやすい: いえなみの はずれ → はたけ → かじゅえん → ざつぼくりん → きが ふえる → もりの いりぐち
- 曲がりは 75°(最大 10.8°/s)で、U ターンにならない
- **到着の `buildWorld` がいちばん重い地上 region(forest 95ms)** なので、handoff の暗転が iPhone で足りるかを最初に確かめられる(いちばん悪い場合を先に見る)
- home.bigtree は出口が 2 つ(もり / かわ)ある spot なので、`resolveGate` と corridor 判定の組み合わせも最初に確かめられる
- 逆向き(forest → home)は home が軽い(9.5ms)ので、往復で重い側と軽い側を両方見られる

次点の `home|river_lake` は、4E-4 で 2 本目として展開する(同じ bigtree を使う)。

---

## 18. Phase 4E の分割

| phase | 中身 | 画面の変化 | 終わりの条件 |
|---|---|---|---|
| **4E-1** corridor geometry / state | `CorridorSegment`(導出)・段ごとの曲率スプライン・`sampleCorridor(seg, s)`・handoff の純関数(`corridorEnter` / `corridorExit`)・`eligible`・land の地面タグ(data 追加)。**だれにも使われない**(4B / 4C / 4D-1 と同じ remove-it テストで縛る) | なし | 形・長さ・向きのつながり・handoff の約束がテストで決まる |
| **4E-2** 1 本だけ Canvas PoC | `home|forest` だけ corridor を歩ける。帯・飾り・遠景の blend・party・collision(帯 + 24 個)・引き返し・fallback。handoff は暗転 0.35 秒 | `home|forest` だけ | §20 の受け入れ基準 |
| **4E-3** streaming / preload | `buildWorld` を段に分けて t ≈ 0.6〜0.9 で先読み、暗転なしの到着(§9.3)、出発 region の保持と破棄、iPhone 実測 | 到着が暗転なしになる | 引っかかりなし・メモリ基準内 |
| **4E-4** 複数 corridor へ展開 | walk 10 本(`countryside|forest` の曲がり調整を含む)、再訪 1.4 倍、tier 1 の間引き、世界地図だけ開ける、corridor の線を世界地図に描くか検討 | walk 10 本 | 10 本 × 往復 × 3 画面で同じ基準 |

**完成までの残り**: 4E-1〜4E-4 の **4 段階**で「walk の connection はすべて歩いてつながる」状態になる。
地域間を動く住民・global collision・Three.js は、そのあとに必要かどうかを改めて決める(今の見込みでは どれも不要)。

---

## 19. テスト

### 19.1 設計段階で決めるテスト方法

| 対象 | 方法(Node の harness が中心、実画面は Playwright) |
|---|---|
| 座標 handoff | 10 本 × 両向きで、出口の pose → corridor(s=0)→ 終点(s=L)→ 入口の pose。**向きの差 < 0.5°**、位置は spot 半径の中、`resolveObstacles` 後にめりこみなし |
| t の進み | 前へ入力 → s が増える。t = s / walkLength。段の境目で段の番号が 1 つずつ変わる |
| 引き返し | 途中で後ろへ → s が減る → s ≤ 0 で A の出口 spot。`enterRegionByMove` が **呼ばれない** |
| reload | corridor の途中で save を読みなおす → `state.regionId` = A、**save に corridor の痕跡なし**(今の「セーブに ○○ の あとかたなし」テストと同じ形) |
| collision の切り替え | corridor 中は region の collider に当たらない / 帯から出ない。region に戻ったら region の collider に当たる。**同時に 2 つを持たない**(world が null であることを確かめる) |
| party | corridor 中も party の人数が同じ・帯の中・player の後ろ |
| save | 往復したあと、save の key が今と同じ(schemaVersion 5 のまま、新しい key なし) |
| fallback | reduced motion / tier 2 / 許可リスト外 / special 3 本 / memory_lake で `corridorMode` = 'transition' |
| perf tier | tier 1 で飾りが 0.6 倍、tier 2 で corridor を作らない |
| reduced motion | 既定で transition。corridor を許すときも bob 0・向きの速さ上限 |
| 失敗 | `buildWorld` に例外を注入 → A に戻る・次から transition |
| iPhone | 3 サイズ × `home|forest` 往復で、はみ出し 0・JS エラー 0・layout が今と一致(Playwright。4B〜4D の layout スクリプトを使う) |
| 性能 | 4D と同じ A/B ベンチ(CPU 4 倍・DPR 3)。corridor 中と region 中の rAF・2D 命令・handoff の山 |
| remove-it | 4E-1 の data を消しても、ゲームの動き・世界地図・分母・save の指紋が変わらない |

### 19.2 変えないことを縛るテスト

- `travelToRegion()` の結果(たびの費用・記録・ライフログ)が同じ
- special 3 本の transition の plan(phase・span)が同じ
- DistantFeature 37・corridor 13・分母が同じ

---

## 20. 受け入れ基準(Phase 4E-2 PoC の成功条件)

1. `home|forest` を **往復** continuous walk できる(home → forest、forest → home)
2. region ↔ corridor の handoff で、**向きの跳び < 0.5°**・位置は出口 spot の中・めりこみなし
3. 途中で **引き返せる**(A の出口に戻る。regionId は変わらない)
4. **save / reload が安全**: 途中の reload で A から再開。save に corridor の痕跡がない。schema は同じ
5. **UI が壊れない**: たび・ちず は使えない、もどる は使える、3 サイズで layout が今と一致、はみ出し 0、JS エラー 0
6. **今の transition へ fallback できる**(reduced motion・tier 2・許可リスト外・失敗)
7. **性能基準内**(§14.1)
8. **reduced motion が正常**(既定で transition)
9. **`travelToRegion()` は変わらない**。special 3 本・memory_lake も変わらない
10. party がついてくる。住民は corridor に出ない

---

## 21. Three.js

**Phase 4E でも不要です。**

- corridor の中身は「曲がった帯 + 両脇の飾り 150 個まで + 遠景」。今の Canvas の擬似 3D(地面・props・遠景レイヤー)で描ける量
- 4D で遠景を Canvas だけで描け、4D-2c で角度系もそろった
- Three.js を考えるのは、4E-2 / 4E-3 の実測で **Canvas が性能基準を超えた場合だけ**。そのときも `worldLayers` + `REGION_FRAME` + `CorridorSegment` を読む形にする(4A §14 の約束のまま)

---

## 22. 今回やっていないこと

- continuous walk の実装、`CorridorSegment` の data、corridor の描画
- global collision、resident の地域間移動
- save schema の変更、world map の変更
- Three.js
- コードの変更(この PR は文書だけ)

---

## 付録 A — 実測の再現

- `buildWorld` の時間: harness(`tests/helpers/runtime-harness.cjs`)で 13 地域を 4 回ずつ作り、2 回目以降の最小値
- 曲がる量: `worldCorridors()` の `ends[a].leave` と `ends[b].leave` を global の方位(0° = 北、時計まわり)にし、`heading(−B.leave) − heading(A.leave)` を ±180° にまとめる
- 弦の長さ: 一定曲率の円弧の弦 = 2L·sin(θ/2) / θ
- 曲がりの速さ: 5 段(2250)で台形(両はし 20%)に割り当て、260/s で歩くときの平均と最大
- land の一致: `ends[a].land` と `ends[b].land` の逆順を段ごとに比べた数

## 付録 B — 用語

| 言葉 | 意味 |
|---|---|
| chart | 1 つの local 平面(region 1 つ、または corridor 1 本)。アトラスの 1 ページ |
| pose | 位置 + 向き |
| handoff | chart を切り替える 1 frame |
| s / u | corridor の弧長と横ずれ |
| walkLength | corridor の歩く長さ(段 × 450) |
| travelLength | corridor の意味の長さ(段 × 1600。graph 用) |
| commit | `state.regionId` を書きかえる唯一の時点(到着の handoff) |

## 付録 C — 進みぐあい

| 段階 | 状態 | 記録 |
|---|---|---|
| 4E 設計 | 完了(#335、main `a564730`) | この文書 |
| 4E-1 corridor の形と状態(pure data) | **完了**(#336、main `6191f76`。PR 上の npm test 1266 / 1266、main の Home layout 緑。main の Runtime smoke は 1 回目 前からの ゆらぐ 2 本で赤 → 再実行で緑。4E-2 handoff §12) | [handoff](../handoff/meguru-phase4e1-corridor-geometry-2026-09-23.md) |
| 4E-2 home\|forest を Canvas で歩く PoC | **完了**(#337、main `13bd8bf`)。安定化・なかまの ならび・大人数の なかまを かるく えがく。判定: 採用 | [handoff](../handoff/meguru-phase4e2-home-forest-poc-2026-09-23.md) §15〜§17 |
| 4E-3 着く がわを とちゅうで 組む(preload) | **完了**(#338、main `f273748`。npm test 1318 / 1318、Runtime smoke・Home layout 緑)。home\|forest だけ。`buildWorldSteps` で 0.70 から わけて 組み、着いた ときに つかう。判定: 採用 | [handoff](../handoff/meguru-phase4e3-corridor-preload-2026-09-24.md) |
| 4E-4 Preflight(10 本 横断監査) | Draft PR(文書だけ)。10 本すべて いまの しくみで 歩けることを計測用コピーで確認。4E-4A / B / C に わける | [監査](meguru-phase4e4-preflight-audit-2026-09-24.md) |
| 4E-4 のこりの walk へ 広げる | まだ(監査 §22〜§25 の 順と 基準で) | |
