# Phase 4E-2 — home↔forest を ほんとうに あるく(Canvas の PoC)

日付: 2026-09-23 ／ 対象: `meguru.js` ／ 前提: [Phase 4E 設計](../design/meguru-phase4e-continuous-corridor-world-2026-09-23.md)(#335)・[Phase 4E-1](meguru-phase4e1-corridor-geometry-2026-09-23.md)(#336、main `6191f76`)

**`home|forest` の 1 本だけ**、地域の出口から となりの地域の入口まで、暗転の演出(transition)ではなく **その道を自分で歩いて** こえられるようにした。
ほかの 12 本(walk 9 本・ふね・ゴンドラ・もぐる)は 今の transition のまま。save の形・`travelToRegion()`・世界地図・分母は変えていない。

---

## 0. やったこと / やっていないこと

| | |
|---|---|
| **足したもの** | `CONTINUOUS_WALK_ALLOWLIST`(= `['home\|forest']`)／ `continuousWalkMode()` ／ `createCorridorWalk()` ／ `corridorDistantBlend()` と、その下の chart・合成 world・当たり判定(4E-1 ブロックのすぐ後ろの 1 ブロック)。`start()` の中の glue(`frameFn` の前の 1 ブロック + 印の付いた 3 行) |
| **変えたファイル** | `meguru.js` ／ `tests/meguru-phase4e2-test.cjs`(新規 19 本)／ `tests/meguru-phase4b・4c・4d1・4d2・4e1-test.cjs`(「消しても変わらない」テストが 4E-2 の印も消すように)／ `package.json`(テスト登録)／ `index.html`(`npm run bump`) |
| **さわっていない** | simulation(`createSim`)・renderer(`createCanvasRenderer`)・`TRANSITION` と `transitionPlan()`・`travelToRegion()`・save の key と形・世界地図・分母・gate の数(テスト 18 / 19 で縛る) |
| **やっていない** | ほかの 9 本への展開 ／ special connection(ふね・ゴンドラ・もぐる)の連続化 ／ streaming・preload の本実装 ／ global collision ／ resident の地域間移動 ／ save schema の変更 ／ Three.js |

4E-2 のコードは全部 `// ====== Phase 4E-2: … ======` 〜 `// ====== /Phase 4E-2 ======` のブロックか、行末 `// Phase 4E-2` の行にある。
消すと 4E-1 までの動きに完全にもどる(4B/4C/4D-1/4D-2/4E-1 の remove-it テストが、4E-2 の印も消したうえで緑)。

---

## 1. いつ corridor を歩くか(`continuousWalkMode`)

gate が出たとき(`beginTransition(g)` の頭)に 1 回だけ判定する。`'corridor'` 以外は **今の transition**。

| 理由 | 結果 |
|---|---|
| `g.way !== 'walk'`(ふね・ゴンドラ・もぐる・のぼる) | `not-walk` → transition |
| `CONTINUOUS_WALK_ALLOWLIST` に無い(walk ほか 9 本) | `not-allowed` → transition |
| 4E-1 の spec が無い / 形が合わない | `no-spec` / `geometry-invalid` → transition |
| よいやすい設定(`prefers-reduced-motion`) | `reduced-motion` → transition(4E-1 `corridorMode`) |
| `perfTier` 2 | `perf-tier` → transition |
| この セッションで しっぱいした(`corrFailed`) | `failed` → transition |
| `createCorridorWalk()` が投げた(state / geometry が作れない) | `corrFailed` に入れて transition |
| 着く がわの `buildWorld` が投げた | 出発地域の出口へもどる(save はそのまま)。次から transition |

`home.bigtree` には `forest` と `river_lake` の 2 つの gate がある。**`river_lake` は `home|river_lake`(許可リスト外)なので corridor にならない**(テスト 15、実画面でも確認)。

許可リストに 1 本足せば、その corridor が歩けるようになる形にしてある(4E-3 で使う)。

---

## 2. CorridorState(save しない)

`createCorridorWalk(spec, from, opts).state` の key:

`connectionId` `fromRegion` `toRegion` `s` `u` `direction`('forward' / 'reverse') `speedMultiplier` `firstVisit` `width` `active`

- **正本は `s`(弧長 0〜walkLength)と `u`(横ずれ)**。chart の x/z は `chartPose(ch, s, u)` で毎回出す
- save には 1 文字も入らない(テスト 11 で `lifetime.meguru` を見る)
- `regionId`(save)は **着いた frame に 1 回だけ** 書きかわる。歩いているあいだは出発地域のまま
- 途中で reload / もどる → 出発地域から(テスト 12、実画面 `reload` / `home-button`)

---

## 3. geometry(corridor 専用の一時 chart)

- chart = **出発地域の local 軸**にそろえた平面。原点は出口 spot + `CORRIDOR_ORIGIN`(20000)。地面の模様が負の座標を読まないため
- 向き = 4E-1 の `corridorHeadingAt()`(global)− 出発地域のずれ `off(r) = endpoints[r].leaveHeadingGlobal − leaveHeadingLocal`
- 10 ごとに積分した `Float64Array` の xs / zs / hs を持つ(2700 → 271 点)。端から先はまっすぐ延ばす
- 右むき = `(cos h, −sin h)`
- 逆向き(forest → home)は同じ spec を逆に読む。段のことばは forest がわ(`いえなみ` まで)

| home\|forest | 値 |
|---|---|
| 段 | 6(urban-edge / field / field / forest / forest / forest) |
| walkLength | 2700(段 × 450) |
| 幅 | wide 520(uMax 238)× 3 段 → normal 380(uMax 168)× 3 段 |
| 曲がる量 | 合計 75.2°(段ごと 2.3 / 16.4 / 18.8 / 18.8 / 16.4 / 2.3) |
| 所要 | 初回 10.40 秒(spec 10.38)／ 再訪 7.43 秒(spec 7.42、× 1.4) |
| 段のことば(home→forest) | いえなみの はずれ / はたけ / かじゅえん / ざつぼくりん / きが ふえる / もりの いりぐち |

---

## 4. 動き

- **入力は道に対して**。指を置いた瞬間の `cos(camera.yaw − h)` で前後の向きを決め、離すまで固定(カーブで止まらない)。`fwd = −y·dir`、`side = x·dir`
- 速さ = いつもの歩き × `speedMultiplier`(初回 1.0 / 再訪 1.4)
- **初回か** は 今ある はっけんの記録(`S.worldLinks()` + `worldLinksFrom(allDiscoveredSpots())`)と、このセッションで こえたか(`crossedBefore`)。新しい save key は作っていない
- `s < 0` → 出発地域の同じ出口へもどる(commit しない)。`s ≥ walkLength` → 着く
- `u` は段の `uMax` で止まる(レールではなく、帯の中は左右に自由に歩ける。テスト 5)

### むき(yaw の連続性)

- 入った瞬間はカメラを動かさない(入る前の yaw をそのまま使う)
- カメラは遊び(dead zone)なしで道の向きに指数で追う(`CORRIDOR_CAM_FOLLOW` = 3/s、上限は いつもの `RULES.cam.turnRate`)
- 着いたときは `yawIn(to)` で 着く地域の local に直して `carry` で渡す。いつもの `enterWorld` の carry と同じ仕組み

| | 初回 | 再訪 |
|---|---|---|
| カメラの曲がる速さ(最大) | 10.9°/s(spec 10.9) | 15.2°/s(spec 15.2) |
| 入った瞬間の yaw の差 | 0° | 0° |
| 着く瞬間の道とのずれ | 0.04° | < 1° |

(テスト 6。はじめの実装は遊びありで 71°/s の段つきだったので、遊びなしに直した)

---

## 5. renderer(いまの `createCanvasRenderer` をそのまま使う)

renderer は 1 行も変えていない。corridor 用の **軽い合成 world** を作って、いつもの `draw()` に渡す。

| 中身 | 数 |
|---|---|
| 道(segments) | 90 ごと 30 本 |
| 地面の しるし(marks) | 96 |
| 飾り(props) | 段ごと 14 → 90(上限 `CORRIDOR_SCENE_MAX` 150)。段の地面の種類で表 `CORRIDOR_SCENERY` から選ぶ |
| 遠い景色 | 今の遠景(4D-2b)。`corridorDistantBlend` で t < 0.4 出発がわ / 0.4〜0.6 両方 / > 0.6 着くがわ。着くがわの方位は `offTo − off` で直す |
| backdrop / sky / detail / wind / motion / edge | t = 0.5 で出発 → 着くがわに切りかえ(今ある種類だけ) |
| 地面・道の色 | `mixRgb` + smoothstep で home → forest になめらかに |
| canopy | t > 0.75 で着くがわ |
| 住民 | 0 |
| JSON の大きさ | 約 22 KB(上限 200 KB) |

- 実画面: stage 0 = いえなみ、stage 2 = むぎ畑と木、stage 4 = 森と treeline の backdrop(3 サイズで撮影)
- 遠景の更新は t × 40 で間引く(1 本で 40 回)

---

## 6. 当たり判定(corridor だけ)

- 段ごとに いし(🪨)1 こ、帯の はしに(`u = side·(uMax − 16)`、r = 24)。1 本で 6 こ
- 押し出しは (s, u) の空間でやり、そのあと もう一度 `u` を帯に止める
- **region の当たり判定と同時には持たない**。corridor にいるあいだ sim は step しない(出発地域の world は sim に残したまま動かさない)。着いたときに `enterWorld` が forest の当たり判定を作り、corridor のものは捨てる
- テスト 7: いしに めり込まない・帯から出ない・region の collider を読まない

---

## 7. なかま(party)

- corridor に入るとき、今の party の **同じ object** を chart に移して ついて来させる(新しく作らない。テスト 8)
- 引き返し: `restoreParty()` で出発地域の local にもどす
- 着いた: `enterWorld` がいつもどおり party を作り(1 組だけ)、じぶんの すぐ後ろに並べる。transition で着いたときと同じ顔ぶれ(テスト 14 で比べる)
- 住民は 0。はなす・のる の UI は出さない(`setAct(null)`・`nearest: null`)

---

## 8. UI

| ボタン | corridor 中 |
|---|---|
| たび | 使えない |
| ちず | 使えない |
| もどる | 使える(めぐるを出る。save は出発地域) |
| ヒント | `【段のことば】もりの ほうへ` |
| spot のチップ・しらせ | かくす(着いてから出す) |

3 サイズで pad / もどる のはみ出しは 0(padOut / homeOut −33〜−36、overflow 0)。

---

## 9. 受けわたし(handoff)

| | どうするか |
|---|---|
| 入る | 出発地域の え の上に 0.1 秒だけ暗くして corridor へ(`CORRIDOR_COVER.fadeIn`) |
| 着く | 0.1 秒暗く → **その frame で** `enterWorld(to, {at, heading, carry, quiet})` → 成功したときだけ `S.enterRegionByMove(to, {by: 'walk'})`(**commit はここ 1 か所**)→ `sim.setPlayer(pose)`・party を並べる → 0.14 秒で明ける |
| 着くがわが作れない | `corrFailed` に入れて出発地域の出口へ。save は変わらない。次からは transition(テスト 16) |
| 引き返す | `backPose()`・`restoreParty()`・`sim.setPlayer`・`yawIn(from)`・遠景をもどす。出発地域は作り直さない |

transition は「save を書いてから `enterWorld`」の順。corridor は「`enterWorld` が成功してから save」の順にした(作れなかったときに save だけ進むのをふせぐ)。
companion の `region` は save の `regionId` を見るが、**着いた地域の party は `withPlayer` だけで決まる** ので顔ぶれは変わらない(テスト 14)。

---

## 10. 性能(実アプリ、390×844・DPR 3・**CPU 4 倍おそく**・2 回)

rAF 1 回の時間と、実際に えがいた frame の 2D 命令数(`fill` `stroke` `fillRect` `drawImage` `fillText` `arc` `ellipse` `create*Gradient`)。

| 場面 | p50 | p95 | 最大 | 2D 命令 p50 / 最大 |
|---|---|---|---|---|
| home を歩く(基準) | 5.7〜10.9 ms | 30.8〜36.4 ms | 49 ms | 1985 / 2085 |
| **corridor を歩く** | **7.2 ms** | **12.6〜14.2 ms** | 37.8〜51.4 ms | **1220** / 1558 |
| 段の切りかわり | 13.1〜15.7 ms | 18.2〜19.1 ms | 26.2 ms | 1281 / 1455 |
| 入る(暗くする間) | 5.0 ms | 8.8 ms | 8.9 ms | 362 / 745 |
| **着く frame(forest を作る)** | 113〜116 ms(暗転の下) | | | 1204 |
| 引き返す frame | 6.6〜7.8 ms | | | 1212 |
| forest を歩く(着いたあと) | 9.3〜10.9 ms | 31.1〜34.2 ms | 131〜166 ms | 2822 / 2947 |
| 参考: transition で着いた forest | 3.7 ms | 34.6 ms | 249 ms | 2862 / 3350 |

- 目標「p95 の悪化 ≤ +4 ms」: corridor は home を歩くより **p95 が 16〜22 ms 軽い**(悪化なし)
- 目標「2D 命令 ≤ +100」: corridor は home より **約 765 少ない**
- 目標「forest を作る山 desktop < 100 ms」: おそくしない実測で `lastBuildMs` 16〜31 ms。4 倍おそくして 113〜116 ms(暗転の下で見えない)
- 目標「暗転 ≤ 0.35 秒」: 暗くする 67 ms + 作る 113〜116 ms + 明ける 140 ms = **320 ms**(4 倍おそくして)。はじめは 0.12 / 0.2 秒で 450 ms だったので 0.1 / 0.14 秒に縮めた
- 目標「scene < 200 KB」: 約 22 KB
- いちばん重い frame: corridor 中は 51.4 ms(1 回。GC と思われる)、段の切りかわりは 26.2 ms
- JS エラー 0

---

## 11. iPhone 3 サイズ(Playwright、DPR 3)

390×844 / 375×667 / 360×640 × 5 場面 = **15 / 15 PASS**、JS エラー 0。

| 場面 | 確かめたこと |
|---|---|
| 往復 | home → forest(初回 × 1.0、firstVisit true、party 2、段 0〜5、歩いている間の save は home)→ forest 入口に着く ／ forest → home(× 1.4、約 7.1〜7.2 秒)／ U ターン(段 0〜2 で引き返して forest の入口へ)／ home.bigtree から river_lake へは corridor なし |
| reload | 途中で reload → home、corridor は残らない |
| もどる | 途中で もどる → save は home |
| reduced motion | 今の transition で forest へ |
| perfTier 2 | 今の transition で forest へ |

スクリーンショット: 3 サイズ × stage 0 / 2 / 4 + 着いたあと。

---

## 12. テスト(`tests/meguru-phase4e2-test.cjs`、19 本)

1. corridor は home\|forest(行き・帰り)だけ。ほか 9 本は transition、special は `not-walk`
2. fallback の理由(reduced / perfTier 2 / failed / 形)。perfTier 0・1 は corridor
3. home → forest: 初回 10.4 秒 / 再訪 7.4 秒、段 0 → 5、forest の入口へ
4. forest → home: 同じ形を逆に、ことばは forest がわ
5. `u` は帯の中だけ(レールではない)
6. yaw: 入る瞬間 0、最大は spec どおり、着くときのずれ < 1°
7. いしの当たり判定(1 段 1 こ、めり込まない、region の collider を持たない)
8. なかまは同じ object で ついて来る。住民 0
9. 引き返し: 出発地域の同じ出口へ(commit なし)
10. 飾り ≤ 150、地面の種類、地面の色、遠景のまざり
11. `start()`: 歩いている間の save は home、着いたら forest。え は home → corridor → forest。帰りも歩ける
12. 途中 reload → 出発地域から。save の形は同じ
13. `start()` で引き返す → home の大きな木へ
14. reduced / perfTier 2 → transition。着いたあとの なかまは corridor のときと同じ
15. home.bigtree の river_lake gate は corridor にならない
16. forest が作れない → home の出口へ、save は home、次からは transition
17. countryside → forest は transition
18. 4E-2 のコードは印の付いたところだけ。simulation・renderer・TRANSITION・travelToRegion は同じ
19. 分母・spot・たび・save・世界地図・corridor の数(471 / 654 / 118 / 107、11 / 12 / 17 / 103、connection 14、gate 13)は同じ

わざと壊して落ちることも確かめた: 許可リストに river を足す ／ commit を入るときにする ／ `u` を止めない ／ reduced を見ない → どれも落ちる。

`npm test`: **1285 / 1285**。

### 前からある ゆらぐテスト(4E-2 とは関係ない)

`meguru-discovery-test` の ⑥-1 と `meguru-test` の「entering めぐる…」が、`Math.random` の種を固定していないため まれに落ちる。
origin/main(4E-2 の前)でも同じ 2 本が落ちることをローカルで再現した。main `6191f76` の Runtime smoke は 1 回目 1264 / 1266(2 本落ち)で、同じ commit の再実行で緑になった(コードの問題ではなく ゆらぎ)。
4E-2 のブランチの全体実行ではこの回は出なかった。直すのは別の PR(今回の範囲の外)。

---

## 13. PoC の判定: **修正して採用**

**しくみ(一時 chart・s/u が正本・commit は着いたとき 1 回・fallback は今の transition・合成 world を今の renderer に渡す)は そのまま採用**。
性能・save・yaw・party・当たり判定・3 サイズの画面は、どれも目標の中に入った。

ただし ほかの 9 本に広げる前に、次を直す(= 4E-3 に進む条件):

1. **着く frame の山**: 4 倍おそくして 113〜116 ms。暗転の下なので見えないが、暗転の長さ(320 ms)は目標 350 ms まで 30 ms しか余裕がない。もっとおそい端末で暗転が のびる。着く地域の `buildWorld` を最後の段のうちに分けて始める(preload の最小版)か、暗転の中で 2 frame に分ける
2. **段の切りかわり**: p95 18〜19 ms(歩いている時の p95 の約 1.4 倍)。backdrop / sky の切りかえと遠景の入れかえが同じ frame に重なる。frame をずらす
3. **けしきの質**: 飾りは段の地面の種類ごとの小さな表だけ。ほかの 9 本(雪・砂・川・街)は表を足すだけで出るが、見た目の確認は 1 本ずつ要る
4. **main の ゆらぐテスト 2 本**: `Math.random` の種を固定する(CI が赤くなると 4E-3 の判断ができない)

---

## 14. 4E-3 への入力(まだ やらない)

- 許可リストに足す順番の案: 形が やさしい順(bend が小さく、幅が wide / normal)。narrow・bend 170° 超えは最後
- 足すときは 1 本ずつ: spec → 画面 3 サイズ → 性能(4 倍おそく)→ 往復・引き返し・reload
- special connection(ふね・ゴンドラ・もぐる)・global collision・resident の地域間移動・save schema・Three.js は 4E-3 でも範囲の外(4E 設計 §22 のまま)
- 自動 check-in は設定していない
