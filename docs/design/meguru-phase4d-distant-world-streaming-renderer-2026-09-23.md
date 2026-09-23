# Phase 4D — 遠景・streaming・renderer 移行 設計監査

日付: 2026-09-23 ／ 対象: `meguru.js`(めぐる)／ 前提: main `82acac6`(Phase 4C 着地・npm test 1208/1208・CI GREEN)
関連: [Phase 4A 設計監査](./meguru-phase4a-region-origin-global-world-2026-09-22.md) ／ [Phase 4B 引き継ぎ](../handoff/meguru-phase4b-region-frame-2026-09-22.md) ／ [Phase 4C 引き継ぎ](../handoff/meguru-phase4c-corridor-2026-09-23.md)

> ## 追記(2026-09-23)— 設計監査は完了し、4D-1 を実装しました
>
> この設計監査は PR #330 で main(`51aa8b4`)に入り、**Phase 4D 設計監査として完了**しました。
> Phase 4D-1(DistantFeature の意味データ)は実装済みです → [`../handoff/meguru-phase4d1-distant-data-2026-09-23.md`](../handoff/meguru-phase4d1-distant-data-2026-09-23.md)
>
> 実装で決めた点(この文書との差分):
> - 候補は **39 → 37**。「同じ出口の向きに far は 1 枚」という重複ルールを足した(forest と river_lake の desert_haze が落ちる)
> - 見える条件の「star_stop は発見前でも夜に光の点」は採らず、**発見前は一切出さない**(存在を漏らさない)
> - `kind` は行き先の見え方から 11 種(mountain / snow_mountain / forest / highland / city_glow / sea_horizon / desert_haze / island / sky_light / deep_dark / land_below)
> - 1 画面の数は、far を足すと最大 4 になるので `distantInView(…, max = 3)` で絞る
>
> **4D-2(home / sea の Canvas 遠景 PoC)も実装し、採用判断は「合格」**です → [`../handoff/meguru-phase4d2-canvas-poc-2026-09-23.md`](../handoff/meguru-phase4d2-canvas-poc-2026-09-23.md)
> - データは `sim.view()` ではなく `renderer.setDistant()` で渡す(view・sim を変えない)。投影は方角 + カメラの向き + 今の F だけ(mid の anchor は使わない)
> - 2D 命令は最大 +6 / フレーム、rAF の差は測定ノイズの範囲。4D-3(Three.js)は今は不要と判断
>
> **4D-2b で 12 地域へ展開しました** → [`../handoff/meguru-phase4d2b-all-regions-2026-09-23.md`](../handoff/meguru-phase4d2b-all-regions-2026-09-23.md)
> - 地域名で分けず、kind と地域の意味(backdrop・view・層)だけで描き分ける。たて 3 種(上の光・下の暗さ・下の地上)も最小限で描く
> - 2D 命令の最悪は +10 / フレーム。**Three.js(4D-3)は省略可能**と判断
> - 既存の波形の backdrop 帯(hills / farhills / lakehills / seahorizon / mesas)は回転と逆向きに流れる(C 評価 5 地域)。次は backdrop の角度追従修正を優先
>
> **4D-2c で backdrop 帯の回転を遠景と揃えました** → [`../handoff/meguru-phase4d2c-backdrop-yaw-2026-09-23.md`](../handoff/meguru-phase4d2c-backdrop-yaw-2026-09-23.md)
> - 流れはカメラの向き(0〜360°)から決め、1 周で模様の繰り返しが整数回になるようにした(±180° の継ぎ目が消える)。形は変えない
> - 逆向きは 0、C 評価は 0(B 4 地域 / A 8 地域)。2D 命令は 1 つも増えない

**この文書は設計監査です。ゲームのコードは 1 行も変えていません。**
追加したのは実測を再現する読み取り専用の道具 `tools/meguru-phase4d-distant-survey.cjs` だけです(`npm test` には入れていません)。

---

## 0. 結論(先に)

| 項目 | 結論 |
|---|---|
| **推奨 renderer 戦略** | **案 A「Canvas のまま、global data 由来の遠景レイヤーだけを足す」**。Three.js は Phase 4D の本線に入れない |
| **Three.js の扱い** | 4D-3 で **本番に出さない隔離 PoC**(1 scene・1 region・1 distant feature)だけ。採否は数字で決める |
| **Canvas に残すもの** | 地面・道・水辺・scenery・キャラ・空・既存の backdrop 帯・transition。**Phase 4D ではすべて残す** |
| **遠景の正本** | `DistantFeature`(semantic data)。px 値は正本にしない。**方角は「出口(corridor)の向き」から決め、REGION_FRAME の位置では決めない**(§2.3 の実測) |
| **LOD** | near(今の region)/ mid(隣の出口の先の気配)/ far(高い山・街の光・島影など、方角だけ)/ vertical(上空・深み) |
| **streaming 単位** | **今の region 本体 + 隣の DistantFeature メタデータだけ**。隣の region 本体(`buildWorld`)はロードしない |
| **4D の順番** | **4D-1 semantic data → 4D-2 Canvas 遠景 PoC(1〜2 region)→ 4D-3 Three.js 隔離 PoC(任意)** |
| **4E に渡すもの** | DistantFeature と見えるルール、方角固定の投影、bend 曲線の方式、streaming の境界、性能の実測値 |

---

## 1. 現状

### 1.1 世界データ(Phase 4B / 4C で着地済み)

