# Phase 4D-2 — home / sea だけの Canvas 遠景 PoC

日付: 2026-09-23 ／ 対象: `meguru.js` ／ 前提: [Phase 4D 設計監査](../design/meguru-phase4d-distant-world-streaming-renderer-2026-09-23.md)・[Phase 4D-1 handoff](meguru-phase4d1-distant-data-2026-09-23.md)(main `dd3821a`)

**判断: 採用(PoC として合格)。** home と sea の 2 地域だけに、既存の backdrop 帯の上へ「方角固定の遠景レイヤー」を 1 枚足しました。
2D 命令は **最大 +6 / フレーム**(基準 +30 以下)。rAF の差は測定ノイズの範囲(基準 p95 +2ms 以下)。layout は 3 サイズで完全一致、JS エラー 0。

描画以外(sim・セーブ・`sim.view()`・世界地図・`travelToRegion()`・当たり判定・住民・`buildWorld`)は **1 行も変えていません**。

---

## 0. やったこと / やっていないこと

| | |
|---|---|
| **足したもの** | renderer: `setDistant(state)`・`drawDistant()`・`distantShown`(確認用の読み出し)。start(): `syncDistant()`(home / sea の `visibleDistant` を renderer へ渡す) |
| **直したもの** | `drawBackdrop` の `abyss` / `neonskyline` が `performance.now()` を直接読んでいたのを、フレームの `now`(`curNow`)に揃えた(2 か所) |
| **変えたファイル** | `meguru.js` ／ `tests/meguru-phase4d2-test.cjs`(新規 9 本)／ `tests/meguru-phase4b-test.cjs`・`tests/meguru-phase4c-test.cjs`・`tests/meguru-phase4d1-test.cjs`(「消しても変わらない」テストが 4D-2 の印つきブロックも一緒に消すように)／ `package.json`(テスト登録)／ `index.html`(`npm run bump`) |
| **やっていない** | home / sea 以外の地域 ／ Three.js ／ continuous walk ／ global collision ／ resident の地域間移動 ／ save・世界地図・UI の変更 ／ `buildWorld(target)` ／ ほしぞら(star_stop)の遠景 ／ しんかいの「下」ヒントの描画 |

4D-2 のコードは 2 つの印つきブロック(`// ====== Phase 4D-2: …` 〜 `// ====== /Phase 4D-2 ======`)と、末尾に `// Phase 4D-2` を付けた 5 行だけです。
この印の中を全部消すと main と同じ動きに戻ることをテストで確認しています(§10)。

---

## 1. 方式

```
start()(glue)                               renderer(createCanvasRenderer)
  地域・env・見つけた道 が変わったとき           drawSky
    visibleDistant(region, env, {links})  ──►   drawBackdrop(今までどおり。方角に固定されていない帯)
    renderer.setDistant({ regionId,             drawDistant  ← 足した 1 枚(方角固定)
      list, reduced })                          (きり・地面・もの…は今までどおり)
```

- **世界の側がデータを決め、renderer は投影するだけ**(renderer contract)。見えるかどうか・濃さ・順位・LOD は
  4D-1 の `visibleDistant` / `priority` / `lod` / `distantInView` をそのまま使い、renderer で作り直していません
- データは `sim.view()` には載せず、`renderer.setDistant()` で渡します(`setAnimLevel` と同じ「renderer への設定」)。
  4D-1 handoff §11 では view に足す案でしたが、view を変えないほうが sim・既存テスト・remove-it の証明が単純になるため、こちらにしました
- 再計算は **地域に入ったとき・env を見直すとき(30 フレームごと)・道を見つけたとき** だけ。キーが同じなら何もしません(毎フレーム組まない)
- 道の記録は `S.worldLinks()` と `worldLinksFrom(S.allDiscoveredSpots())` の和。読むだけで、セーブには何も書きません
- `DISTANT_POC = ['home', 'sea']` 以外の地域では `setDistant(null)`(遠景なし)

