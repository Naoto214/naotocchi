# Character 3D Pilot — QA 記録(2026-10-01)

状態: **Human QA 待ち(needs_human_review)**。実装側では「採用」を きめない。main へ merge しない。Ready for review に しない。
architecture の 正本: [`docs/character-3d/architecture.md`](../character-3d/architecture.md)

- repo: `Naoto214/naotocchi` / branch: `feat/character-3d-pilot` / base: `main` @ `ebffaad921da29bf2b8b42e1bdccc97c922db280`(tree `492ea3b8…`)
- preview を 固定する commit: `98476f4c0f10e94531a447ad2e1bd5d05779c437`(この 文書の 追加 commit より 前。code は 同じ)
- 画像・計測: [`docs/qa/character-3d-pilot-2026-10-01/`](character-3d-pilot-2026-10-01/)

## 0. 人が さいしょに 見る もの

### iPhone preview(commit 固定・main に merge しない・Pages は さわらない)
方式は #365(`tools/preview-url.sh`)と 同じ: 公開 repo の commit を GitHub の file CDN で ひらく。**この 作業環境からは 3 つの CDN とも egress policy で つながらず、実機 / CDN での 表示は 未確認(NOT_VERIFIED)**。同じ commit を local server + headless Chromium で smoke 済み(下の 画像)。1 つ目が ひらかなければ 2 つ目・3 つ目。

| | URL(jsDelivr) |
|---|---|
| A. QA gallery | `https://cdn.jsdelivr.net/gh/naoto214/naotocchi@98476f4c0f10e94531a447ad2e1bd5d05779c437/character-3d/gallery.html` |
| B. めぐる で Character 3D | `https://cdn.jsdelivr.net/gh/naoto214/naotocchi@98476f4c0f10e94531a447ad2e1bd5d05779c437/index.html?meguru3d=1&char3d=1&perf=1` |
| C. 同じ 条件の 2D | `https://cdn.jsdelivr.net/gh/naoto214/naotocchi@98476f4c0f10e94531a447ad2e1bd5d05779c437/index.html?meguru3d=1&perf=1` |

かわりの host(中身は 同じ commit): `https://rawcdn.githack.com/naoto214/naotocchi/98476f4c0f10e94531a447ad2e1bd5d05779c437/…` / `https://cdn.statically.io/gh/naoto214/naotocchi/98476f4c0f10e94531a447ad2e1bd5d05779c437/…`

- B / C の セーブは その CDN の origin の localStorage(production の セーブとは べつ)。3D に なるのは **forest**(main の World 3D は forest だけ)と、**pilot の species / 段**(下の 表)。それ以外の actor は 立て看板の まま(仕様)。
- B で 自分を 3D に するには、pilot の species(いぬ / ペンギン / クマノミ / 人 / ちょう / タンポポ / キノコ / ヒトデ)で あそぶ。なかまの **しば・ねこ(きまぐれなねこ)** は archetype 再利用で 3D。
- `&c3dface=A` / `B` で 顔の 方式を かえられる(C が 既定)。

### 代表 画像
- 全 pilot 2D ↔ 3D: `character-3d-pilot-2026-10-01/lineup.jpg`
- species ごと 2D 正本 + 3D 正面 / 3/4 / 横 / 後ろ: `<species>-views.jpg`(8 枚)
- 成長 01 / 04 / 08(2D 上・3D 下): `<species>-stages.jpg`(8 枚)
- 表情 normal / positive / dislike / tired / sick(Expression PNG 上・3D 下): `<species>-emotions.jpg`(8 枚)
- 顔の 方式 A / B / C: `face-modes.jpg`
- めぐる(forest)の 中: `meguru/forest-entry-3d.jpg` ↔ `meguru/forest-entry-2d.jpg`、横・住人(キノコ / ちょう)・夜雨・木の うしろ・fallback・27 体、species ごと の player: `meguru-player-per-species.jpg`、通常距離の 表情: `gameplay-emotions.jpg`
- #367(全地域 3D)と いっしょに うごくかの **local だけの 確認**(merge も push も して いない): `integration-probe-367-local-only/city-*.jpg`・`home-*.jpg`

**静止画では animation を 承認しない**。うごき は gallery の「あるく / およぐ」「reaction」と めぐる で 見る。