- `REGION_FRAME`(12 地域)と local ↔ global 変換。memory_lake は frame を持たない
- corridor 13 本(walk 10 / sea 1 / vertical 2)、global graph(node 12 / edge 13)、`findRegionRoute()`、`corridorDirection()`、`compassLabel()`
- **どれもまだ、描画・当たり判定・住民・セーブ・`travelToRegion()` からは使われていない**

### 1.2 今の renderer(`createCanvasRenderer`)

| 項目 | 実装(実測・読解) |
|---|---|
| 方式 | Canvas 2D の疑似 3D。`sim.view()` を受け取って描くだけ(renderer contract は `meguru.js` の「レンダラーの やくそく」) |
| 水平 FOV | `F = 0.95 W` から **55.5°** |
| 地平線 | 画面高の **30%**(`HOR_BASE = 0.30`)。足もとは 80% |
| 遠景(backdrop) | 地域ごとの **手続き的なシルエット帯 1 本**(`hills` `peaks` `seahorizon` `neonskyline` `mesas` …15 種)。高さは画面高の 17% |
| 遠景の流れかた | カメラの yaw で横に流れる。**1 周で 2.6 W**(角度として正しい量は 360 / 55.5 × W = **6.49 W**、その約 40%) |
| 遠景の向き | **方角に固定されていない**。どちらを向いても同じ種類の帯が回り続ける。隣の地域の方角は表していない |
| 近景の打ち切り | 地面の細部は `farCull`(最大 2600 world 単位)まで |
| 性能 tier | script.js が平均フレーム時間で 0〜2 に自動調整(平均 22ms 超で tier 1 以上)。めぐるは開始時に一度読む。重いときは描画を 2 フレームに 1 回(`halfRate`) |
| reduced motion | `prefers-reduced-motion` でカメラ演出を止め、`setAnimLevel(0)`。transition は 0.45 倍に短縮 |
| 環境 | `view.env`(time / weather / season)で色・空・雪をかえる。**実時刻は読まない**(`S.currentEnvironment()` から sim に渡る) |
| 決定性の穴 | `abyss` と `neonskyline` の遠景だけ **`performance.now()` を直接読んで**点滅している(描画引数の `now` を使っていない)。4D-2 で遠景に手を入れるときに `now` へそろえる |
| Three.js | **依存に入っていない**(`package.json` にも `index.html` にもない。`meguru.js` の "three" はコメントだけ) |

### 1.3 描画コストの実測

ヘッドレス Chromium、CPU 4 倍スロットル、DPR 3、めぐるに入って 1.5 秒後から 3 秒間。`CanvasRenderingContext2D` の命令数と `requestAnimationFrame` 1 回の処理時間(sim の 1 歩 + 描画)。

| 画面 | region | 1 フレームの 2D 命令数 | rAF p50 | rAF p95 |
|---|---|---:|---:|---:|
| 390×844 | home | 1,079 | 10.9ms | 14.5ms |
| 390×844 | city | 1,356 | 14.4ms | 21.0ms |
| 390×844 | sea | 1,035 | 4.2ms | 30.0ms |
| 390×844 | mountain | 1,285 | 18.3ms | 28.3ms |
| 360×640 | home | 1,069 | 11.2ms | 20.5ms |
| 360×640 | city | 1,289 | 17.0ms | 25.8ms |
| 360×640 | sea | 1,059 | 14.7ms | 22.1ms |
| 360×640 | mountain | 1,313 | 15.4ms | 21.7ms |

- canvas の実ピクセルは 390×844 で 676×1066、360×640 で 644×718
- **すでに 16.7ms を超えるフレームがある**(p95 で 14〜30ms)。遠景に使える予算は小さい
- 遠景の 1 要素をシルエット 1〜2 本の path で描くと 5〜10 命令。視野に同時に 2〜3 要素なら **+10〜30 命令 ≒ 全体の 1〜3%**

### 1.4 region 本体を読むコスト

`buildWorld()` は 1 地域あたり **平均 50ms・最大 93ms**(Node・デスクトップ・暖機後)、平均 **709 個**の props を作ります。
隣の 2〜4 地域を本体ごと読むと、デスクトップでも 100〜370ms、iPhone ではその数倍の引っかかりになります。
一方 corridor 13 本のデータは JSON で約 14KB、組み立ては 1.3ms。

---

## 2. 目的と、実測で分かった前提

### 2.1 目的

Phase 4B / 4C の global data を、**はじめて「見える世界」につなぐ**。
ただし full continuous world は作らない。**region の中にいるまま、世界の広がりが感じられる**ところまで。

### 2.2 何を見せたいか

- 出口の先に「次の場所の気配」(森の稜線、山の峰、海の水平線、街の光)
- もっと遠くの **高いもの**(山塊・雪山・メサ・夜の街)
- 特殊な行き先の **兆し**(水平線の島影、山上の光、水面下の暗さ)

### 2.3 実測 1 — 方角は「位置」ではなく「出口の向き」から決める

2 手以内で行ける地上の地域の組 52 組で、次の 2 つの方角を比べました(`tools/meguru-phase4d-distant-survey.cjs` の §2)。

- (a) **最初に通る出口の向き**(corridor の leave を local に戻したもの)
- (b) **REGION_FRAME の原点どうしを結んだ向き**

| 食い違い | 組数 |
|---|---:|
| 中央値 | **69°** |
| 最大 | 177° |
| 45° 超 | 35 / 52 |
| 90° 超 | 19 / 52 |