## 2. 投影

```
rel     = wrap(bearingLocal − yawDeg)          yawDeg = カメラの向き(地域の local 方位)
screenX = W/2 + F·tan(rel) + dx                F = 0.95W(今の投影と同じ。新しい FOV 定数は作らない)
FOV     = 2·atan(W/2/F) = 55.5°
```

- 使うのは **方角(bearingLocal)・カメラの向き・今の F だけ**。`mapX` / `mapY`・`REGION_FRAME`・world 座標の anchor は使いません
- 形の幅は **角度** で持ち(山 ±14°、森 ±11°、島 ±5° など)、両端を同じ式で画面に直します。DistantFeature に px は書きません
- `dx` は横に歩いたぶんの小さなずれ(mid は backdrop 帯の横ずれの 1/2、far は 1/4)。回転での位置は `dx` に関係なく方角だけで決まります
- 視野の端 6° では薄くして、はみ出すときにぱっと消えないようにしています
- 描く順は順位の低いもの(far)から。山は裾を空に溶かし、手前の丘の後ろにあるように見せます

**方角固定の確認**(テスト 2): home / sea を yaw 0・45・…・315 と途中の角度で回し、すべての表示について
`x − dx = W/2 + F·tan(rel)`、画面から戻した方角 = `bearingLocal`(誤差 1e-6 未満)、真正面を向くと画面中央、を確認しています。

| home | 315° | 45° | 0・90・135・180・225・270° |
|---|---|---|---|
| 見えるもの | 山(far)+ 森(mid) | 湖の丘(mid) | なし |

| sea(島を発見済み・夕方) | 336° 付近 | 135° | ほか |
|---|---|---|---|
| 見えるもの | 島(far) | 街の灯(mid)+ 砂漠のかすみ(far) | なし |

## 3. home

| 遠景 | データ | 描き方 |
|---|---|---|
| **山** `home>>mountain` | far・mountain・315° | 3 つの峰。上は空色に寄せ、裾は透明に溶かす。冬・雪の日は頂に雪 |
| **森** `home>forest` | mid・forest・315° | とがった木立 + 丸いこずえ。両端を低くして丘になじませる |
| **湖の丘** `home>river_lake` | mid・highland・45° | なだらかな丘と、ふもとの水の光(1 本) |

315° を向くと、森の木立の奥に山並みが重なって見えます(森 → 山 の順に遠い)。

## 4. sea

| 遠景 | データ | 描き方 |
|---|---|---|
| **島** `sea>jungle` | far・island・336° | 水平線(海の帯の上端)に小さな島とヤシ 1 本。**jungle|sea を見つけてから**。夜と雨は出ない |
| **街の灯** `sea>city` | mid・city_glow・135° | 水平線の丸いほのかな光 + ビルの影 + 窓の灯。**夕方(濃さ 0.5)と夜(1)だけ**。昼は出ない |
| **砂漠のかすみ** `sea>>desert` | far・desert_haze・135° | 平らな台地がうっすら(街の後ろ) |
| しんかい `sea>deepsea` | vertical・deep_dark | **地平線には描かない**(方位を持たないので `distantInView` が数えない)。「下」のヒントの描画は今回は見送り(`nearGates` も渡していない) |

ほしぞら(star_stop)の遠景は home / sea に無く、描いていません。

## 5. 見える条件(visibility)

すべて 4D-1 の `visibleDistant` のままです(テスト 3)。

| 条件 | 結果 |
|---|---|
| 島: 発見前 / 発見後(昼) | 出ない / 出る |
| 島: 夜・雨 | 出ない |
| 街の灯: 昼 / 夕方 / 夜 | 出ない / 濃さ 0.5 / 濃さ 1 |
| しんかい: 全部の道を発見 + 出口の近く | データにはあるが、地平線には 0 回(全方位 15° きざみで確認) |

