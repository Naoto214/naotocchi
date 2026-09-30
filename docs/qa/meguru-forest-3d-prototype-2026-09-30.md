# めぐる forest 3D prototype — QA 記録(2026-09-30)

基準: `main` `6b675919`(Merge PR #360)
branch: `claude/naotocchi-forest-3d-prototype`
事前確認と オーナー決定: M-1 = 1(3D モードだけ、道の うえの かたい 物は 見た目と あたりを 一体で 道の そとへ。約 1.5 × 大きさ の なかに おけなければ 3D では おかない)、`?meguru3d=1`・セーブに のこさない・Three.js は version 固定で repo の なか・3D は forest だけ・corridor / transition / city は 2D・WebGL 不可 / context lost は すぐ 2D。

**この prototype は「3D 化を 正当化 できるか」の 実験。成功条件(§6)の 判定が おわるまで 全面 3D 化は しない。**

## 1. できた もの

| | 中身 |
|---|---|
| フラグ | `?meguru3d=1` かつ WebGL2 の とき だけ(`script.js`)。セーブ・localStorage には かかない。ない ときは 1 バイトも ふえない(module は `import()` で あとから) |
| レンダラー | `meguru-3d.mjs`(Three.js 0.170.0 を `vendor/three-0.170.0/` に 固定、MIT LICENSE つき)。hybrid: forest の 3D モードの world だけ 3D、corridor・transition・ほかの 地域は いまの `createCanvasRenderer` |
| 境界 | いまの レンダラーの やくそく(`draw(view, now)` / `resize` / `destroy` / `setAnimLevel` / `setDistant`)と `start(container, { renderer })` を そのまま つかう。WebGL は 2D の canvas の したの べつの canvas、2D の canvas は うえで 名まえ・ふきだし だけ |
| カメラ | 2D と おなじ ピンホール(焦点 0.95W・地平線 30%・水平・目の たかさ camH)を `setViewOffset` で。player・なかまの 画面の いちは 2D と おなじ |
| せかい | `buildWorldSteps` の なかで 3D モード(forest)だけ `relocateRoadSolids3dSteps`(yield つき)。`worldObjects3d`: props + あたり(#360 の `o.pi`)→ world object(type・いち・むき・高さ・あたり・parts) |
| かたち | 木(針葉 / 広葉 / 大木)・岩・丸太・切り株・池・橋・たき(がけ + 水)・大きな きのこ は low-poly の InstancedMesh(かたち ごと 1 draw call)。草花・かんばん は 絵文字の 立て看板、おちば・どんぐり は 地面に ねかせる。地面の まだら(areas)・草の たば(marks)・池(water の spot)は 2D と おなじ データ |
| キャラ | player・なかま 27・住人 は いまの PNG / 絵文字イラストの 立て看板(y 軸だけ まわる・足もと 接地・alphaTest で 木の うしろに かくれる・まるい かげ)。よこむき は 反転、うしろ は 0.95(2D と おなじ) |
| 環境 | 2D の `TIME_LIGHT` / `WEATHER_LIGHT` / `moodAt` で ひかり・そら(2 色 グラデーション)・きり(場所の きぶんの いろ)。季節で 葉の いろ |
| すかし | カメラと player の あいだの かたい 物は 半透明の ghost に(8 つ まで) |
| 計測 | `tools/meguru-3d-compare.cjs`(2D / 3D の 固定地点の しゃしん・フレーム・draw call・CPU 低速化)、実機の `&perf=1`(画面に 数字)と `&m3d2d=1`(おなじ ページで 2D) |

変えて いない もの: 2D の world・見た目・あたり(フラグが なければ `world3dOn` は 1 つも はしらない)、save・schemaVersion、travel、corridor・transition の 作り、world map、city、13 地域の 2D、キャラの 3D モデル。

## 2. 道の うえの かたい 物(M-1)— 3D モードの forest だけ

| | 数 | 種類 |
|---|---|---|
| 候補(2D では 見た目だけ あって あたりが ない かたい 物) | 128 | ランドマーク(大きな木・たき・ひかる きのこ)も ふくむ |
| うごかした(見た目 + あたり 一体) | **89** | bigtrunk 33・🌲 31・🌳 18・bigrock 4・mistwood 3 |
| おかない(約 1.5 × 大きさ に おけない) | **39** | 🌲 14・🌳 11・bigtrunk 11・bigrock 2・log 1 |
| うごかした きょり | 中央 120・p90 216・最大 372 | 上限 = 1.5 × 絵の はば(2 × vh) |
| 3D だけ かたく した ながめの かざり | 2 | ledgerock 1・bigrock 1(2D でも あたりが なかった 物) |

- うごかす さき: 道の 通行帯(half + 26)・spot の まんなか・世界の はし を さけ、ほかの みきの 真上(中心が あたり半分 より ちかい)には おかない。うごかした あとも あたりは もとの 大きさ の 9 割 いじょう。
- 2D の 小石(道ばたの 🪨、2D でも あたりなし)27 は 3D では ひらたい 石(高さ 14 まで・ふんで とおれる)。
- 3D で すてた 飾り: `branch`(fore の 手前の えだ、画面の ふちの 2D の 演出)142・glow 5。

### 景観の みつど(固定地点の まわりの 木 + 岩)

| 地点 | 600 いない 2D → 3D | 1200 いない 2D → 3D |
|---|---|---|
| entry(もりのいりぐち) | 6 → 6 | 21 → 21 |
| bright2(ひだまり) | 11 → 11 | 58 → 55 |
| fork(みつまた) | 25 → 27 | 127 → 120 |
| great(おおきなき) | 7 → 9 | 78 → 68 |
| falls(たき) | 11 → 11 | 53 → 54 |
| forest 全体 | | 649 → 611(−6%) |

見た目の くらべ: `meguru-forest-3d-prototype-2026-09-30/*-2d-vs-3d.jpg`(左 2D・右 3D、おなじ セーブ・おなじ 地点)。

## 3. あたり・道・なかま(3D モードの world)

| | けっか |
|---|---|
| かたい 見た目で あたりの ない 物 | 0 |
| あたまより 下(125)で あたり より 太い 見た目(+10 まで) | 0(針葉樹の 下の 段・広葉樹の かんむりの 高さ・岩の 大きさ は あたりから) |
| あたりが あるのに 見えない 物(見えない かべ) | 0 |
| 道はば 3/4 の なか・spot の まんなか に かかる かたい あたり | 0 |
| 50 の spot に あるいて 行ける | 50 / 50 |
| 27 にんの なかま / player の めりこみ(1600 frame) | ≤ 0.5 / ≤ 0.5 |
| 半径 | player 22 / なかま 17.6(かえて いない) |

## 4. 計測

### 3D モードの world を 組む 時間(Node)

2D 0.35〜0.48 s → 3D 1.25〜1.44 s(forest に 入る とき)。`yield` で くぎって いて、1 くぎり の 最大は 2D 65 ms / 3D 44 ms(corridor の まえもって 組む を とめない)。

### ブラウザ(headless Chromium、390 × 844、DPR 2、27 にん、20 秒 あるく)

| | 2D | 3D |
|---|---|---|
| 入って さいしょの え まで | 0.64 s | 3.0 s |
| フレーム avg / p95 / p99(CPU 1×) | 26.3 / 33.4 / 50 ms | 139.9 / 316.7 / 366.7 ms |
| 60 ms 超 | 6 / 809 | 72 / 144 |
| 3D の JS(draw の なか) avg / p95 | — | 3.6 / 5.1 ms |
| CPU 4× : フレーム avg / p95 | 89.3 / 216.6 ms | 250.2 / 533.3 ms |
| CPU 4× : 3D の JS avg / p95 | — | 22.8 / 32.4 ms |
| draw call / 三角形 / texture | — | 23〜55 / 91〜97 k / 40 |
| world object | — | 1047(なかま 27 + player) |
| JS heap | 25〜29 MB | 20〜21 MB |

**headless の WebGL は ソフトウェア(SwiftShader)で GPU の しごとを CPU で して いる ので、3D の フレーム時間は 実機の めやすに ならない。** くらべられるのは JS の 時間・draw call・三角形・texture。2D の canvas も headless では GPU なし。

2D の simulation の baseline(27 にん step、#360): forest 0.45 / mountain 0.48 / city 0.67 ms。3D モードでも simulation は おなじ コード(forest の あたりは 531 → 622)。

### 実機(iPhone)で しか わからない もの — 未計測

- GPU の 時間(DPR 3 → 2 に おさえて いる)・フィルレート
- 5〜10 分 あるいた ときの 熱・フレームの おちかた
- メモリ(タブの 再読み込み)・WebGL の context lost(バックグラウンド)
- 省電力モード(30 fps)・120 Hz
- はかりかた: `…/index.html?meguru3d=1&perf=1`(3D)と `…?meguru3d=1&perf=1&m3d2d=1`(おなじ ページの 2D)で forest を あるき、左上の avg / p95 / p99 / >60 と calls / tris を くらべる。

## 5. fallback・セーブ

- WebGL が ない(Node の テスト)→ はじめの frame から 2D、そのあとも 2D(`tests/meguru-3d-prototype-test.cjs` 7)。
- context lost(ブラウザで `WEBGL_lose_context`)→ 3D の canvas を はずし、おなじ frame から 2D(3D モードの world を 2D で えがく = 見た目と あたりは そろった まま)。page error 0。しゃしん: `context-lost-3d-to-2d.jpg`。
- セーブに `meguru3d` の キーは ない。フラグは URL だけ。
- `npm test` 2796 / 2796(フラグなし の 既存 テスト ぜんぶ + 3D 8)。

## 6. 成功条件 / 失敗条件(判定)

| # | 成功条件 | いま | 根拠 |
|---|---|---|---|
| 1 | 擬似 3D より 立体感が 明確に 上 | **オーナー判断** | 固定 5 地点の 2D / 3D |
| 2 | ペラペラ感が 減る | **オーナー判断** | 木・岩に 体積と 視差 |
| 3 | pop-in / fade の 違和感が 減る | **オーナー判断** | 3D は 距離で 消さない(霧で とおく)。手前の 物は 半透明 |
| 4 | 木・岩が そこに ある 感 | **オーナー判断** | 〃 |
| 5 | player / party が solid を 貫通しない | 達成 | §3 |
| 6 | 道が 塞がれない | 達成 | §3 |
| 7 | 2D キャラの 立て看板が 馴染む | **オーナー判断** | 足もと 接地・かげ・木の うしろに かくれる |
| 8 | 27 party でも 実用性能 | **実機待ち** | headless は ソフトウェア GPU。JS 3.6 ms(4× で 22.8 ms)・draw call ≤ 55・三角形 ≤ 97 k |
| 9 | save 互換 | 達成 | §5 |
| 10 | region / travel / corridor 不変 | 達成 | 既存 テスト ぜんぶ 緑。corridor・transition は 2D |
| 11 | 既存 renderer へ 即 戻せる | 達成 | URL を はずす / WebGL 不可 / context lost |
| 12 | world logic の 大部分を 再利用 | 達成 | simulation・あたり・なかま・住人・環境 は そのまま。3D がわの 追加は world object の adapter と relocation だけ |

提案する 実機の しきい値(#8): iPhone で avg ≤ 20 ms・p95 ≤ 33 ms・60 ms 超 ≤ 1 回 / 分・5 分 で 30 fps を 下まわらない。

失敗条件(どれか 1 つで 全面 3D 化へ すすまない): iPhone で 重すぎる / 2D キャラが 馴染まない / asset 制作量が 大きすぎる / world data を ほぼ 作りなおす 必要 / collision・navigation が 重すぎる / 擬似 3D との 差が 小さい。

いま 見えて いる もの: asset は primitive だけで 足りて いる(外部 モデル 0)、world data は 作りなおして いない(adapter と 3D だけの 位置直し)、collision は 2D と おなじ しくみ。

## 7. 3D がわの のこり(prototype では やって いない)

- 2D の 演出で まだ ない もの: 木もれびの 光の すじ(canopy shafts)・雨 / 雪の つぶ・風の ゆれ・遠景(distant)・ランドマークの 近づき 演出。
- キャラの 表情(#278)は めぐるでは つかって いない(2D と おなじ)。ふきだし・名まえ は 2D canvas の 簡易 版。
- 半径 22 / 17.6 の 統一・4 秒の もどり fallback の おきかえ(正式な navigation)・物の 高さを つかう あたり・corridor C5・world object の collision model の 全体 は まだ(Roadmap §12 の のこり)。
- 3D の asset(texture / GLB)を ふやす ときの cache: ファイル名に 内容の hash、おなじ path は 上書き しない。Three.js は version 名の フォルダ(token いらない)。