chart が 1.51 倍重なっている(Phase 4A)ので、**global の位置で遠景を置くと、歩く向きと逆の方角に隣の地域が見える**ことが多い。
→ **遠景の方角は出口(corridor)の向きで決める**。REGION_FRAME は「上下(layer の高さ)」と「corridor の global 向きを local に戻す」ためだけに使う。
(walk corridor の leave を `dirToLocal` で戻すと、gate の `bearing` / `dir` の向きに Phase 4B の往復精度(約 1e-16)で戻ります。実測ではすべて 45° 刻み)

### 2.4 実測 2 — 出口の向きの分布

| region | 大きさ | 視野(55.5°)に同時に入る出口 | 出口の local 向き |
|---|---|---:|---|
| home | 2300×3000 | 1 | forest 315° / river_lake 45° |
| city | 4600×6600 | 2 | countryside 0° / sea 135° / desert 315° |
| countryside | 5200×7700 | 2 | forest 0° / city 315° / star_stop 上 |
| forest | 5800×7900 | 2 | mountain 45° / countryside 0° / home 180° |
| mountain | 4000×9000 | 2 | snow 0° / forest 135° / river_lake 180° / desert 315° |
| snow | 5000×7600 | 1 | mountain 0° |
| sea | 3205×8000 | 1 | city 135° / jungle 336°(海の横断方向)/ deepsea 下 |
| river_lake | 4400×8000 | 1 | mountain 0° / home 180° |
| jungle | 5200×8100 | 1 | sea 180°(海の横断方向) |
| desert | 6800×8800 | 2 | mountain 180° / city 135° |
| star_stop | 5200×7300 | 0 | countryside 下 |
| deepsea | 4400×7800 | 0 | sea 上 |

- 歩きの出口は **すべて 45° 刻み**(gate のデータがそう書かれている)
- 視野に同時に入るのは **最大 2**。1 画面に遠景を詰め込みすぎる心配はない
- **出口の先 4000 の点を地域内の spot から見ると、方角が 15〜62° ずれる**(地域そのものが 3000〜9000 と大きいため)。
  → 「出口の先の気配」(mid)は **位置を持つ**(近づくと正面に来る)、「もっと遠く」(far)は **方角だけ**(空と同じく位置で動かない)、と分ける

---

## 3. 3 案の比較

| | **A. Canvas のまま遠景だけ追加** | **B. Canvas 本体 + 遠景・特殊演出だけ Three.js** | **C. region renderer 全体を Three.js へ段階移行** |
|---|---|---|---|
| **中身** | 既存の backdrop 帯の上に「方角固定の遠景レイヤー」を 1 枚足す。形は既存の 15 種のシルエット描画を**角度の窓で切って**再利用 | WebGL canvas を 2D canvas の**下**に敷き、遠景だけ 3D で描く。2D 側の空と backdrop を透明にする | renderer contract を保ったまま Three.js renderer を別に作り、region ごとに切り替え |
| **実装コスト** | 小。投影 1 関数 + 描画 1 関数 + data 1 層 | 中〜大。2 つの canvas の重ね順・カメラ同期・リサイズ・DPR・破棄 | 大。地面・道・水辺・scenery 数百種・キャラ・遮蔽・transition をすべて作り直し |
| **リスク** | 低。既存の描画順の中に 1 層入るだけ | 中。2D の空と backdrop を透明にする時点で **既存の見た目が変わる**。2 つの canvas の合成で Safari の負荷が読みにくい | 高。既存テスト(描画指紋・layout)と見た目の総入れ替え |
| **iPhone 性能** | +10〜30 命令(約 1〜3%)。追加メモリはほぼ 0 | WebGL コンテキスト 1 つ + 2D の合成。three.js 本体の読み込み(min 約 600KB / gzip 約 150KB)と GPU メモリ | 描画は速くなる可能性があるが、移行中は 2 系統を持つ |
| **既存テストへの影響** | ハーネスで data を検証できる(DOM も WebGL も不要)。描画は with/without の命令数・layout 比較 | ハーネスは WebGL を持たない。遠景部分はブラウザテストだけになる | 大半の描画系テストを書き直し |
| **将来性** | 4E の continuous walk では足りない(本当の奥行きがない)が、**data と見えるルールはそのまま 3D に持っていける** | 遠景だけ 3D の経験が積める。4E で C に進む足がかり | 最終形には近い |
| **Phase 4E へのつながり** | DistantFeature・投影・LOD・見えるルールを渡す | 3D での遠景描画の知見を渡す | そのまま 4E の基盤 |

### 判断の軸

- **4D の目的は「見せる」まで**(continuous walk は 4E)。本当の奥行きがまだ要らない
- 実測でフレームはすでに 16.7ms を超えることがある。**2 つ目の描画系を足す余裕は小さい**
- 遠景の **正本は semantic data**。描く道具は後から替えられる

---

## 4. 推奨案

**案 A を本線にし、4D-3 で案 B の最小 PoC を「本番に出さずに」測る。**

- Canvas 本体(地面・道・水辺・scenery・キャラ・空・既存 backdrop 帯・transition)は **4D ではすべて残す**
- 追加するのは
  1. **sim 側**: `DistantFeature` の一覧と見えるルール(描画を知らない純データ)
  2. **renderer 側**: 方角固定の遠景レイヤー 1 枚(`drawBackdrop` の直後、地面の前)
- Three.js は **4D-3 の隔離 PoC だけ**。本番の画面にもビルドにも入れない。採否の基準は §17.3

---

## 5. distant feature(semantic data)

### 5.1 かたち