見え方が変わるとき(夕方になる・道を見つける)は、ぱっと出さずに約 1 秒で **fade** します(両方向)。地域に入った瞬間だけはそのままの濃さで出します(移動の画面が覆っているため)。

## 6. perfTier

| tier | 1 画面の最大 | 出るもの |
|---|---|---|
| 0(high) | 3 | mid / far |
| 1(mid) | 2 | mid / far |
| 2(low) | 1 | **mid だけ**(far・vertical の `lod.maxTier` は 1) |

`distantInView(list, yaw, 55.5°, [3,2,1][tier])` に、`lod.maxTier >= tier` で絞った一覧を渡します。
home / sea では視野に同時に入るのは最大 2 つなので、上限はテスト 4 で方角だけずらした 5 つの特徴で確かめています(3 / 2 / 1)。

## 7. reduced motion

`prefers-reduced-motion: reduce` のとき(start() が `setDistant({ …, reduced: true })` を渡す):

- **位置は同じ**(方角の投影は変えない)
- **横のずれを 3 割に**(パララックスを弱く)
- **ちらつきなし**(街の窓の灯は一定の濃さ。軽い tier(animLv 0)でも同じ)
- あらわれる / きえるは fade のまま(fade 中心)

アニメーションは街の窓の灯のゆっくりした明滅(約 3.7 秒周期・濃さ 0.7〜1.0。reduced motion では 0.85 で一定)だけです。

## 8. 性能(before / after)

### 8.1 描画命令(2D の主要命令: fill / stroke / fillRect / drawImage / fillText / arc / ellipse / gradient 生成)

遠景あり / なしの同じフレームの差(node で同じ view を 2 つの renderer に描いて数えた厳密値):

| 場面 | tier 0 | tier 1 | tier 2 |
|---|---|---|---|
| home 315°(山 + 森) | +4 | +4 | +2 |
| home 315° 冬・雪(雪の頂つき) | +5 | +5 | +2 |
| home 45°(湖の丘) | +2 | +2 | +2 |
| sea 135° 夜(街の灯 + 砂漠) | **+6** | +6 | +5 |
| sea 336° 昼・発見済み(島) | +1 | +1 | 0 |
| 遠景が視野にないとき | 0 | 0 | 0 |

**最大 +6 / フレーム**(基準 +30 以下)。テスト 6 で 18 場面すべて +30 以下を固定しています。

### 8.2 rAF(ヘッドレス Chromium・CPU 4 倍スロットル・DPR 3・390×844)

**(a) 遠景を正面に置いた描画コスト**: 同じ `meguru.js` の renderer を「遠景あり(A)」「なし(B)」の 2 つ作り、
1 tick ごとに同じ view を両方に描いて(順番は交互)、描画時間を比べました(220 tick、住民なし)。

| 場面 | 表示 | A p50 / p95 (ms) | B p50 / p95 (ms) | 命令 A / B |
|---|---|---|---|---|
| home 315° 昼 | 山 + 森 | 6.8 / 10.5 | 6.6 / 10.8 | 1775 / 1770 |
| home 315° 冬・雪 | 山 + 森 | 7.0 / 9.7 | 6.7 / 9.7 | 1856 / 1850 |
| home 45° 昼 | 湖の丘 | 6.0 / 8.8 | 5.9 / 8.2 | 1793 / 1791 |
| sea 135° 夜 | 街の灯 + 砂漠 | 2.5 / 3.9 | 2.3 / 4.1 | 281 / 275 |
| sea 135° 夕方 | 街の灯 + 砂漠 | 2.5 / 3.8 | 2.4 / 3.7 | 258 / 252 |
| sea 336° 昼 | 島 | 9.3 / 15.1 | 9.1 / 12.8 | 2072 / 2071 |

p50 の差は +0.1〜0.3ms。p95 は ±1.5ms の範囲で前後します(sea 336° を 3 回測り直すと +1.5 / 0 / −1.3ms。足しているのは fill 1 回なので測定ノイズ)。