### performance の 見かた
B の `&perf=1` で 左上に: 1 行目 = frame の 間隔(avg / p95 / p99 / 60ms 超)、2 行目 = draw call・三角形・texture・JS、3 行目 `c3d` = 3D キャラ数・template 数・三角形・material・fallback 数。**iPhone の 値は 実機で 見る**(下の 表は headless の ソフトウェア GPU)。

## 1. Fresh audit(GitHub remote が 正本)

- main HEAD `ebffaad`(Merge PR #370 Motion v2 recovery)・tree `492ea3b`。open PR 10(#369 / #368 / #367 / #365 / #364 / #302 / #300 / #298 / #259 / #92)。remote branch 191。
- Character World master(`character-world-master.v1.js`): player 31 line × 8 段(normal 22 + rare 8 + secret 1)・なかま 26・こいびと 18・作者。画像 297 + Expression PNG 2484 + relationship 88。
- Expression: `emotion-state.js`(Home の 状態 → profile)→ `pet-expression.js`(profile → 11 表情・stage PNG 解決)/ `relationship-expression.js`(normal / positive / lonely)。
- めぐる: actor は `meguru.js` の `makeActor`(form は line + 0 はじまり stage、companion / partner は id、`emotion` は 住民生活の 7 語)。player の 段は bridge の `currentPetKey()`。
- `meguru-3d.mjs`: forest だけ 3D(hybrid)、キャラは PNG 立て看板。flag `?meguru3d=1`(URL だけ)。
- #368: canonical emotion 8 語 + `EXPRESSION_FOR.stage`(positive→happy、dislike→sulky)を 確認(未 merge・取りこまない)。
- #367 / #369: World の 全地域化・foundation(未 merge・取りこまない)。#365: commit 固定 preview の 方式。

## 2. 全 species archetype inventory

`SPEC.inventory()` = 293 行。必要 archetype = **17**(pilot で builder 12 = 228 行 78% を おおう)。表は architecture §3。

## 3. pilot species と 選定理由

| species | 段 | archetype(段ごと) | 理由 |
|---|---|---|---|
| いぬ | 01 / 04 / 08 | quadruped | 4 足の 代表。耳(たれ → 立ち → たれ)・脚・姿勢(ふせ / 立ち / おすわり) |
| ペンギン | 01 / 04 / 08 | avian | 鳥・2 足。ひな の ふわ毛 → 換羽 → 大人 + つえ |
| カクレクマノミ | 01 / 04 / 08 | fish | 水の 代表。うかぶ / およぐ。すけた 仔魚 → しま |
| おとこのひと | 01 / 04 / 08 | humanoid | 2 足 人型(人 3 line・人型 なかま / こいびと が つかう)。はいはい → 学生 → つえ |
| ちょう | 01 / 04 / 05 / 08 | larva → pod → winged_insect | 変態(トポロジーが かわる)。いもむし → ぶら下がり → さなぎ → ちょう |
| タンポポ | 01 / 04 / 06 / 08 | pod → plant → plant → cluster | 植物。たね → ロゼット → 花 → わたげ |
| キノコ | 01 / 04 / 08 | cluster → fungus | 菌類。胞子 → 顔が かさ → 顔が え + 子キノコ |
| ヒトデ | 01 / 04 / 08 | blob → radial | 放射 + unusual。すけた 幼生 → 5 本うで |
| (しば・ねこ) | — | quadruped | archetype 再利用の ためし(数字と 色 だけ。pilot の 数に 入れない) |

## 4. asset 方式(procedural / Blender / GLB)

| 方式 | 結果 |
|---|---|
| procedural(採用候補) | code 132 KB(gzip 44 KB)で pilot 26 template 全部。1 template の build 平均 26 ms(Node・初回 JIT こみ、最大 97 ms)。1 frame 1 template に 分散 |
| GLB(比較) | 同じ 26 model を GLB に すると 4.4 MB(gzip 1.36 MB = 1 template 52 KB)。parse 平均 3.6 ms。build より はやいが 容量は 30 倍(`glb-vs-procedural.json`、tool `tools/character-3d/glb-compare.mjs`) |
| Blender | **NOT_RUN**(この 環境に Blender なし)。外部サービス登録も 外部 asset も つかわない |

全量化で build の ヒッチが 問題に なれば「procedural で 作って GLB に bake」は 同じ code で できる(tool あり)。

## 5. stage system / rig / animation / expression

architecture §5 / §9 / §7 / §8。補完した side / back の デザインは `SPEC.PILOT[id].designFill`(例: いぬの 背は 2D の 色を のばして 背の まんなかを すこし こく、ちょうの はねの うらは うすい 青、ヒトデの うらは こい 無地)。

## 6. めぐる runtime(実 world)

| 確認(`tools/character-3d/meguru-qa.cjs` の assert・`meguru/meguru-qa.json`) | 結果 |
|---|---|
| forest: world 3D + キャラ 3D(player + しば + ねこ + 近くの 住人) | PASS(9 体 3D・world は 3D) |
| 3D → 2D(`setChar3D(false)`): 3D キャラ 0・world は 3D の まま / 2D → 3D: 同じ 数に もどる | PASS |
| player を 120 frame 連続で 3D で えがく | PASS(120 / 120) |
| actor 単位 fallback(しば だけ update を こわす)→ しば だけ 立て看板、ねこ・player は 3D、renderer は failed に ならない | PASS |
| 地域 きりかえ forest → city(main では 2D の world)→ forest: city で 3D キャラ 0、もどると scene の 3D = live(ghost なし) | PASS |
| species ごとの player | PASS(いぬ 04・ペンギン 04・クマノミ 03→04 の 数字・人 04・ちょう 02→01・タンポポ 02→01・ヒトデ 03→04 = 3D、**キノコ 02 = 2D**(02 は 菌糸 = tentacled で pilot に ない archetype → 正しく 立て看板)) |
| page error | 0(warning 1 = QA で わざと こわした しば) |
| 2 つ目の 環境 | main では forest だけが 3D world。夜 + 雨 の forest・木の うしろ を 確認。city / home は **#367 との local だけの 統合で 確認**(`integration-probe-367-local-only/`・error 0・city 4 体 / home 5 体 3D) |

scale / ground / shadow: 3D は 2D の art box と 同じ 大きさ、足もと y 0、浮く species は かげを 小さく。collider は 既存の まま。
occlusion: World の 既存の すかし(木の ghost)が そのまま はたらき、player は 木の うしろでも 見える(`meguru/forest-occlusion-3d.jpg`)。キャラ自身は 透明に しない。

## 7. performance(headless Chromium + SwiftShader・dpr 2・390×844・forest entry を 8 秒 あるく)

**注意: SwiftShader は CPU で 描画する ので frame 時間は 2D でも 150 ms 前後。iPhone の 値では ない。** 比べられるのは draw call・三角形・texture・material・bone・presenter の CPU。
1 / 5 / 27 体 = player + パーティ(pilot に ない なかまは 計測用の **代役** として pilot の model で 3D に する。住人は 0)。

| | draw calls | 三角形(画面) | textures | geometries | 3D actor | template | 3D 三角形 | mesh | bone | material(共有) | 顔 atlas | presenter CPU avg / p95 | template build 合計 / 最大 | JS heap |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---:|
| 1 体 2D | 31 | 97.9 k | 17 | 21 | — | — | — | — | — | — | — | — | — | 20.5 MB |
| 1 体 3D | 39 | 101.0 k | 16 | 32 | 1 | 1 | 4.1 k | 13 | 10 | 1 | 1 | 1.3 / 0.5 ms | 70 / 70 ms | 20.5 MB |
| 5 体 2D | 32 | 96.9 k | 19 | 20 | — | — | — | — | — | — | — | — | — | 23.1 MB |
| 5 体 3D | 91 | 117.5 k | 22 | 61 | 5 | 4 | 18.7 k | 63 | 48 | 1 | 2 | 3.0 / 22.9 ms | 168 / 65 ms | 23.1 MB |
| 27 体 2D | 54 | 97.3 k | 41 | 20 | — | — | — | — | — | — | — | — | — | 20.5 MB |
| 27 体 3D | 280 | 188.8 k | 49 | 91 | 27 | 10 | 86.7 k | 252 | 171 | 1 | 8 | 7.3 / 38.9 ms | 398 / 71 ms | 24.5 MB |

(frame avg / p95 は `meguru/meguru-qa.json` に あるが SwiftShader の 値なので 判断に つかわない。memory 見積もり: 1 template ≒ 3.5 k 三角形 × 頂点 11 float ≒ 130 KB の GPU buffer、27 体 10 template ≒ 1.3 MB + 顔 atlas 1024×128 × 8 ≒ 4 MB)
読みかた: 27 体で draw call は 2D の 約 5 倍(1 actor ≒ 9 mesh)。iPhone で 重ければ 次の 手(Human QA の 結果で きめる): 遠い actor の 立て看板 LOD を ちかく する・bone の すくない 低 LOD・同じ template の instancing。

## 8. dedicated tests(`tests/character-3d-test.cjs`・`npm test` に 追加)

**34 / 34 PASS**(1 spec / inventory / archetype / spec の 正しさ / stage 解決 / 一様 scale でない 成長、7–11 表情 5 つ、12 canonical との 一致、13–19 2D 維持・flag・セーブしない・actor 状態 共通・移動 logic 不変・actor 単位 fallback・world を 落とさない、20–28 cache・表情 cache・片づけ(actor / 地域 / 2D↔3D)・player・party・住人 境界・reduced motion、29–34 asset・既存 asset の digest・save / schema・World 3D / Home / Relationship の 回帰)。
ブラウザの 実描画は `tools/character-3d/meguru-qa.cjs`(assert つき・PASS)。

## 9. remove-it(`tools/character-3d/remove-it.sh`・`remove-it.txt`)

13 / 13 RED: A archetype mapping 削除 / B stage parameter 削除 / C emotion mapping 削除 / D fallback 削除 / E template cache 削除 / F 顔 atlas cache 削除 / G actor cleanup 削除 / H 2D↔3D cleanup 削除 / I player visibility guard 削除 / J reduced motion 削除 / K 立て看板を かくさない / L #368 の canonical を 無視 / M 成長を 一様 scale だけに。
(はじめの 実行で F と M が GREEN だった → テスト 21 に「同じ style の template は atlas を 共有」を 足し、M を ほんとうの「一様 scale」mutation に した。)

## 10. full regression

- `npm test`: smoke / dialogue / visual-qa の script は OK。`node --test` 2840 件 中 **2839 PASS / 1 FAIL**。
  FAIL = `tests/illustration-catalog-test.cjs`「every shipped UI/game emoji has an illustrated display definition — unmapped symbols: ★ ♡」。**未変更の origin/main でも 同じく FAIL**(この branch の 原因では ない。直さない)。
- そのため `npm test` の 最後の 段(relationship 3 file)は `&&` で はしらない → 別に 実行して **80 / 80 PASS**。
- World 3D(`meguru-3d-prototype-test`)・Home Expression(`pet-expression*`・`emotion-*`)・Relationship・save(`save-*`・`migration`)・asset gate(`asset-versions`・`asset-integrity`)は 上の 2839 に ふくまれ PASS。

## 11. 他 lane との conflict audit(read-only・merge しない)

| lane | 機械的 conflict(`git merge-tree`) | semantic |
|---|---|---|
| #368 Resident Expression | `index.html`(cache token 行)・`package.json`(test 行)。`meguru-3d.mjs` は 自動 merge | なし。#368 の `a.expr.emotion` を 3D が そのまま 読む(テスト 27)。#368 の 写し(8 語・LIFE_EMOTION)は merge 後に #368 の module と くらべる 形へ |
| #367 All Regions 3D | `index.html`(token)。`meguru-3d.mjs` は 自動 merge | なし。local 統合で city / home の 3D world に 3D キャラが のる(error 0) |
| #369 Foundation v2 | `index.html`・`package.json`・**`meguru-3d.mjs` 4 hunk**(perf 行・QA まど・camera far・player の placeActor) | **1 つ**: #369 の player 可視判定(`billboardVisible(pm)`)は 立て看板を 見る。3D の player は 立て看板を かくす ので「見えない」と 判定される。統合時は `cp && cp.has(player)` の ときは 3D holder の 可視で 判定する。ほか(camera far 12000・shader compile・ghost pool・fog)は 共存できる |
| #365 preview URL | なし | なし |
| ほか(#364 / #302 / #300 / #298 / #259 / #92) | 対象 file が かさならない | なし |

`index.html` の token は 衝突しやすい ので、この branch は **かわった 2 file(`meguru-3d.mjs`・`script.js`)の token だけ** 更新(`npm run bump` の 全 token 書きかえは しない)。

## 12. full rollout の 見積もり(Human QA で 採用 と きまった ばあい)

| 項目 | 見積もり |
|---|---|
| archetype | 17(済 12 + arthropod / tentacled / tree / object / celestial(special))。新しい builder 1 つ ≒ 0.5〜1 日 |
| species-specific model 数 | 0(species 専用 builder は つくらない)。species × 段 の 数字 = player 31 × 8 = 248 段 + なかま 26 + こいびと 18 + 作者 1 = **293 spec** |
| stage 展開 | 1 species 8 段 ぶんの 数字(いぬで 1 段 ≒ 15 行)。topology が かわる 段だけ archetype を かえる |
| expression | 追加 0(canonical 8 語 × 共有 目 6 形 × style ごとの atlas 1 枚 を 実行時 canvas で) |
| asset 数 / repo size | 3D の binary 0。code は 現在 132 KB → 全量で 約 400 KB(gzip ≒ 110 KB)。**GLB に すると ≒ 50 MB(gzip ≒ 15 MB)**(採らない) |
| network | 3D を つかう ときだけ code を 1 回(gzip ≒ 110 KB)。species ごとの 追加 download なし |
| 実装工数 | builder 5 本 ≒ 4〜5 日 + species 75 × (8 段の 数字 + gallery で 2D と 見くらべ)≒ 2〜4 時間 = 150〜300 時間。gallery / sheets / tests の しくみは そのまま つかえる |
| 容量の 爆発 | なし(procedural)。GLB 方式は pilot で 止めた |

## 13. known gaps(正直な 残り)

- **iPhone 実機・CDN preview は 未確認**(egress で 到達不可)。性能は SwiftShader の 値だけ。
- 通常の カメラ距離では 顔(目・口)は 小さく、表情は おもに **姿勢 + あたまの うえの accent** で 読む(`gameplay-emotions.jpg`)。読めるかは Human QA。
- player は ほとんど 後ろ姿(カメラが うしろ)。後ろから species が わかるか が だいじ(`meguru-player-per-species.jpg` 下の 段)。
- いぬ 04 の 2D は「遊ぼう の おじぎ」姿勢・クマノミ 05 は 群れ など、**2D の 1 枚絵の ポーズ**は 3D では idle / locomotion に おきかわる。
- ちょう 08 の はね(はばたき途中の フレームで 静止画が うすく 見える)、タンポポ 04 の 葉の 量、ヒトデ 01 の 形は 2D との 差が 大きめ。
- template の build は 初回 26 ms 前後(最大 97 ms)。1 frame 1 つに 分散して いるが、はじめて 見る species で 小さな ヒッチが ありうる。
- presenter の CPU は 27 体で 平均 7 ms(SwiftShader 環境で 描画と CPU を 共有)。iPhone で 要 計測。
- pilot に ない 段は 同じ archetype の 近い 段を つかう(例: クマノミ 03 → 04 の 数字)。全量化で 8 段 すべてを 書く。
- 装備の 3D socket は 名前の 予約だけ(2D 装備仕様は 不変)。
- 既存の 立て看板の 片づけ(出なかった actor の billboard を 捨てる)を 3D renderer に 追加した(以前は 隠すだけで map に のこって いた)。2D renderer(flag なし)は 不変。

## 14. Human QA の 判断項目(人が きめる)

1. 原画と 同じ キャラに 見えるか(名前を かくしても 同じ species と わかるか)
2. front だけで なく side / back も 自然か
3. 01 → 04 → 08 が 同じ species の 成長に 見えるか
4. normal / positive / dislike / tired / sick が 原画と 同じ 意味に 見えるか
5. locomotion が species に あうか(4 足 / よちよち / およぐ / しゃくとり / はばたく / ゆれる / はねる / 星の ゆれ歩き)
6. 箱庭 world に なじむか
7. 2D billboard より 明確に よいか
8. 通常 カメラ距離でも species と 表情が 読めるか
9. iPhone で 重くないか(`&perf=1`)
10. 27 体 相当でも 成立するか
11. この 方式を 全量展開したいか — 顔の 方式(A / B / C)も あわせて

分岐: A 採用 → architecture 正本化 → full rollout 計画 / B 条件付き採用 → archetype・顔・うごき を なおして pilot 再確認 / C 不採用 → 2D billboard 維持・pilot は 研究成果として 保存。**実装側からは えらばない。**