```js
DistantFeature = {
  id,              // 'home>forest' / 'home>>mountain' など。安定した文字列
  kind,            // 'neighbor'(隣の出口の先) | 'range'(遠くの高いもの) | 'island' | 'skylight' | 'depth'
  sourceRegion,    // 見る側
  targetRegion,    // 見られる側(memory_lake は入らない)
  via,             // 通る connection id の列(['home|forest'] / ['home|forest', 'forest|mountain'])
  bearing,         // 見る側 region の local 方位(度。0 = local +Z)。corridor の leave / heading を dirToLocal したもの
  bearingGlobal,   // 同じ向きの global 方位(テストで corridorDirection と照合する)
  anchor,          // mid だけ: { spot, out } = 出口 spot と、出る向き(local 単位ベクトル)。位置の視差に使う
  distanceClass,   // 'mid' | 'far' | 'vertical'
  elevationClass,  // 'low' | 'tall' | 'above' | 'below'
  silhouette,      // 'treeline' | 'peaks' | 'snowpeaks' | 'seahorizon' | 'neonskyline' | 'mesas' | 'hills' | 'lakehills' | 'farhills' | 'canopy' | 'island' | 'skylight' | 'depth'
  width,           // 角度の幅のクラス: 'narrow'(約 20°) | 'wide'(約 40°)
  visibilityRule,  // §6
  priority,        // 同じ方角に重なったときの順番(mid > far)
}
```

- **px も色も持たない**。色は renderer が `BACKDROP_COLORS` と `view.env` から決める
- `silhouette` は **行き先の地域の backdrop の種類**をそのまま使う(`buildWorld(target).backdrop` と同じ値。表 §5.3)
- 作り方は `worldCorridors()` と同じ: **はじめて呼ばれたときに 1 回だけ組み立てて freeze**。毎フレーム作らない
- 正本の優先順位: `WORLD_GEOGRAPHY.connections` > gate の意味データ > REGION_FRAME > corridor > **DistantFeature**(さらにその下の派生)
- 物語上の例外(「star_stop は条件付き」「街の光は夜だけ」など)は **小さな上書き表 `DISTANT_RULES`** で持つ。自動導出を手で書き換えない

### 5.2 導出ルール

| distanceClass | 作り方 | 方角 |
|---|---|---|
| **mid**(隣) | walk corridor 1 本 = 1 つ | その出口の local 向き。`anchor` あり |
| **far**(2 手先) | walk だけで 2 手先、かつ **行き先の silhouette が高いもの**(`peaks` `snowpeaks` `mesas` `neonskyline`)。行き先ごとに `findRegionRoute(…, { special: false })` のいちばん安いルートの **最初の出口の向き** | 最初の出口の向き。位置なし |
| **island** | sea corridor(`jungle|sea`)。両端の地域から | 海の横断方向(corridor の heading を local に)。sea から 336°、jungle から 180° |
| **vertical** | vertical corridor(`countryside|star_stop` / `deepsea|sea`) | 方位なし。上か下 |

**同点のルートの扱い**: home → mountain は forest 経由と river_lake 経由が同コスト(9600 + 9600)。`findRegionRoute` のダイクストラ順で forest 側になります。
**同点は「両方の出口に出す」ではなく、決定的に 1 つ**にする(重複表示を避ける)。どちらにするかは `DISTANT_RULES` で上書きできるようにする。

### 5.3 12 地域の候補(見えるルールで絞った後・実測)

| region | 数 | 候補(行き先:距離/silhouette@local 方位) |
|---|---:|---|
| home | 3 | forest:mid/treeline@315 ・ river_lake:mid/lakehills@45 ・ mountain:far/peaks@315 |
| city | 4 | countryside:mid/farhills@0 ・ sea:mid/seahorizon@135 ・ desert:mid/mesas@315 ・ mountain:far/peaks@315 |
| countryside | 5 | forest:mid/treeline@0 ・ city:mid/neonskyline@315 ・ star_stop:vertical/上 ・ mountain:far/peaks@0 ・ desert:far/mesas@315 |
| forest | 6 | mountain:mid/peaks@45 ・ countryside:mid/farhills@0 ・ home:mid/hills@180 ・ city:far/neonskyline@0(夜)・ snow:far/snowpeaks@45 ・ desert:far/mesas@45 |
| mountain | 5 | snow:mid/snowpeaks@0 ・ forest:mid/treeline@135 ・ river_lake:mid/lakehills@180 ・ desert:mid/mesas@315 ・ city:far/neonskyline@315(夜) |
| snow | 2 | mountain:mid/peaks@0 ・ desert:far/mesas@0 |
| sea | 4 | city:mid/neonskyline@135 ・ jungle:far/island@336 ・ deepsea:vertical/下 ・ desert:far/mesas@135 |
| river_lake | 4 | mountain:mid/peaks@0 ・ home:mid/hills@180 ・ snow:far/snowpeaks@0 ・ desert:far/mesas@0 |
| jungle | 1 | sea:far/island@180 |
| desert | 3 | mountain:mid/peaks@180 ・ city:mid/neonskyline@135 ・ snow:far/snowpeaks@180 |
| star_stop | 1 | countryside:vertical/下 |
| deepsea | 1 | sea:vertical/上 |
| **計** | **39** | 絞る前は 58(2 手先の低い地形まで入れると、同じ方角に 3〜4 枚重なる) |

memory_lake は **1 つも入らない**(§11)。

---

## 6. visibility(見えるルール)

物理的な距離だけでは決めない。**地形と物語のルール**を持つ。

### 6.1 ルールの種類