**(b) 実アプリの rAF**(めぐるに入って 1.5 秒後から 3 秒。stand = 立ったまま、turn = パッドで左へ歩いて回る。main `dd3821a` と交互に 2 回ずつ、各 3 回の中央値):

| 場面 | before p50 / p95 (ms) | after p50 / p95 (ms) | 命令 / フレーム before → after |
|---|---|---|---|
| home 昼 stand | 10.4 / 17.0 ・ 11.1 / 22.5 | 11.5 / 19.2 ・ 10.1 / 16.9 | 2081 → 2081 |
| home 夜 stand | 11.4 / 18.6 ・ 11.1 / 21.4 | 11.2 / 17.9 ・ 11.7 / 20.9 | 2112 → 2112 |
| sea 昼 stand | 14.2 / 27.1 ・ 17.4 / 40.9 | 15.4 / 24.5 ・ 16.9 / 29.1 | 2034 → 2035 |
| sea 夜 stand | 17.2 / 23.4 ・ 12.9 / 24.2 | 16.4 / 27.3 ・ 16.2 / 27.6 | 2066 → 2065 |
| home 昼 turn | 5.1 / 18.9 ・ 4.9 / 19.1 | 5.0 / 22.8 ・ 6.3 / 19.0 | — |
| home 夜 turn | 5.3 / 21.4 ・ 6.0 / 21.8 | 5.2 / 20.8 ・ 5.6 / 19.9 | — |
| sea 昼 turn | 6.8 / 22.1 ・ 7.3 / 24.6 | 6.2 / 22.5 ・ 6.9 / 25.6 | — |
| sea 夜 turn | 7.0 / 22.3 ・ 5.9 / 23.4 | 6.7 / 22.7 ・ 6.5 / 25.5 | — |

出てきた直後の向き(stand)には遠景が入らないため、命令数は before と同じです。
before どうしでも p95 が最大 17ms 揺れる(sea 昼 stand: 27.1 / 40.9)ので、実アプリの rAF は「悪化が見えない」ことの確認にとどめ、
遠景そのもののコストは (a) で判断しました。**rAF の悪化は +2ms 以下(判定: 合格)。**

## 9. 画面の確認

- **実アプリ**: 390×844 / 375×667 / 360×640 × {home 昼, home 夜, sea 昼, sea 昼 島発見, sea 夜 島発見, city 昼} = 18 画面。
  overflow 0・パッド / もどるのはみ出し 0・JS エラー 0。**canvas / パッド / もどる の位置と大きさは 4D-1 の基準と 18 件すべて完全一致**
  (ヘッドレス Chromium が自動で取りにいく `/favicon.ico` の 404 は main でも同じで、アプリのエラーではない)
- 実アプリで home を左へ回ると、315° で森の奥に山並みが出ることを確認
- **全方位**: 同じ `meguru.js` を Chromium の canvas で yaw 0〜315(45° きざみ)に描いたシートで、home 昼 / home 夕方・冬 /
  sea 昼(発見前・後)/ sea 夕方 / sea 夜 を確認。UI とは重ならない(遠景は地平線の帯の中だけ)

## 10. 変わっていないこと(テストで確認)

- `tests/meguru-phase4d2-test.cjs`(9 本):
  1. 遠景のデータを渡すのは home / sea だけ(city / forest / deepsea / star_stop は `null`)、渡すのは `visibleDistant` のまま、毎フレームは渡さない
  2. 方角固定(§2)
  3. 見える条件(§5)
  4. perfTier(§6)
  5. reduced motion と fade(§7)
  6. 2D 命令 +30 以下(§8.1)
  7. renderer contract: 描いても DistantFeature は変わらない・px を持たない・view に載せない・4D-2 のコードは `mapX` / `mapY` / `buildWorld` / `REGION_FRAME` / セーブ書き込み / 実時刻を使わない・FOV は F から・`drawBackdrop` は `performance.now()` を読まない・セーブに遠景の跡がない
  8. **消しても動きが変わらない**: 4D-2 の印つきブロックと行を消した `meguru.js` と、sim の歩き・発見・view のキー・start() のセーブ・遠景なしの描画命令の並び(city / mountain / forest / home / sea)が完全一致
  9. 分母・corridor 13 本・DistantFeature 37 個・12 地域は不変
