# Phase 4E-1 — あるける corridor の かたち と 状態(pure data)

日付: 2026-09-23 ／ 対象: `meguru.js` ／ 前提: [Phase 4E 設計](../design/meguru-phase4e-continuous-corridor-world-2026-09-23.md)(#335、main `a564730`)

**Phase 4E-1 は「まだ だれにも つかわれて いない pure data」です。**
player は corridor に入りません。renderer・simulation・UI・save・`travelToRegion()` は 1 行も変えていません。
4E-1 のブロックを消しても、ゲームの動き・世界地図・分母・save の形は 1 文字も変わりません(テスト 16)。

---

## 0. やったこと / やっていないこと

| | |
|---|---|
| **足したもの** | `walkCorridorSpecs()` ／ `walkCorridorSpec()` ／ `orientWalkCorridor()` ／ `corridorHeadingAt()` ／ `corridorStageAt()` ／ `corridorMode()` ／ `makeCorridorState()` ／ `corridorEnterState()` ／ `corridorExitPose()` ／ `CORRIDOR_STAGE_WALK` ／ `CORRIDOR_WIDTH` ／ `CORRIDOR_TERRAIN_WIDTH` ／ `CORRIDOR_STATE_KEYS` |
| **変えたファイル** | `meguru.js`(4D-1 ブロックのすぐ後ろに追加のみ + export)／ `tests/meguru-phase4e1-test.cjs`(新規 17 本)／ `tests/meguru-phase4b-test.cjs` `tests/meguru-phase4c-test.cjs` `tests/meguru-phase4d1-test.cjs`(「消しても変わらない」テストが 4E-1 の export もいっしょに消すように 1 か所ずつ)／ `package.json`(テスト登録)／ `index.html`(`npm run bump`) |
| **やっていない** | continuous walk ／ corridor の描画 ／ streaming の実運用 ／ global collision ／ resident の地域間移動 ／ save schema の変更 ／ Three.js |

---

## 1. 正本の順番(二重に持たない)

1. `WORLD_GEOGRAPHY.connections`(どこと どこがつながるか)
2. gate の意味データ(`gate.ends[region]` の出口 spot・向き・land)
3. Phase 4C の corridor(`worldCorridors()`: 出る向き `leave`(global)・段数・`travelLength`・`bend`)
4. **Phase 4E-1(これ)** — 上の 3 つから導出する

- land の言葉はコードに書かない。段の言葉は gate の land から読む(テスト 3 で縛る)
- 新しく持つのは **地面の種類の表 `CORRIDOR_TERRAIN`(10 本 × 段)だけ**。land の言葉を見て人が決めた 11 種の分類で、言葉は写さない。段数が land と違うと その corridor は作らない
- 4B の closure の残り(最大 83.9)は入らない。global の **位置** は使わず、global とは **向き(4C の `leave`)だけ**でつなぐ(テスト 11)

---

## 2. CorridorSpec(1 本の中身)

`walkCorridorSpecs()` の 1 つ。**a → b の向きで 1 つだけ**持ち、b → a は同じものを逆に使う(`orientWalkCorridor(spec, from)`)。

| key | 中身 |
|---|---|
| `connectionId` `a` `b` `fromRegion` `toRegion` `fromSpot` `toSpot` | 正本のまま(from = a、to = b) |
| `kind` `way` `layer` | `walk` / `walk` / `ground` |
| `stageCount` `stageLength` `walkLength` | 段の数(land と同じ)・450・段 × 450 |
| `travelLength` | 4C の意味の長さ(段 × 1600)。graph・ルート探し用。**歩く長さではない** |
| `stageCheckpoints` | 段の境目の t(0〜1)。段数 + 1 個 |
| `stages[]` | 段ごと: `terrain` `widthClass` `width` `halfWidth` `uMax` `edge` `edgeSoftness` `obstacleAllowance` `s0` `s1` `t0` `t1` `tCenter` `labels{a, b}` `headingDelta` |
| `widthClass` `nominalWidth` | corridor 全体の幅クラス(いちばん多いもの。同数なら狭いほう)と、その幅(world 単位) |
| `endpoints{a, b}` | 出口の pose(region-local): `spot` `x` `z` `r` `leaveLocal` `leaveHeadingLocal` `leaveHeadingGlobal` |
| `headingProfile` | `startGlobal`(a を出る方位)・`endGlobal`(b へ入る方位)・`turn`(符号つき、+ = 右まわり)・`bend`(4C)・`cumulative`(境目ごとの曲がった量)・`perStage` |
| `curveProfile` | 曲率の区間 5 つ(straight / rampIn / arc / rampOut / straight)。単位は 度 / world。空間の点は持たない |
| `turnClass` `turnFlags` | `gentle`(< 60°)/ `wide`(< 120°)/ `sharp`(< 160°)/ `uTurnLike`。`overTurnBudget`(初回 30°/s 超)・`overTurnBudgetRevisit` |
| `turnRate` `timing` | 曲がる速さの最大と平均(°/s)、所要時間(初回・再訪) |
| `collisionProfile` | 当たり判定の意味だけ(§6) |
| `terrainStages` | 段ごとの地面の種類 |
| `fallbackPolicy` | §7 |
| `reverseSymmetry` | `geometryShared` `labelsPerEnd` `headingMirrored` `landMatch`(両端の land が逆順で一致する段数) |
| `globalRef` | 両端の出口 spot の global 位置と `physicalGap`(**接続関係の参考だけ。形はこれに合わせない**) |

---

## 3. 10 本の一覧

歩く速さは `RULES.playerSpeed = 260`。再訪は速さ 1.4 倍(形は同じ)。

| corridor | 段 | walkLength | 初回 | 再訪 | 曲がる量 | bend | 分類 | 最大 °/s 初回 / 再訪 | 幅 | 地面(a → b) | 障害物上限 |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---:|
| `snow\|mountain` | 6 | 2700 | 10.4s | 7.4s | +131° | 131° | sharp | 18.9 / 26.4 | narrow | snow › snow › snow › rock › slope › ridge | 15 |
| `forest\|mountain` | 6 | 2700 | 10.4s | 7.4s | +156° | 156° | sharp | 22.5 / **31.5** | narrow | forest › forest › slope › rock › slope › ridge | 20 |
| `mountain\|river_lake` | 6 | 2700 | 10.4s | 7.4s | +172° | 172° | uTurnLike | 24.8 / **34.8** | normal | slope › river › rock › river › river › shore | 18 |
| `desert\|mountain` | 6 | 2700 | 10.4s | 7.4s | −49° | 49° | gentle | 7.1 / 10.0 | normal | dry › dry › dry › rock › dry › ridge | 14 |
| `countryside\|forest` | 5 | 2250 | 8.7s | 6.2s | +178° | 178° | uTurnLike | **32.1** / **44.9** | normal | urban-edge › field › slope › forest › forest | 16 |
| `home\|forest` | 6 | 2700 | 10.4s | 7.4s | +75° | 75° | wide | 10.9 / 15.2 | normal | urban-edge › field › field › forest › forest › forest | 19 |
| `home\|river_lake` | 6 | 2700 | 10.4s | 7.4s | +43° | 43° | gentle | 6.2 / 8.7 | narrow | urban-edge › field › slope › slope › river › shore | 16 |
| `city\|countryside` | 6 | 2700 | 10.4s | 7.4s | −173° | 173° | uTurnLike | 25.0 / **35.0** | narrow | urban-edge › field › slope › ridge › slope › field | 15 |
| `city\|sea` | 6 | 2700 | 10.4s | 7.4s | −162° | 162° | uTurnLike | 23.3 / **32.7** | normal | river › road › urban-edge › river › shore › shore | 14 |
| `city\|desert` | 6 | 2700 | 10.4s | 7.4s | −60° | 60° | wide | 8.7 / 12.2 | normal | urban-edge › dry › dry › road › dry › dry | 12 |

- **walkLength**: 2250(1 本)〜 2700(9 本)。設計の「段 × 450」どおり
- **所要時間**: 初回 **8.7〜10.4 秒**(設計値と一致)、再訪 **6.2〜7.4 秒**。最短 `countryside|forest`、最長 そのほか 9 本(同じ)
- **bend**: 43°〜178°(4C と一致。`|turn| = bend` をテストで確認)
- **最大の曲がる速さ**: 初回 **6.2〜32.1°/s**。めやす 30°/s を超えるのは `countryside|forest` だけ(`overTurnBudget`)。再訪 1.4 倍では 5 本が超える(`overTurnBudgetRevisit`)。**4E-1 では補正しない**(しるしだけ。直すのは 4E-4)
- 段ごとの曲がる量(`perStage`)の例 `home|forest`: 2.3 / 16.4 / 18.8 / 18.8 / 16.4 / 2.3(°)

### 内訳

| | |
|---|---|
| 幅クラス(corridor) | narrow 4 / normal 6 / wide 0 |
| 幅クラス(段 59) | narrow 20 / normal 25 / wide 14 |
| 地面の種類(段 59) | slope 9 / dry 8 / forest 7 / river 6 / urban-edge 6 / field 6 / rock 4 / ridge 4 / shore 4 / snow 3 / road 2 |
| 曲がりの分類 | gentle 2 / wide 2 / sharp 2 / uTurnLike 4 |

---

## 4. 形の持ちかた(curve / heading profile)

- **進行方向の変化(曲率)で持つ。** Bezier / Catmull-Rom の空間点は作らない(設計 §5.1)
- 曲がる区間: 段 1 の後ろ半分 〜 最後の段の前半分(= `(段 − 1) × 450`)。**出口の近く(はじめと終わりの半段)はまっすぐ**なので、handoff の向きが正確にそろう
- 曲率は台形(曲がる区間の両はし 2 割で 0 から上げ下げ)。向きは連続で、とびがない(テスト 5 で 5 world ごとに確認)
- `corridorHeadingAt(spec, from, s)` = s での進む方位(global、度)。b から歩くときは同じ曲線を逆にたどる(`heading_b(s) = heading_a(L − s) + 180°`)

### checkpoint(§9 の答え)

**段の区間方式**にしました: 段 i は t ∈ [i/N, (i+1)/N](s ∈ [450i, 450(i+1)])。
`stageCheckpoints` は境目の t(0, 1/6, 2/6, …, 1)。

- 0.0 / 0.2 / … / 1.0 の **点** 方式(6 点 = 区間 5 つ)だと、1 区間が 540 になり「段 × 450」と合わない
- 区間方式なら、land の 1 段 = 450 の帯 = ヒント行の言葉が 1 つ、がそのまま対応する
- `tCenter` も持つ(段の真ん中。遠景の blend などで使う)

---

## 5. 幅(§14〜§16)

| クラス | 幅(歩ける帯全体、world) | 半幅 | u の上限(半幅 − からだ 22) | 帯のはしのやわらかさ | 地面 |
|---|---:|---:|---:|---:|---|
| `wide` | 520 | 260 | 238 | 60 | road / urban-edge / field |
| `normal` | 380 | 190 | 168 | 40 | forest / river / shore / dry |
| `narrow` | 260 | 130 | 108 | 24 | slope / ridge / rock / snow |

- px ではなく world 単位
- **u(横ずれ)の許容範囲は幅から導出**: `|u| ≤ uMax(段)`。`makeCorridorState` が clamp する(テスト 7)
- いちばんきつい曲がりの半径(464)は どの帯の半幅(最大 260)よりも大きい = 帯の内側のはしが自分と重ならない

---

## 6. collisionProfile(意味だけ。§17〜§18)

| key | 意味 |
|---|---|
| `kind: 'band'` `boundary: 'left-right'` | 左右の境界だけ。u の大きさ ≤ uMax |
| `halfWidth[]` `uMax[]` | 段ごと |
| `edge[]` | 帯のはしの意味: `open` / `fence` / `trees` / `water` / `drop` / `wall` |
| `edgeSoftness[]` | はしで横の動きをやわらげる幅 |
| `obstacles: 'edges-only'` | 障害物は帯のはしだけ(道の通行帯には置かない) |
| `maxObstacleCount` | 段ごとの めやす(forest・rock 4、slope・river・urban-edge 3、…、road 1)の合計。**上限 24** |
| `regionColliders: false` | region の COLLIDER / collision grid は持ちこまない |

- **実物の障害物は置かない**(4E-2 で置く)
- 上限 24 の再評価: 実際の合計は **12〜20**。region の collider の密度(home 75 個 / 約 6.9M、forest 469 個 / 約 45.8M)を corridor の面積(2700 × 380 ≒ 1.0M)に当てはめると **約 11 個**。24 は その 2 倍の天井として妥当なので残す

---

## 7. fallbackPolicy と `corridorMode()`(§29〜§31)

各 spec の `fallbackPolicy`:

| key | 値 |
|---|---|
| `continuousAllowed` | `true`(walk 10 本は形として連続化できる。**実際に許すのは 4E-2 で許可リスト 1 本**) |
| `maxPerfTier` | `1`(tier 0 / 1 は corridor の候補、tier 2 は今の transition。tier は重い端末ほど大きい数なので「上限」で持つ) |
| `reducedMotionFallback` | `'transition'` |
| `buildFailureFallback` | `'returnToFrom'`(到着 region が作れなければ出発 region の出口へ戻す) |
| `perfDropFallback` | `'transitionFromNextGate'`(歩いている途中では切り替えない。次の出口から transition) |
| `revisitSpeedMultiplier` | `1.4` |

`corridorMode(spec, opts)` → `{ mode: 'corridor' | 'transition', reason }`。`reason` は `not-walk` / `not-allowed` / `reduced-motion` / `perf-tier` / `perf-drop` / `build-failure` / `null`。
**special(ふね・ゴンドラ・もぐる)は spec を持たないので、いつでも `not-walk` → transition**(テスト 1・12)。

---

## 8. CorridorState と handoff(§21〜§27)

### CorridorState(保存しない)

`CORRIDOR_STATE_KEYS` = `connectionId` `fromRegion` `toRegion` `s` `u` `direction` `speedMultiplier` `firstVisit` `fallback`

- `s`: from の出口からの **実距離**(0〜walkLength)。t = s / walkLength は導出
- `u`: 横ずれ(world)。進む向きの右が +
- `direction`: `forward`(a → b)/ `reverse`(b → a)。**形は 1 つを逆に使う**
- `speedMultiplier`: 初回 1、再訪 1.4。**firstVisit で形は変わらない**
- `fallback`: `corridorMode` の理由(corridor にするなら `null`)

### handoff の約束(純関数。まだ本番では使わない)

```
出口: corridorEnterState(spec, from, localPoint)
  出口 spot の中心 c、出る向き l(local)、その右 r = (l.z, −l.x)
  s = max(0, (p − c)·l)、u = (p − c)·r  → makeCorridorState(clamp つき)

到着 / 戻る: corridorExitPose(spec, state)
  s ≥ walkLength: to の入口 spot。位置 = c_to + e·(s − L) + r_e·u(e = −leave_to、spot の半径 − 22 の中に clamp)
                  向き = e。arrived = true、commit = true(ここだけが regionId を書きかえてよい時点)
  s ≤ 0        : from の出口 spot。位置 = c_from + l·s + r·u。向き = −l。arrived = false、commit = false
  途中          : null
```

- **global の位置は通らない**。位置は spot の local 座標そのもの(着いた位置 = 入口 spot の中心、ずれ 0)
- **向きは global でつながる**: `yawToGlobal(to, 着いた向き)` と `corridorHeadingAt(from, L)` の差は 0.5° 未満(実測の最大 2.3e-13°。20 通り = 10 本 × 両向き × 出口と到着)。出発側も同じ(テスト 10)。遠景と backdrop は global yaw で描くので、handoff で とばない

---

## 9. PoC の再評価(§50)

| | **`home\|forest`** | `home\|river_lake` |
|---|---|---|
| 曲がる量 / 分類 | 75° / wide | 43° / gentle |
| 最大の曲がる速さ 初回 / 再訪 | 10.9 / 15.2 °/s | 6.2 / 8.7 °/s |
| walkLength / 初回 | 2700 / 10.4s | 2700 / 10.4s |
| 到着の `buildWorld`(Node・デスクトップ) | forest 95.0ms(地上で最も重い)/ 戻り home 9.5ms | river_lake 56.2ms / 戻り home 9.5ms |
| 幅クラス | **normal**(wide 3 / normal 3) | narrow(wide 2 / normal 2 / narrow 2) |
| 地面の種類 / 変わる回数 | **3 種 / 2 回**(urban-edge › field › forest) | 5 種 / 4 回 |
| 両端の land の一致 | 4 / 6 | 3 / 6 |
| 出口の干渉 | home.bigtree(出口 2: もり / かわ) | 同じ bigtree |

**結論: `home|forest` のまま。**

- 地面が 3 種・変化 2 回と いちばん少なく、帯も広め(normal)。**4E-2 で作る描画(地面の帯と飾り)の範囲が最小**になる
- 到着が地上で最も重い forest なので、handoff の暗転で `buildWorld` を隠せるかを **最悪の場合で先に**確かめられる。戻りは最軽量の home
- 曲がりも 75°(最大 10.9°/s)で、再訪でも めやすの半分
- `home|river_lake` は曲がりが最も穏やかだが、坂(narrow)が 2 段あり地面が 5 種。**4E-4 で 2 本目**にする(同じ bigtree を使うので、出口の選び分けの確認も そのまま流用できる)

---

## 10. 性能(§51)

| 項目 | 値 |
|---|---|
| 生成(はじめの 1 回、4C の corridor を含む) | 約 7ms(Node・デスクトップ) |
| 2 回目以降 | 0.002ms(freeze したものを返すだけ) |
| データ量 | JSON 約 43.7KB(10 本。4C の corridor 13 本は 14KB) |
| 実行時の負荷 | **0**(simulation / renderer / UI から呼ばれない) |

---

## 11. テスト

`tests/meguru-phase4e1-test.cjs` 17 本:

1. spec は walk 10 本、4C と 1 対 1。special 3 本・memory_lake は入らない
2. はし = gate の出口 spot(実在・`regionGates` に その向きの gate がある)。local の出る向きを global にすると 4C の leave
3. 段数 = land。言葉は gate の land から(向きごと)。地面は 11 種。land の言葉をコードに書いていない
4. walkLength = 段 × 450、初回 8.7〜10.4 秒、再訪 1.4 倍、checkpoint は等分
5. 向きは a の出口 → b へ入る向きへ連続。はじめと終わりの半段はまっすぐ
6. 曲がる速さ(数値で実測してデータと一致)。初回で めやすを超えるのは `countryside|forest` だけ
7. 幅クラス・world 単位の幅・u の上限と clamp。曲がりの半径 > 半幅
8. collisionProfile は意味だけ。region の collider の名前を使わない
9. 行きと帰り: 形・長さ・幅は共有、向きだけ逆
10. handoff: 出口 ↔ s / u ↔ 入口。向きの差 < 0.5°、位置は spot の中、戻りは commit しない
11. closure の残りを持ちこまない(位置の変換関数・世界地図の仕組みを使わない)
12. fallback: reduced motion / tier 2 / 失敗 / 重い / 許可リスト外 / special
13. CorridorState の形と clamp
14. 1 度だけ組み立てて freeze、生成は軽い、実時刻・乱数・画面を読まない、`buildWorld` を呼ばない
15. まだ誰も使っていない(meguru.js のほか・script.js などから参照なし)
16. **消しても動きが変わらない**(4E-1 を消した meguru.js で、分母・corridor・遠景・transition・13 地域の world と gate・5 地域の歩き・世界地図・save の key が 1 文字も同じ)
17. 分母 471 / 654 / 118 / 107、11 / 12 / 17 / 103、connection 14、gate 13、corridor 13、DistantFeature 37、transition、たび、save に痕跡なし

わざと壊して赤になることも確かめました:
- 曲がる向きの符号を逆にする → 5・9・10
- 到着の向きを逆にする → 10
- 段の長さを 1600 にする → 4・5・6・13
- simulation から呼ぶ → 15・16

既存テスト: 4B / 4C / 4D-1 の「消しても変わらない」テストは、4E-1 も同じブロックに乗る「まだ誰も使っていない層」なので、export をいっしょに消すように 1 か所ずつ直しました(4C を足したときと同じ直しかた)。

`npm test`: **1266 / 1266**(main 1249 + 4E-1 の 17)

---

## 12. 4E-2 への入力

4E-2(`home|forest` 1 本だけの Canvas PoC)で、この data を次のように使います:

| 4E-2 でやること | 使う 4E-1 |
|---|---|
| gate に入ったら corridor にするか決める | `corridorMode(spec, { perfTier, reducedMotion, allow: ['home\|forest'] })` |
| player を corridor に入れる | `corridorEnterState(spec, from, player)` |
| 毎フレーム s / u を進める・clamp | `makeCorridorState` の clamp、`corridorStageAt(spec, from, s).uMax`、`timing.speed × speedMultiplier` |
| カメラの向き | `corridorHeadingAt(spec, from, s)`(global)→ corridor chart の yaw |
| ヒント行の言葉・地面の描き分け | `corridorStageAt(...).label` / `.terrain` / `.widthClass` |
| 帯のはしの当たり判定と飾り | `collisionProfile`(障害物は `maxObstacleCount` まで、はしだけ) |
| 着いた / 戻った | `corridorExitPose(spec, state)`。`commit` のときだけ `enterRegionByMove` |
| save / reload | CorridorState は保存しない(途中の reload は出発 region) |

4E-2 で新しく作るもの: corridor chart の平面座標(曲率の積分)、帯と飾りの描画、party の追従、handoff の暗転、fallback の配線、実画面と性能の確認。