```js
visibilityRule = {
  from,        // 'anywhere' | 'nearGate'(出口から一定距離以内)| 'shore'(水際の zone)
  time,        // 見える時間帯 ['night'] など。省略 = いつでも
  hideWhen,    // 見えなくなる天気 ['rain'] など
  fadeWhen,    // うすくなる天気 { cloudy: 0.6, snow: 0.5 }
  requires,    // 'link:<connection id>'(その道を見つけている)| 'region:<id>'(その地域を知っている)
  labelWhen,   // 出口の案内(§12)を出してよい条件。既定 = requires と同じ
}
```

### 6.2 既定の表

| 種類 | 既定ルール |
|---|---|
| mid(隣・低い地形) | `from: anywhere`。雨でうすく、雪でうすく。**名前は出さない**(地形の気配だけなので、未発見でもネタばれにならない) |
| far / peaks・snowpeaks・mesas | `from: anywhere`。雨・雪で隠れる、くもりでうすく |
| far / neonskyline(街の光) | **夜だけ**(`time: ['night', 'evening']`、evening はうすく) |
| island(島影) | sea からは `from: shore`、晴れ・くもりだけ。jungle からは本土の稜線として常に |
| skylight(star_stop) | countryside から、**`link:countryside|star_stop` を見つけてから**。見つける前は夜に小さな光の点だけ(物語の「とりいの上に何かある」程度) |
| depth(deepsea) | sea の `seacave` 付近(`from: nearGate`)だけ。地平線ではなく **足もとの水の色が暗くなる**演出 |