- 4B / 4C / 4D-1 の「消しても変わらない」テストは、4D-2 の印つき部分も一緒に消すように更新(4D-1 の名前を使ってよいのは 4D-2 の印の中だけ)
- テストをわざと壊して確かめた: FOV を変える / tier 上限を変える / reduced でも明滅させる / city を POC に足す / lod を無視する → それぞれ 1 本ずつ赤くなる
- `npm test` 1231 / 1231(main の 1222 + 新規 9)

## 11. 採用判断

**採用(PoC 合格)。**

| 基準 | 結果 |
|---|---|
| 方角固定 | yaw 0〜315 で誤差 1e-6 未満 |
| 2D 命令 +30 以下 | 最大 +6 |
| rAF 悪化 +2ms 以下 | p50 +0.1〜0.3ms、p95 はノイズ範囲 |
| layout 不変・UI と重ならない・JS エラー 0 | 18 画面で完全一致・0 |
| reduced motion / perfTier | 位置不変・横ずれ 3 割・明滅なし / 3・2・1、low は mid だけ |
| 既存の動き | 4D-2 を消した版と sim・セーブ・他地域の描画が一致 |

見た目で残る課題(PoC の範囲外、次で扱う):

- **backdrop 帯は方角に固定されていない**(1 回転で 2.6W 流れる。遠景レイヤーは角度どおり 6.49W)。回すと、帯の丘と遠景の山が少し違う速さで流れる。いまは遠景を控えめ(空に溶かす・小さめ)にして目立たなくしています
- mid の遠景は帯の **上に** 描くので、帯の丘の手前に森が出ることがある(「その方角に森がある」ヒントとしては読める)
- sea は出てきた位置の向きに遠景が無く、回らないと見えない
- 山・島などの形はまだ手続きの簡単な図形。地域ごとの作り込みはしていない

## 12. 4D-3 へ進むか

**今は進まないことを勧めます。**

- 4D-3 は「Three.js の隔離 PoC(任意)」でした(設計監査 §17.3)。遠景は Canvas の 1 枚で、命令 +6・rAF 差ノイズ以下で出せたので、
  **遠景のために WebGL を足す理由がありません**(three.js の読み込み約 150KB gzip と 2 枚の canvas の合成コストに見合わない)
- 先にやる価値があるのは Canvas 側の続き(どれもユーザーの判断のあとで):
  1. 残り 10 地域への展開(4D-1 の 37 個のうち home / sea の 7 個しか使っていない)
  2. backdrop 帯の流れる速さを角度に近づける(遠景レイヤーとのずれを減らす)
  3. しんかいの「下」ヒント・ほしぞらの「上」の光(vertical の描き方)
- Three.js を検討し直すのは、continuous walk(Phase 4E)で本当の奥行きが要るとき

## 付録 — 再現

```sh
npm test                                   # 1231 / 1231
node --test tests/meguru-phase4d2-test.cjs  # 4D-2 の 9 本
```

rAF と命令数は、ヘッドレス Chromium(`/opt/pw-browsers/chromium-1194`)に CDP の `Emulation.setCPUThrottlingRate`(4)をかけ、
`CanvasRenderingContext2D` の主要命令を数えて測りました(§8)。(a) は `installNaotocchiMeguru({})` で作った renderer 2 つを同じ view で描き比べ、
(b) は QA 用セーブ `world_home` / `world_sea`(時間・島の発見だけ書き換え)から めぐるに入って測っています。