- 世界地図の「未発見の地域は形も名前も出さない」(#18 #45 #53)とぶつからないように、**遠景はいつも「地形の気配」まで**。地域の名前・のりもの・ラベルは `requires` が満たされたときだけ
- ルールの評価は **純関数** `visibleDistant(regionId, env, rec)` → `[{ feature, alpha }]`。env と発見記録を引数でもらい、**実時刻を読まない**

---

## 7. LOD

| 層 | 中身 | 描きかた | 位置の視差 | 予算(視野内) |
|---|---|---|---|---|
| **near** | 今の region の通常 scenery(今のまま) | 既存の `project()` | あり(本物) | 既存どおり |
| **mid** | 隣の出口の先の気配(稜線・峰・水平線・街並み) | 行き先の silhouette を **角度の窓(20〜40°)で切って**地平線に置く。出口に近づくほど濃く | あり: `anchor` の点(出口 spot + 出る向き × 約 3000)への方角を毎フレーム計算 | 2 要素・各 ≤ 10 命令 |
| **far** | 遠くの高いもの(山塊・雪山・メサ・夜の街の光・島影) | mid の後ろ、より空の色に寄せた薄い silhouette | **なし**(方角だけ。空と同じ) | 2 要素・各 ≤ 8 命令 |
| **vertical** | 上空(skylight)・深み(depth) | 地平線ではなく **空の上端 / 足もとの色**。§10 | なし | 1 要素 ≤ 6 命令 |

**投影**: 遠景の要素は既存の backdrop 帯(1 周 2.6 W)ではなく、**角度として正しい投影**で置く。

```
rel = wrap(bearing − camYawLocal)            // mid は anchor への方角、far は bearing そのもの
x   = W/2 + F · tan(rel)       (|rel| < FOV/2 + 窓の半分 のときだけ描く)
```

こうしないと、出口の正面を向いても隣の気配が正面に来ない(backdrop 帯は角度の 40% しか流れない)。
既存の backdrop 帯はそのまま残し、遠景レイヤーは **その手前・地面の後ろ**に描く。窓の両端は alpha でぼかし、帯との速度差が目立たないようにする。

**tier ごと**: tier 0 = mid + far + vertical。tier 1 = mid + vertical(far は tall のみ)。tier 2 = mid の 1 要素だけ。reduced motion は §14。

---

## 8. streaming

### 8.1 比較

| 案 | 読むもの | 追加コスト | 良い点 | 問題 |
|---|---|---|---|---|
| ① current region のみ | 今の `buildWorld` | 0 | 今と同じ | 遠景の材料がない |
| **② current + adjacent metadata** | ① + DistantFeature(≤ 6 個) | **< 1KB・< 1ms**(corridor 由来) | 遠景・出口案内・方角が全部作れる | 形は silhouette の種類だけ(十分) |
| ③ current + corridor | ② + corridor の曲線・段 | 数 KB | 4E の continuous walk の準備になる | 4D では描かない(bend、§9) |
| ④ current + far silhouette 画像 | ② + 事前生成のシルエット画像 | 画像 1 枚あたり数十 KB × 地域数 | 見た目を作り込める | 画像の管理と texture memory。手続き描画で足りる |
| ⑤ special destination preview | ② + 行き先の空・色だけ | 数百 B | transition の出口直前の予告に使える | 使う場面が限られる |
| ✕ 隣の region 本体 | 隣の `buildWorld` × 2〜4 | **100〜370ms**・props 約 700 × 地域数 | — | 引っかかり・メモリ。**採らない** |

### 8.2 推奨

**② を Phase 4D の streaming 単位**にする。③ は data だけ 4E に渡す。⑤ は 4D-2 の特殊演出で必要なぶんだけ(行き先の空の色 2 つ)。④ は採らない。

- 「隣を読む」とは **DistantFeature を作ること**であり、隣の地域の `buildWorld` を呼ぶことではない
- 地域に入ったとき(`createSimulation` / 地域の切り替え)に 1 回、`distantFeatures(regionId)` を作って `view.distant` に載せる
- 見えるルールの評価は env と発見記録が変わったときだけ(毎フレームではない)。毎フレームやるのは方角の投影だけ

---

## 9. corridor の可視化と bend

### 9.1 見せかた(4D は「線」を描かない)

| corridor | 見せかた |
|---|---|
| walk | 出口の先の **稜線・峠・谷・森** の気配(mid)。出口の道が地平線に消えていく「道の先」を、出口付近だけ細く |
| sea | 水平線の **島影**、港の先の航路感(§10) |
| vertical | 上空の光 / 深みの暗さ(§10) |

### 9.2 bend(Phase 4C: 43〜178°)を直線で描かない

4D では corridor の線そのものは描かないので、bend の影響は「出口の気配の方角」だけです。
**気配は出口を出る向き(leave)に置く**ので、bend があっても今見ている出口の正面に正しく出ます。

将来(4E)corridor を見せる・歩く場合の比較:

| 方式 | 中身 | 良い点 | 問題 |
|---|---|---|---|
| **3 次 Bezier** | A の出口 spot から leave 方向へ、B の入口 spot へ −enter 方向から。制御点の長さ = travelLength の 1/3 | 実装が小さい。bend 178° でも U 字になる | 途中の地形を知らない。長さの調整が 1 つだけ |
| **multi-stage spline** | corridor の段(land 6 段)ごとに通過点を置き、Catmull-Rom でつなぐ | 段 = 地区 1 つ分(1600)の意味と一致する。段ごとに景色を替えられる | 通過点の置きかたを決める必要がある |
| terrain-guided path | 地形の高さ・水辺を避けて探索 | 自然 | 地形データがまだない(4E 以降) |

**4E への推奨**: **multi-stage spline**(通過点は段ごと、端は leave / −enter に接する)。Bezier はその 1 段版として 4E の最初の試作に使える。
直線(globalFrom → globalTo)は **walk では禁止**(両端の差は closure の残り 4.6〜83.9 で、向きはほぼノイズ)。

---

## 10. special connection

| connection | 見せかた(4D-2 で作るなら) | 見えるルール | 使うデータ |
|---|---|---|---|
| **jungle\|sea**(船) | sea の水際から、水平線の **島影**(低い台形 + 樹冠のこぶ)。港の沖に航路の白い筋を 1〜2 本。jungle からは反対側に本土の稜線 | sea からは shore のみ・晴れ/くもり。雨で隠す | `corridorDirection('jungle|sea', from)` の heading を local へ(sea から 336°、jungle から 180°)。`ride` は船 |
| **countryside\|star_stop**(ゴンドラ) | 山の方角の空の **上端に小さな光**(停留所の灯)。のりば(skyland)に近いほど、光から下へ細いケーブルの気配 | link を見つけてから。前は夜に光の点だけ | vertical・+4800。方角は持たない(のりばの上) |
| **deepsea\|sea**(もぐる) | 水平線ではなく **足もとの水の色が深く・暗く**なる。seacave に近いほど強く | seacave 付近だけ | vertical・−1600 |

- どれも **transition(approach / cross / arrive / settle)を置き換えない**。遠景は「行く前に見えている」まで。乗ってからは今の transition のまま
- transition の出口直前(approach)に、行き先の空の色(⑤)を少し混ぜる案は 4D-2 の任意項目

---

## 11. memory_lake

- **通常の遠景には一切出さない**。DistantFeature の導出元(corridor)に memory_lake は入らない(Phase 4C で除外済み)ので、**自動では絶対に出ない**
- 入口の条件(connection の `from: 'きりの よる、しずかな みずべで'`)が **たびの仕組みの側で成立したときだけ**、水辺の地域(river_lake / sea / home の池など)で
  - 方角も形も持たない **薄い霧の帯**を水面の上に 1 本
  - 霧の中に小さな灯(🕯️ の色)を 1 つ
- 条件の判定は今のたびの仕組みに任せ、遠景は **「今そのヒントを出してよいか」を boolean で受け取るだけ**(`view.memoryHint`)。遠景側で条件を再実装しない
- 位置・方角・名前・世界地図には出さない

---

## 12. UI 方角(corridorDirection の使いかた)

- **常時の方位表示はしない**(北西などの常時表示なし)
- 出口の近く(gate の spot から一定距離以内)でだけ、小さな案内: 「**やまのほう**」「**うみのほう**」
  - ことばは **行き先の地形の呼び名**(region の silhouette / terrain から)。方位語(きたにし)は使わない
  - `labelWhen` を満たさない(道を見つけていない)ときは出さない
- 方位語を出すなら `corridorDirection()` だけを使う(Phase 4C の申し送り)。
  **行きと帰りで同じ方位になる corridor が 5 本ある**(bend > 150°)ので、方位語は出口の案内に向かない。地形の呼び名にする

---

## 13. world map との分離

| | 世界地図 | 遠景 renderer |
|---|---|---|
| 目的 | 探索 UI(見つけたものの記録) | その場からの見え方 |
| 位置の正本 | `mapX` / `mapY`(canon の「どこがどっち」) | **corridor の向き**(と REGION_FRAME の上下) |
| 未発見 | 形も名前も出さない | 地形の気配まで。名前・ラベルは発見後 |

- **遠景は `mapX` / `mapY` を使わない**(4B / 4C と同じくテストで縛る)
- 世界地図は 4D で変えない

---

## 14. performance / reduced motion

### 14.1 予算(iPhone 基準)

| 項目 | 予算 |
|---|---|
| 2D 命令 | 遠景レイヤー全体で **+30 命令以下 / フレーム**(今の 1,035〜1,356 の約 3%) |
| 透明レイヤー | 追加 **1 枚**(遠景レイヤー)。窓の端のぼかしは alpha だけで、`filter` / `shadowBlur` を使わない |
| オフスクリーン canvas | silhouette 1 種類につき 1 枚までキャッシュ(帯の高さ × 角度窓の幅)。**合計 6 枚・約 1MB 以下** |
| パーティクル | 追加しない(街の光・島の白波は固定の点) |
| DOM overlay | 出口の案内 1 つだけ(既存のヒント行を使い、新しい要素を増やさない) |
| Three.js scene graph | 4D-3 PoC のみ(§17.3) |
| 計算 | 見えるルールは env / 発見記録が変わったときだけ。毎フレームは投影(要素数 × tan 1 回) |

### 14.2 既存 tier の継承

- tier 0: mid + far + vertical
- tier 1: mid + vertical、far は `tall` のみ・キャッシュ済み silhouette だけ
- tier 2: mid の 1 要素だけ(いちばん近い出口)
- `halfRate` のときも遠景は同じフレームで描く(特別扱いしない)

### 14.3 reduced motion

- 遠景の **点滅・揺れを止める**(街の光・星のまたたき・白波は固定)
- **視差を弱める**: mid の位置視差を 0.5 倍、backdrop 帯の yaw 流れは今のまま
- 出現・消滅は **fade だけ**(移動で出さない)
- 遠景の動きは `setAnimLevel(0)` と同じスイッチで止める(新しい設定は増やさない)

### 14.4 time / weather / season(§22 §23)

- 遠景は `view.env`(time / weather / season)だけを読む。**実時刻・`performance.now()` を読まない**
- 点滅などの時間は **draw の `now` 引数**だけ。4D-2 で既存の `abyss` / `neonskyline` の `performance.now()` も `now` にそろえる
- 霧は今の weather にないので、4D では「くもり = うすく」「雨 = far を隠す」「雪 = 全体をうすく」まで。霧の追加は環境システム側の別件

---

## 15. iPhone(390×844 / 375×667 / 360×640)

- 遠景は **地平線(画面高 30%)の上の backdrop 帯(17%)の中だけ**に描く。帯の外にはみ出さない
  - 主役キャラの足もとは 80% の高さなので、**キャラと重ならない**
  - パッド・もどるは canvas の下(Phase 4B の実測で padOut −33〜−36)なので **UI と競合しない**
- 帯の高さは canvas 高の 17%: 390×844 で約 91 CSS px、360×640 で約 61 CSS px(実測の canvas 338×533 / 322×359 から)。silhouette の高さは帯の高さ比で決める(px を正本にしない)
- 出口の案内は既存のヒント行(`mgrHint`)に出す。新しい DOM を足さない
- 受け入れ時の確認: 3 サイズ × 実装 region で はみ出し 0・JS エラー 0・layout 値が「遠景なし」と一致(§16)

---

## 16. testing

### 16.1 実装前に決めるテスト

| 種類 | 何を縛るか | どこで |
|---|---|---|
| **semantic data snapshot** | 12 地域の DistantFeature の id・行き先・方角・距離・silhouette(§5.3 の 39 個と一致)。memory_lake は 0 | ハーネス(node) |
| **方角の一致** | `bearingGlobal` = `corridorDirection().heading` / walk は gate の local 向き(45° 刻み)と一致 | ハーネス |
| **mapX / mapY 不使用** | 遠景ブロックのコードに `mapX` `mapY` `worldMapShape` が出てこない。`mapX` を書き換えても遠景 data が同じ | ハーネス |
| **visibility rule** | time / weather / 発見記録の組み合わせで見える集合と alpha が決まる(表で網羅)。実時刻を変えても結果が同じ | ハーネス |
| **LOD 切替** | tier 0 / 1 / 2 で描く要素数(命令数の上限) | ハーネス(描画を数えるモック ctx) |
| **投影** | 出口の正面を向いたとき mid の要素が画面中央 ±5% に来る | ハーネス(モック ctx) |
| **perf budget** | 遠景あり / なしで 2D 命令の差 ≤ 30、rAF p95 の悪化 ≤ 2ms(4 倍スロットル) | ブラウザ |
| **iPhone layout** | 3 サイズ × 実装 region で はみ出し 0・pad / もどるが画面内・layout 値が遠景なしと一致 | ブラウザ |
| **reduced motion** | 遠景の点滅なし・位置視差 0.5 倍 | ハーネス |
| **with / without** | 遠景レイヤーを消すと sim の指紋(Phase 4B / 4C の remove-it)が同じ。save に distant の痕跡なし | ハーネス |
| **決定性** | 同じ view・同じ `now` で 2 回描くと命令列が同じ(`performance.now` を読まない) | ハーネス |

### 16.2 受け入れ基準(Phase 4D 完了の条件)

- 1〜2 region で、出口の方向に隣の気配・遠くの高いものが **自然に**見える(スクショで目視 + 方角テスト)
- 遠景は **DistantFeature(global data 由来)だけ**から描かれる。px 値・`mapX` / `mapY` を正本にしていない
- **renderer 分離を維持**: sim は data を出し、renderer は描くだけ
- 性能: 2D 命令 +30 以下、rAF p95 の悪化 2ms 以下(4 倍スロットル)、tier / reduced motion を継承
- 既存 UI・世界地図・transition・save・collision・resident・`travelToRegion()` は **不変**
- memory_lake は通常遠景に出ない
- continuous walk・global collision・resident の地域間移動は **未実装のまま**
- `npm test` 全件 GREEN、Runtime smoke / Home layout GREEN

---

## 17. Phase 4D の分割

### 17.1 順番と中身

| 段階 | 中身 | 変えるもの | 変えないもの |
|---|---|---|---|
| **4D-1** semantic data | `distantFeatures(regionId)`・`DISTANT_RULES`・`visibleDistant(regionId, env, rec)`。**まだ誰も使わない**(4B / 4C と同じ remove-it で縛る) | `meguru.js` に純データの層を足すだけ | 描画・UI・save すべて |
| **4D-2** Canvas 遠景 PoC | 方角固定の投影と遠景レイヤー。**1〜2 region だけ**有効(候補: **home**(出口 2 本・視野内 1・far あり)と **sea**(島影・深み・街の光の特殊 3 種)) | renderer に 1 層。`view.distant` を 1 つ足す。`abyss` / `neonskyline` の `performance.now()` を `now` へ | 他の region の見た目、地面・scenery・キャラ・transition |
| **4D-3** Three.js 隔離 PoC(任意) | 1 scene・1 region・1 distant feature(**sea から見た jungle の島影**)。開発用ページかフラグの裏だけ | 本番の画面・ビルドには入れない | すべて |

### 17.2 この順番にする理由(実測から)

- 1 画面の遠景は **最大 2 要素**・全体で 39 要素と小さいので、**data を先に固めても重くならない**(4D-1)
- Canvas はすでに p95 で 16.7ms を超える場面があるので、**Canvas での追加コスト(+1〜3%)を先に測る**(4D-2)。これが予算内なら Three.js を足す理由は「見た目」だけになる
- Three.js は依存に入っておらず、ハーネスで動かせない。**本番の判断を 4D-2 の数字のあとにする**(4D-3)

### 17.3 Three.js を採るかどうかの基準(4D-3)

次を **すべて**満たしたときだけ、4E 以降で「遠景だけ Three.js」(案 B)を検討する:

- 同じ島影を Canvas で描いたときより、見た目の改善がはっきりしている(スクショ比較)
- iPhone 相当(4 倍スロットル)で rAF p95 の悪化が 2ms 以下、GPU メモリ増 20MB 以下
- 2D canvas と WebGL canvas を重ねても、既存の見た目(空・backdrop)が変わらない
- 読み込みの増加(three.js 本体)を許容できる判断がある

満たさなければ **Canvas のまま 4E へ**進む。

---

## 18. Phase 4E との境界

| | Phase 4D | Phase 4E |
|---|---|---|
| 目的 | **見せる** | **歩いてつながる** |
| corridor | 方角と気配だけ(線は描かない) | multi-stage spline で形を持ち、歩ける |
| 移動 | 今のまま(gate → transition → 次の region) | corridor を歩く連続移動を試す |
| streaming | 今の region + 隣の metadata | corridor 上で次の region を先読み(実運用) |
| collision | region local のまま | corridor 上の global collision を検討 |
| resident | 今のまま | 地域間を動く住民を検討 |
| renderer | Canvas + 遠景レイヤー(Three.js は隔離 PoC のみ) | 4D-3 の結果しだいで案 B / C |
| save | 不変 | 位置を id + local のまま持つ方針を維持(Phase 4A §11) |

**4E に渡すもの**: DistantFeature と見えるルール、方角固定の投影、LOD と tier の対応、bend の曲線方式(multi-stage spline)、streaming の境界(隣の本体は読まない)、4D-2 / 4D-3 の性能実測値。

---

## 19. 残りの段階(完成までの見取り図)

1. **4D-1** DistantFeature の data 層(誰も使わない・remove-it で縛る)
2. **4D-2** Canvas 遠景 PoC(home / sea)→ 見た目・性能・layout の確認 → 全 region へ広げるかを決める
3. **4D-3** Three.js 隔離 PoC(任意)→ 採否の判断
4. **4E-1** corridor の形(multi-stage spline)の data
5. **4E-2** 1 本の corridor だけを歩ける試作(streaming・collision の最小版)
6. **4E-3** 本格運用(全 corridor・住民・save 方針の確認)

---

## 20. 今回やっていないこと

- Three.js の実装・依存追加
- continuous walk / global collision / resident の地域間移動
- 遠景の描画・`view` への追加・renderer の変更
- save・世界地図・transition・`travelToRegion()` の変更
- 全 corridor の描画・全 region の streaming

---

## 付録 A — 実測の再現

```sh
# 出口の向き・方角の食い違い・候補数(§2.3 §2.4 §5.3)
node tools/meguru-phase4d-distant-survey.cjs
```

描画コスト(§1.3)はヘッドレス Chromium(`/opt/pw-browsers/chromium-1194`)で、QA 用セーブ `world_<region>` から めぐるに入り、
`CanvasRenderingContext2D` の主要命令(`fill` `stroke` `fillRect` `drawImage` `fillText` `arc` `ellipse` と gradient 生成)を数え、
`requestAnimationFrame` の callback 時間を測りました(CPU 4 倍スロットル、3 秒間)。
`buildWorld` のコスト(§1.4)は node のハーネスで 12 地域を 1 回ずつ暖機してから測定。

## 付録 B — 用語

| 用語 | 意味 |
|---|---|
| DistantFeature | 遠景 1 要素の意味データ(px を持たない) |
| mid / far / vertical | 遠景の距離のクラス(§7) |
| 方角固定の投影 | カメラの向きとの角度差から `x = W/2 + F·tan(rel)` で置くこと |
| backdrop 帯 | 今の地域ごとの 1 本のシルエット帯(方角に固定されていない) |
| bend | corridor の A を出る向きと B へ入る向きの差(Phase 4C) |
