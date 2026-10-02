# めぐる Resident Expression System — 2026-10-01

独立 lane(branch `feat/meguru-resident-expression`)。Home で 完成・main 着地ずみの Expression System を 共通資産として そのまま つかい、めぐる住民の 生活状態・出来事・会話と 表情を 接続する。**新しい 表情画像は 1 まいも つくらない。** main merge は しない(Draft PR まで)。

## A. GitHub HEAD / tree / branch

| | 値 |
|---|---|
| 基準 main HEAD | `591b9def6a88733721249f80d3138087d00764f0`(Merge PR #366 Relationship Expression)・tree `58f91270e6eca091646dee02238661eee09d5ea7` |
| branch | `feat/meguru-resident-expression`(latest main から 独立。#367 は 取りこまない) |
| 変更 | `resident-expression.js`(新規 196 行)・`meguru.js`(+88 行の 接続点)・`meguru-3d.mjs`(actorTexture 8 行)・`index.html`(script tag 1 つ + token 3 つ)・`package.json`(テスト 1 本)・`tests/helpers/runtime-harness.cjs`(sandbox に module 1 つ)・`tests/meguru-test.cjs`(spriteFor の 契約に `base` を 追加)・新規 テスト / tools / この文書 / 画像 |
| さわって いない | `pet-expression.js`・`relationship-expression.js`・`emotion-state.js`・`script.js`・`assets/**`・save / schema |

## B. fresh 監査(remote を fetch して たしかめた こと)

- **Expression System の 正本(main)**: `pet-expression.js`(Home pet: `resolve(emotion, {blocked, sleeping, reaction})` → 11 状態 `normal/happy/strained/sulky/hungry/sick/tired/weak/critical/wantsPlay/sleeping`、`assetFor(base, expression)` が `assets/characters/expressions/<line>/<0n>-<expression>.png` を 返す。31 系統 × 8 段 × 10 表情 = 2484 枚)。`relationship-expression.js`(なかま 26 / こいびと 18 の `normal/lonely/positive`、`assets/characters/relationship/<id>/{positive,lonely}.png` 88 枚)。`emotion-state.js`(Home の お世話信号 → emotion profile)。
- **めぐる住民生活 v1**(main 上の `meguru.js`): `makeActor` が `emotion: 'normal'`・`joy/sulk/energy/wish` を もち、`updateEmotion` が `RESIDENT_EMOTIONS = ['normal','happy','tired','sleeping','unhappy','wantsPlay','strained']` を きめる。**emotion は 描画に いっさい つかわれて いなかった**(`lifeOf` の debug 表示だけ)。ユーザー指示の「PR #291」は GitHub 上では「めぐる疑似3D v1 完成」(merged 2026-09-18)で、住民生活 v1 は その後の main コミットに 含まれる。正本は main の `meguru.js` と `tests/meguru-life-test.cjs`。
- **resident emotion の 接続口**: `updateEmotion(a, e, world, dt)`(住民 1 体ずつ、detail / near 層だけ)と `talk()`(プレイヤーが はなす)。joy は talk / gather / play の おわり(`a.joy = rnd(10, 26)`)で 入る。**sulk と wish を 増やす 経路は v1 に 存在しなかった**(unhappy / wantsPlay は 定義だけ)。
- **resolver / registry**: すがた(form)の base は `assets/characters/<line>/<0n>.png` で、`pet-expression.js` の `STAGE_ASSETS` が 31 系統 すべてを 登録ずみ。なかま / こいびとの base は `companions/<id>.png` / `partners/<id>.png` で、`relationship-expression.js` の `SUPPORTED` が 26 + 18 を もつ(`kinoko` は `clock` の alias で canonical 26 に 含まれる)。
- **current meguru resident rendering**: 2D は `drawSprite` → `spriteFor(a, facing)` → `imageFor(asset)`(+ `bakedSprite` cache、`SPRITE_CACHE_MAX 160`)。3D(`meguru-3d.mjs`、`?meguru3d=1`・forest だけ)は `actorTexture(a)` → `M.spriteFor(a,'front')` → `M.imageFor(asset)` → `THREE.Texture`(`texCache` に asset ごと 1 まい)→ `placeActor` が `material.map` を さしかえる **PNG billboard**。**完成ずみ Expression PNG は この billboard texture に そのまま のる**(おなじ 128×128 PNG)。
- **open PR**: #367(All Regions 3D v0・Draft)、#365(preview URL tool・Draft)、#364(forest 3D cleanup・Draft)、ほか docs / 古い もの。#367 は `meguru.js`(+271 / 3D world objects・discovery notice・exports)・`meguru-3d.mjs`(+137 / 遮蔽・材質・地域 profile)・`index.html`(token 2 行)・`tests/meguru-3d-prototype-test.cjs`・`tests/meguru-discovery-test.cjs`。
- **tests / Roadmap / QA**: `npm test` は 1 本の 長い コマンド(`tests/meguru-life-test.cjs` が emotion の 契約を もつ)。Roadmap は `docs/roadmap/naotocchi-release-hardening-roadmap-2026-09-24.md`。CI は `runtime-smoke-test.yml`(npm test)と `home-layout.yml`(Playwright)。

## C. canonical emotion mapping(1 か所: `resident-expression.js`)

```
resident life / event → canonical emotion → expression mapping → Expression asset resolver(Home 正本) → renderer(2D / 3D billboard)
                                                                                                        → dialogue
```

| 住民生活 v1 の 名まえ | canonical | すがた(stage: Home の 11 状態) | なかま / こいびと(relationship) | 発火する 出来事 |
|---|---|---|---|---|
| `normal` | `normal` | normal(base) | normal(base) | ふつうに あるく・すわる・ながめる |
| `happy` | `positive` | **happy** | **positive** | はなしかけられる(`talk`)・はなし / あつまり / あそびが おわる(`talk_end` / `gather_end` / `play_end`) |
| `unhappy` | `dislike` | **sulky** | normal(※ lonely は「さみしい」なので あてない) | ねむって いる ところを おこされる(`talk_wake`)・20 秒いないに また はなしかけられる(`talk_pester`) |
| `tired` | `tired` | **tired** | normal | energy < 0.22(あるきつづけた) |
| `sleeping` | `sleeping` | **sleeping** | normal | behavior = sleep |
| `strained` | `strained` | **strained** | normal | 雨 / 雪で 屋根が なく energy < 0.55 |
| `wantsPlay` | `wantsPlay` | **wantsPlay** | normal | wish > 2(v1 の 既存ロジック) |
| (なし) | `sick` | **sick** | normal | **発火しない**(住民生活に 病気の 信号が ない。語彙と mapping だけ 用意。QA の `?mgexprforce=sick` で 見られる) |

- 未使用のまま のこす Home の 状態: `hungry` / `weak` / `critical`(お世話の 状態。住民には 意味が ない)、`lonely`(なかまの「さみしい」。将来の 住民生活の 信号が できたら 接続)。
- ランダムに 表情を かえる 経路は ない。`updateEmotion` は 生活の 信号(behavior / energy / joy / sulk / wish / 天気)だけから 決め、resident-expression は その emotion を 写すだけ。同じ seed → 同じ 顔(テスト 16)。

## D. resident coverage(repo の 正本から 列挙)

対象 = `buildRegistry()` が 返す 住民。テストでは ずかん(`ALL_LINES` 31 系統)の 全コマ + なかま 26(canonical)+ こいびと 18 を ぜんいん 登録して 列挙する。

| 種類 | 体数 | family | 画像 |
|---|---|---|---|
| すがた(form) | 247(248 コマ − いまの 自分 1) | stage | normal + 7 表情 = 1976 枚 を 解決。欠け 0 |
| なかま(companion) | 26 | relationship | normal + positive = 52 枚。欠け 0 |
| こいびと(partner) | 18 | relationship | normal + positive = 36 枚。欠け 0 |
| ナオト | 1 | none | いつも base |

`RX.audit(residents, {strict:true})` が 291 体 × 8 emotion = 2328 組で fallback 0(テスト 1)。pilot(cat/06・dog/03・frog/05・たぬき・ねこ社長)で 自動検証 GREEN の あと、同じ 作業内で 全住民へ 一般化した(手がきの 一覧は つかわない。species / kind × canonical emotion から 共通 mechanism で 解決)。

## E. 2D 接続

- `syncExpression(a, world)`(`updateEmotion` の 最後)が `a.expr = { emotion, family, expression, asset, base, fallback }` を つける。**emotion が かわった とき だけ** resolve(`sync` は 同じ emotion・同じ base なら 同じ object を 返す)。
- `spriteFor(a, facing)` が `{ asset, base, flip }` を 返す。`asset` = 表情の え(なければ base)。renderer は きもちの 名まえを 知らない(テスト 11 が source で しばる)。
- `drawSprite`: `imageFor(asset) || imageFor(base)`。表情の えが まだ decode されて いない あいだは base(ふつう)。絵文字へ 落ちたり ちがう 顔を 出したり しない。`bakedSprite` の cache は `im.src` key なので 表情ごとに 1 まい。

## F. 3D billboard 接続

- `meguru-3d.mjs` の `actorTexture(a)` を `[sprite.asset, sprite.base]` の 順に ためす 8 行だけ 変更。表情が かわると `placeActor` が `material.map` を さしかえる(`texCache` に asset ごと 1 まい。decode しなおさない)。
- **2D / 3D で 別の emotion 実装は つくらない**: どちらも `spriteFor` の `asset / base` だけを 読む。将来 3D character model へ うつる ときは `resident-expression.js` の `resolve`(asset)を Blend Shape / animation の 解決に 差しかえるだけで、`emotion → expression` までは そのまま。
- 実機 headless(swiftshader)で `?meguru3d=1&mgexprforce=positive|sick` を 撮影: `is3D = true`、page error 0(`3d-positive.jpg` / `3d-sick.jpg`)。
- memory: texture は 128×128 RGBA(64 KB)。1 地域の 住民 ≤ 48 体(`LIFE.maxDetail`)× 自然に 出る 表情 ≤ 6 で 最大 約 300 枚 = 約 19 MB の 上限。texture の LRU は つけていない(S. known gaps)。

## G. dialogue 連携

- `talkLine(a)`: emotion が `normal` 以外なら `resident-expression.js` の `DIALOGUE[canonical]` から 選ぶ(ナオトの 台詞は これまでどおり)。`normal` の ときは 既存の あいさつ / 天気 / 季節 / 場所の 台詞。
- `talk()`: 出来事(`talkEvent`: ねむって いた → `talk_wake`、20 秒いないの 2 回目 → `talk_pester`、それ以外 → `talk`)→ `applyReaction`(joy / sulk)→ `updateEmotion(dt 0)` → `talkLine`。**顔と 台詞は おなじ `a.emotion` から 出る** ので「うれしい 顔 + いやがる 台詞」は 構造上 出ない。`consistent(emotion, line)` と `dialogueEmotion(line)` で テストが 検出する(テスト 8)。
- 既存の Home 会話資産(`pet-expression.js` の REACTIONS など)は さわらない。

## H. temporary / persistent state の 契約

- **persistent**(`a.emotionPersistent`): `sleeping` > `tired` > `wantsPlay` > `strained` > `normal`。生活の 状態 そのもの。
- **temporary reaction**: `joy`(`REACTION.positive` 10〜26 秒)/ `sulk`(`REACTION.dislike` 6〜12 秒)。せかいの dt で へる。
- **effective**: `sleeping` なら `sleeping`、そうでなければ `reaction || persistent`(v1 の ならびと 同じ)。reaction が きれたら **その時点の persistent へ もどる**(つかれて いれば tired。normal 固定では ない。テスト 7)。
- 住民が 画面外へ 出る / 地域を うつる / 2D⇄3D: `expr` は actor object に ついて いて、せかいを 組みなおすと actor は 新しい object(`expr: null` から はじまる)。3D の `built.actors` は せかいごとに dispose。フラグ off(`setResidentExpression(false)`)は 全員の `expr` を すぐ 消す(テスト 9)。
- save には なにも 書かない(テスト 13: フラグ on / off で セーブの key・`schemaVersion 5`・`lifetime.meguru` が 同一)。

## I. fallback

| 状況 | production | dev / test(`strict`) |
|---|---|---|
| 未知の emotion | normal(base)、`fallback: 'unknown-emotion'` | throw |
| すがたの base が 登録に ない(legacy 系統など) | normal(base)、`'missing-variant'` | throw |
| なかまの id が `SUPPORTED` に ない(alias など) | normal(base)、`'unsupported-id'` | throw |
| Home module が 読めて いない | normal(base)、`'no-resolver'` | throw |
| 表情の えが まだ decode 前 | base を 描く(renderer) | — |
| mapping で normal に なる(なかまの tired など) | base(**fallback では ない**。`fallback: null`) | — |

「だまって ちがう 顔を 出す」経路は ない(テスト 2 / 14。`createSimulation({strictExpression:true})` は 欠けた 住民が きもちを もった 瞬間に throw する)。

## J. performance / cache

- 毎 frame 再 resolve しない: `sync` の identity cache(テスト 16: 30 秒で 住民の 1/3 以上が 一度も 再 resolve しない。再 resolve 回数 ≤ emotion の 変化回数 + 初回)。
- 表情が かわった 瞬間に `imageFor(asset)` で decode を はじめる(renderer は よめるまで base)。
- 2D: `bakedSprite` は `im.src` key、3D: `texCache` は asset key。どちらも 既存の cache を そのまま つかう。texture churn / 再 decode なし。
- 遠い 住民(tier 2)は `updateActor` が 走らない ので resolve も 走らない(近づいて 更新されて から)。

## K. dedicated tests(`tests/meguru-resident-expression-test.cjs`、17 件)

| # | 内容 |
|---|---|
| 1 | 全住民(registry 由来 247 + 26 + 18)× canonical emotion → 正しい Home 資産(存在・family ごとの フォルダ・strict audit) |
| 2 | normal fallback(legacy base / ナオト / alias id / 未知 emotion / base なし) |
| 3 | positive event(talk)→ happy(form)/ positive(companion・partner)+ positive 台詞 |
| 4 | dislike event(pester / wake)→ sulky + dislike 台詞。なかまは base の まま(lonely を 出さない) |
| 5 | sick → sick 資産。生活からは 一度も sick が 出ない。QA 固定のときだけ 出て 台詞も sick |
| 6 | tired → tired + tired 台詞(reaction が のると positive、きれると tired) |
| 7 | temporary reaction の ながさ(REACTION)と persistent(tired / normal)への 復帰、sleeping 優先 |
| 8 | dialogue と expression の semantic 一致(全 emotion × 12 回 + talk 20 回。happy 顔 + dislike 台詞 を 禁止) |
| 9 | resident 切替 / 新しい せかい / flag-off で 前の expression が のこらない |
| 10 | 2D renderer: 表情の えが drawImage に とどく。decode 前は base |
| 11 | 3D billboard: `actorTexture` が おなじ `spriteFor` 契約(asset → base → glyph)。2D / 3D の renderer に きもちの 語彙が ない |
| 12 | flag-off で base の まま。Home module(pet / relationship / emotion-state)の sha256 が main と 同一、API 凍結 |
| 13 | save / schema 不変(フラグ on / off で key・schemaVersion・lifetime.meguru 同一、save 文字列に expr 系の 語が ない) |
| 14 | missing asset を strict で 検出(resolve / audit / 世界の 中)。production は だまって base |
| 15 | 既存 Expression 画像 2484 + 88 枚の 件数と aggregate sha256 が 不変 |
| 16 | emotion が かわった とき だけ resolve、同じ seed → 同じ 顔 |
| 17 | mapping は 1 か所。未使用 状態(hungry / weak / critical / lonely)を 残す。EVENT_REACTION / talkEvent / familyOf |

## L. remove-it(`sh tools/meguru-resident-expression-remove-it.sh`)

接続点を 1 か所ずつ こわして 専用テストが 赤に なる ことを たしかめた(baseline 17 / 17)。

| 変異 | 場所 | 結果 | 赤に なった テスト |
|---|---|---|---|
| A mapping: positive → normal(stage) | resident-expression.js | 7 / 17(RED) | 1,2,3,7,9,10,11,13,14,17 |
| B mapping: dislike → happy(semantic mismatch) | resident-expression.js | 12 / 17(RED) | 1,4,7,8,17 |
| C resolver: stage family が Home の assetFor を 呼ばない | resident-expression.js | 5 / 17(RED) | 1,3,4,5,6,7,8,9,10,11,13,14 |
| D fallback: fallback で ちがう 顔を のこす(silent) | resident-expression.js | 16 / 17(RED) | 2 |
| E strict: throw しない | resident-expression.js | 16 / 17(RED) | 14 |
| F sync: 毎回 再 resolve(identity cache なし) | resident-expression.js | 16 / 17(RED) | 16 |
| G dialogue: emotion の 台詞を 無視 | meguru.js | 12 / 17(RED) | 3,4,5,6,8 |
| H temporary reaction が きれない | meguru.js | 16 / 17(RED) | 7 |
| I reaction の あと persistent では なく normal へ | meguru.js | 14 / 17(RED) | 6,7,8 |
| J reset: 設定 off で stale な expr を 消さない | meguru.js | 16 / 17(RED)※ | 9 |
| K talk event: pester が dislike に ならない | resident-expression.js | 15 / 17(RED) | 4,17 |
| L spriteFor が expr を 無視(renderer に 顔が とどかない) | meguru.js | 14 / 17(RED) | 3,10,11 |
| M 2D の decode 前 base fallback を 外す | meguru.js | 16 / 17(RED) | 10 |
| N 3D billboard の base fallback を 外す | meguru-3d.mjs | 16 / 17(RED) | 11 |
| O 新しい せかいに 設定を わたさない(表情が だまって off) | meguru.js | 7 / 17(RED) | 3,4,5,6,7,8,9,10,13,14 |
| P sick が 病気なしで 出る(tired → sick) | meguru.js | 14 / 17(RED) | 6,7,8 |

※ J は 最初の 実行では 検出できなかった(`setResidentExpression(false)` 自体も expr を 消す ため)。テスト 9 に「設定だけを 直接 off に して 1 step → expr が null」を 足して 再実行し、RED(9)を 確認した。16 / 16 の 変異が 赤。

## M. full npm test

`npm test`(2026-10-01、この container・Node 22.22):

- 前段(`smoke-test.js` / `dialogue-test.js` / `visual-qa-test.cjs`): PASS
- 本体 `node --test`(136 file): **2815 tests / 2814 pass / 1 fail**。fail は `tests/illustration-catalog-test.cjs`「every shipped UI/game emoji has an illustrated display definition」(`★ ♡` unmapped)で、**origin/main の 純粋な worktree でも 同じ 1 件が 赤**(この container の 環境依存。CI の main は GREEN)。この lane の 変更とは 無関係。
- その 1 件で `&&` の 連結が 止まる ので、後段の relationship 群は 別に 実行: `relationship-expression-test` / `relationship-expression-integration-test` / `relationship-reaction-test` **80 / 80 pass**。
- Home expression 群を 単独でも 再実行: `emotion-state-test` / `pet-expression-test` / `pet-expression-assets-test` / `cat-expression-preview-test` / `emotion-integration-test` / `pet-expression-integration-test` **1253 / 1253 pass**。
- 専用 `meguru-resident-expression-test` **17 / 17**。merge 前の 既存 meguru 群(`meguru-life` / `meguru-3d-prototype` / `meguru-test` / `asset-versions` / `release-hygiene` / `meguru-audit` / `meguru-render-cost`)も GREEN。

## N. CI

PR #368(Draft)・head `436ec0a9`:

| workflow | 結果 |
|---|---|
| Runtime smoke test(`npm test` 全体。`illustration-catalog-test` も ふくむ) | **success**(run 36853631646。M. の 1 件は CI では GREEN = この container の 環境依存) |
| Home layout(Playwright Chromium / WebKit) | **success**(run 36853631620) |

文書だけの commit(`1170dafc` 以降)でも 両 workflow が 再実行される(内容は 同じ code)。

## O. Home Expression regression

- `pet-expression.js` / `relationship-expression.js` / `emotion-state.js` / `script.js` / `assets/**` は 1 byte も かえて いない(テスト 12・15 が sha256 で しばる)。
- Home 側の テスト(`emotion-state-test` / `pet-expression-test` / `pet-expression-assets-test` / `cat-expression-preview-test` / `emotion-integration-test` / `pet-expression-integration-test` / `relationship-expression-test` / `relationship-expression-integration-test` / `relationship-reaction-test`)は full npm test に ふくまれ GREEN(M.)。
- `resident-expression.js` は Home module の API を 読むだけ(`assetFor` / `resolve` / `SUPPORTED`)。書きこまない。Home の 読みこみ順にも 依存しない(あとから `window` を ひく)。

## P. #367(All Regions 3D v0)との 競合監査(read-only)

`git merge-tree --write-tree HEAD origin/feat/meguru-all-regions-3d-v0` と、scratch worktree での 実 merge + テストで 確認。#367 は 取りこんで いない。

**機械的 conflict**
- `index.html` **1 か所**: `meguru.js` / `meguru-3d.mjs` の `?v=` token(両 lane が 同じ 2 行を 別の hash に する)。解消は 後に 入る 側が token を 計算しなおすだけ(内容の 衝突では ない)。この lane の `resident-expression.js` の script tag は 別の 行で 衝突しない。
- `meguru.js` / `meguru-3d.mjs`: **自動 merge**(hunk が 重ならない)。exports 行は #367 が 最終行(`WORLD3D_REGIONS, REGION3D, …`)、この lane が 前の 行(`RESIDENT_EMOTIONS, applyReaction, syncExpression, residentExpression`)で 隣接だが 衝突しない。
- `package.json` / `tests/`: #367 は `package.json` を 変えて いない。テスト file は 重ならない(#367: `meguru-3d-prototype-test` / `meguru-discovery-test`、この lane: `meguru-resident-expression-test` / `meguru-test` の spriteFor 1 行)。

**semantic conflict**
- `meguru.js`: #367 の 変更は 3D world objects(650〜1430 行)・discovery notice(7997〜8263 行)・exports。この lane の 接続点(`makeActor` / `updateEmotion` / `talk` / `talkLine` / `spriteFor` / `drawSprite` / `createSimulation` / `start` の URL flag)には 触れて いない。→ **なし**。
- `renderer`: #367 は 遮蔽(`pickOccluders`)・材質・地域 profile・fog・`preserveDrawingBuffer` を かえるが、`actorTexture` / `placeActor` / `actorMesh` / `texCache` の actor 経路は 変えて いない(diff に context として 出るだけ)。この lane の `actorTexture` の `[asset, base]` は そのまま のる。→ **なし**。ただし #367 で 3D 地域が 13 に 広がる ので、texture 上限の 見積り(F.)は 地域ごとに 同じ 上限(住民 ≤ 48 体)で 変わらない。
- `resident state`: 両 lane とも save に 書かない。#367 の `discoveryNotice` は spot の 発見で、住民の emotion に 触れない。→ **なし**。
- `billboard texture`: 同上。#367 の `renderer.autoClear` / `preserveDrawingBuffer:false` は 残像対策で、表情の map さしかえと 両立する(frame ごとに map を 書きなおす 必要は なく、`m.userData.tex !== tx` の ときだけ さしかえる 既存ロジックの まま)。→ **なし**。
- `index.html`: token だけ(上)。
- `tests`: merged tree(scratch)で `meguru-resident-expression-test`(17)/ `meguru-3d-prototype-test` / `meguru-life-test` / `meguru-test` / `meguru-discovery-test` を 実行 → **94 pass / 1 fail**。fail は `meguru-discovery-test ⑦-6「レベルは セーブに 何も 足さない(旧セーブでも そのまま 動く)」` で、**#367 branch 単体でも 同じ 1 件が 赤**(32 pass / 1 fail)。この lane が 原因では ない(#367 側の 既存の 赤)。

## Q. preview URL(iPhone)

この lane の commit に 固定した URL(PR #365 `tools/preview-url.sh` と 同じ 方式: 公開 repo の commit を GitHub の ファイルを そのまま くばる CDN から ひらく。production の GitHub Pages・Actions・deploy 設定は さわらない。セーブは その origin の localStorage に 入る ので ためしの セーブ として あつかう)。

commit `436ec0a9926431523d9240dd123391083efbc679`(最終 commit は 下の N. の あとで 1 つ 増える。中身は 文書だけ):

- 2D(ふだんの めぐる): `https://cdn.jsdelivr.net/gh/naoto214/naotocchi@436ec0a9926431523d9240dd123391083efbc679/index.html`
- 2D・表情を とめる: `…/index.html?mgexpr=0`
- 2D・QA 固定(例 sick): `…/index.html?mgexprforce=sick`(`positive` / `dislike` / `tired` / `sleeping` / `strained` / `wantsPlay` も)
- forest 3D billboard: `…/index.html?meguru3d=1&mgexprforce=positive`
- 予備(おなじ commit): `https://rawcdn.githack.com/naoto214/naotocchi/436ec0a9926431523d9240dd123391083efbc679/index.html`、`https://cdn.statically.io/gh/naoto214/naotocchi/436ec0a9926431523d9240dd123391083efbc679/index.html`

ひらく 手順: たび → めぐる → 住民の まえで「はなす」。自然な 状態では はなしかけた 住民だけが うれしい 顔(10〜26 秒)、20 秒いないに もう一度 はなすと いやがる 顔(6〜12 秒)に なる。

注: この作業 container の ネットワーク方針では これらの CDN host への CONNECT が 403 で 拒否される ため、URL が 実際に 200 を 返す ことは ここからは 確認できて いない(PR #365 の 文書と 同じ 方式・同じ host)。

## R. representative images(`docs/qa/meguru-resident-expression-2026-10-01/`)

ほんものの `index.html`(forest・390×844・DPR 2)を Playwright で とった。`?mgexprforce=` は QA の 固定(セーブに のこらない)。住民の すぐ まえで「はなす」を 押し、顔と 台詞が おなじ emotion から 出る ことも 写して いる。

| 画像 | emotion | 見える もの |
|---|---|---|
| `2d-normal.jpg` | フラグなし(自然な 状態) | はなしかけた かぶとむし(beetle/03)だけが **happy**(talk → positive reaction)、ほかは base。台詞「きみと いると たのしいな」 |
| `2d-positive.jpg` | positive | ちょうちょ 3・かぶとむし 2・くわがた・世界樹 が happy。台詞「はなしかけてくれて うれしい！」 |
| `2d-dislike.jpg` | dislike | 同じ 7 体が sulky。台詞「ねむかったのに…」 |
| `2d-sick.jpg` | sick | 同じ 7 体が sick。台詞「うう… ぐあいが わるい…」 |
| `2d-tired.jpg` | tired | 同じ 7 体が tired。台詞「ねむく なってきた…」 |
| `3d-positive.jpg` | positive(3D billboard) | `?meguru3d=1`。同じ PNG が billboard texture に のる。台詞「えへへ、なんだか うれしい」 |
| `3d-sick.jpg` | sick(3D billboard) | 同上 |
| `sheet-pilot.png` | 5 emotion × pilot 5 体 | resolver の 出力を ならべた contact sheet(cat/06・dog/03・frog/05・たぬき・ねこ社長)。なかま / こいびとは positive だけ 変わり、ほかは base |

`shots.json` に 各 shot の 住民 key・emotion・expression・asset・台詞・3D の 有無を 残した。

## S. known gaps

1. **sick / wantsPlay / unhappy の 自然発火**: 住民生活 v1 に 病気の 信号は なく、`wish` を 増やす 経路も 既存には ない(定義だけ)。sick は 語彙と mapping だけ、dislike は この lane が talk の 出来事(wake / pester)で 初めて 発火させた。将来 住民生活 v2 で 信号が できたら `LIFE_EMOTION` に 足すだけ。
2. **なかま / こいびとの 表情は positive だけ**: Home の relationship 資産が normal / lonely / positive の 3 つなので、tired / sleeping / strained / dislike は base(ふつう)。lonely は「さみしい」の 意味が 住民生活に まだ ない ので 接続して いない。
3. **3D の texture 上限**: asset ごとに 1 まい(最大 約 300 枚・約 19 MB)。LRU は 未実装。#367 で 3D が 13 地域に 広がっても 1 地域あたりの 上限は 同じ。
4. **detail / near 層だけ 更新**: 遠い 住民(tier 2)の 顔は 近づいて 更新されるまで 前の まま(見た目は 22 px 未満の シルエット なので 見えない)。
5. **`illustration-catalog-test`(`★ ♡` unmapped)は この container では main でも 赤**(CI の main は GREEN)。環境依存。この lane の 変更とは 無関係(root の js/css/html を 走査する テストで、`resident-expression.js` に 記号は ない)。
6. iPhone 実機での 人間確認は 未実施(Q. の URL と R. の 画像で 確認して もらう)。

## T. 表情 QA モード `?mgexprqa=1`(2026-10-01 追記・commit `4c19e6e7`)

PR #368 の 実機 QA で「`mgexprforce` は いまの 住民の 顔を 固定する だけ なので、住民の いない save / 地点では 人間確認できない」と わかった。save / schema と ふだんの ゲームは 変えずに、QA 専用の URL flag を 足した。

- **ふだんの URL では 完全に 無効**: flag は `start()` で `location.search` を 読むだけ。パネルも 台帳も つくらず、`run.exprQa` は `null`(Node テスト 18・browser smoke `plain`)。
- **代表住民 6 体を かならず 出す**: `expressionQaRegistry()` が repo の 正本(`S.SPECIES` / `allCompanionsById` / `partnerAsset`)から `form:cat:5`(大人のねこ)・`form:dog:2`(こいぬ)・`form:frog:4`・`form:butterfly:1`・`companion:tanuki`・`partner:cat_ceo` を 組み、`createSimulation({ registry })` に わたす。save の ずかん・なかま・こいびとの 記録に よらない。stage family(Home の 11 表情)と relationship family(positive だけ)の 両方が 1 画面に 入る。
- **forest 固定**: 2D でも `?meguru3d=1` でも おなじ forest・おなじ 6 体・おなじ 位置(プレイヤーの まえ +190、横 70 間隔)。save の `regionId` には したがわず、書きもしない(frame ごとの region 同期を QA では 止める)。
- **パネル**: `auto`(固定なし = ふだんの 経路)/ `normal` / `positive` / `dislike` / `sick` / `tired` / `sleeping` / `strained` / `wantsPlay`。押すと `sim.setForceEmotion` だけが かわり、顔は ふだんと おなじ `updateEmotion → syncExpression → spriteFor → renderer`、台詞も おなじ emotion から 出る。status 行に `住民 6/6・2D|3D・emotion→expression・✓(decode ずみ)` を 出す。
- **とどめる**: 6 体は 散歩に 出ず、はなした あとも 列に もどる(`hold`)。`auto` で 近づいて「はなす」と その 1 体だけ うれしい 顔 + うれしい 台詞(ふだんの reaction)。
- **save に なにも 書かない**: QA の あいだは `recordMet` / `recordTalk` / `recordSpot` / ちずの bits / world links を 止める。browser smoke と Node テストで `regionId = sea` の まま・`lifetime.meguru` が 空の まま・save 文字列に QA の 語が ない ことを 見る。

### browser smoke(`node tests/meguru-resident-expression-qa-browser.cjs`)

ずかんが ほぼ 空・regionId = sea の セーブ(= ふつうの URL なら めぐるに 住民 0 体)で、ほんものの `index.html` を Chromium(swiftshader)で:

| ケース | 結果 |
|---|---|
| plain(`index.html`) | sea・住民 0・QA なし・save に QA の 語なし → PASS |
| 2D(`?mgexprqa=1`) | forest・住民 6/6・normal / positive / dislike / sick / tired の 全組で emotion = 固定値、expression = `EXPRESSION_FOR[family][emotion]`、asset HTTP 200 かつ renderer の cache で decode ずみ、fallback なし。auto で はなした こいぬ だけ happy(「はなしかけてくれて うれしい！」)。save: regionId sea・talkCount 0 → PASS |
| 3D(`?meguru3d=1&mgexprqa=1`) | `is3D = true`。おなじ 6 体・おなじ 5 emotion で おなじ asset(2D == 3D を 配列ごと 比較)。auto で こいぬ だけ happy(「きょうは いいことが あったんだ」)→ PASS |
| page error | 0 |

結果の 正本: `docs/qa/meguru-resident-expression-2026-10-01/qa/qa-smoke.json`。

### 画像(`docs/qa/meguru-resident-expression-2026-10-01/qa/`、390×844・DPR 2)

| 2D | 3D | 見える もの |
|---|---|---|
| `2d-normal.jpg` | `3d-normal.jpg` | 6 体とも base |
| `2d-positive.jpg` | `3d-positive.jpg` | すがた 4 体 happy、たぬき・ねこ社長 positive |
| `2d-dislike.jpg` | `3d-dislike.jpg` | すがた 4 体 sulky、たぬき・ねこ社長 は base(lonely を あてない) |
| `2d-sick.jpg` | `3d-sick.jpg` | すがた 4 体 sick(語彙と 資産だけ。生活からは 出ない) |
| `2d-tired.jpg` | `3d-tired.jpg` | すがた 4 体 tired |
| `2d-auto-talk.jpg` | `3d-auto-talk.jpg` | auto で こいぬ に はなした 直後。こいぬ だけ happy + うれしい 台詞 |

### iPhone で ひらく(commit 固定・githack)

- 2D: `https://rawcdn.githack.com/naoto214/naotocchi/4c19e6e7/index.html?mgexprqa=1`
- 3D billboard: `https://rawcdn.githack.com/naoto214/naotocchi/4c19e6e7/index.html?meguru3d=1&mgexprqa=1`
- ふだんの 2D(QA なし): `https://rawcdn.githack.com/naoto214/naotocchi/4c19e6e7/index.html`
- 予備: `https://cdn.jsdelivr.net/gh/naoto214/naotocchi@4c19e6e7/index.html?mgexprqa=1`

手順: ひらく → たび → めぐる(どんな save でも forest に 6 体が ならぶ)→ 上の ボタンで きもちを 切りかえる → `auto` に して こいぬ の まえで「はなす」。この container の ネットワーク方針では CDN host への CONNECT が 403 の ため、URL の 200 応答は ここからは 未確認(方式は PR #365 と 同じ)。

### テスト
- Node: `tests/meguru-resident-expression-test.cjs` 18 件目(台帳・forest 固定・6 体の 位置・全 emotion の mapping / asset / decode・auto の talk・save 不変・ふだんの URL で 無効)。
- 既存: `asset-versions` / `meguru-test` / `meguru-explore-ux` / `meguru-life` / `meguru-3d-prototype` / `meguru-discovery` / `release-hygiene` / `meguru-phase4e3` / `meguru-transition` 122 / 122。

## U. iPhone 実機 QA の 2 件(2026-10-01 追記)

### U-1. 2D: 「1 体だけ 表情が かわらない」

6 体の 表情 PNG を base と 画素で くらべた(RGBA の 差 > 60 の 画素の 割合)。**解決失敗(fallback)は 1 件も ない。**

| actor | family | positive | dislike | sick | tired | sleeping |
|---|---|---|---|---|---|---|
| 大人のねこ cat/06 | stage | 21.3% | 22.1% | 13.8% | 17.1% | 27.6% |
| こいぬ dog/03 | stage | 10.4% | 12.2% | 13.1% | 17.3% | 14.4% |
| かえる frog/05 | stage | 8.2% | 9.8% | 14.0% | 8.8% | 8.8% |
| いもむし butterfly/02 | stage | 7.0% | 6.4% | 6.0% | 6.4% | 7.0% |
| たぬき | relationship | 15.2% | 仕様 base | 仕様 base | 仕様 base | 仕様 base |
| ねこ社長 | relationship | 9.6% | 仕様 base | 仕様 base | 仕様 base | 仕様 base |

- **normal → positive では 6 体とも 別の PNG に かわる**(ゼロの 体は ない)。positive で かわらない 体が あれば 実バグだが、それは おきて いない。
- dislike / sick / tired / sleeping / strained / wantsPlay で かわらないのは **たぬき・ねこ社長(relationship family)の 2 体**で、これは 契約どおり(Home の relationship 資産が normal / lonely / positive だけ)。
- 「1 体だけ」に いちばん 近いのは **いもむし(butterfly/02)**: すべての 表情で 差が 5〜7% と 最小(顔が 小さい 絵)。解決は 正しく、画像も ちがうが、iPhone の 縮尺では かわった ように 見えにくい。画像の 再制作には 戻らない。必要なら 代表住民の 差しかえ(例: butterfly の 後の 段)で 対応できる。
- これを 人が その場で 見わけられる ように、QA パネルの 1 体ごとの 行を 拡張した:
  `ラベル[family] requested→canonical→expression basis ✓` と `asset … / base …`。
  basis は `variant`(表情の PNG)/ `normal` / `spec-base`(仕様どおり base: その family に その 表情の 画像が ない)/ `FALLBACK!<理由>`(解決失敗)。「詳細」ボタンで asset 行を たたむ。

### U-2. 3D: iPhone Safari で `?meguru3d=1&mgexprqa=1` の QA 住民が 見えない(2D では 見える)

**監査(3D presentation 側)**

| 経路 | 旧コードの 状態 | 判定 |
|---|---|---|
| actorTexture → PNG | `imageFor()` の `<img>`(`decoding='async'`)が `complete` に なった 瞬間に `new THREE.Texture(im)` を 1 回だけ つくり、`texCache` に 永久に 保存。再アップロード なし | **主因の 候補** |
| PNG decode | WebKit は decode 前の async 画像を texImage2D / texSubImage2D に わたすと 透明な 画素を GPU に あげる ことが ある。Chromium は upload で 同期 decode する ので headless では 再現しない | 主因の 候補 |
| THREE.Texture / material.map | `placeActor` は `m.userData.tex !== tx` の ときだけ map を さしかえる。透明 texture が 一度 入ると ずっと その まま | 主因を 固定化する |
| alphaTest 0.5 | 透明な 画素は ぜんぶ discard。メッシュは visible でも 何も 描かれない(影だけ 出る) | 症状 そのもの |
| visibility / placeActor | QA actor も ふつうの 住民と おなじ `view.residents` → `actorMesh` → `placeActor`。farCull 2600 に 対し 距離 ~700 | 問題なし |
| depth / fog | fog near 500 / far ~3500、actor は カメラから ~700。MeshBasicMaterial・depthWrite 既定 | 問題なし |
| camera / frustum | 2D と おなじ ピンホール。headless で 6/6 が 視錐台の なか | 問題なし(実機は 診断で 確認) |
| プレイヤー | 絵文字 → canvas → CanvasTexture(canvas は 同期 upload)で 見える | 症状と 一致 |

**Chromium での 再現**: browser smoke に「WebKit の 未 decode upload」の エミュレーション(decode() が おわるまで、キャラ PNG の texImage2D / texSubImage2D を 透明な canvas に すりかえる)を 足した。旧コードでは **住民 6 体が きえ、影と プレイヤーだけ 残る**(iPhone の 症状と 一致)。新コードでは 6 体とも 表示(`qa/3d-webkit-emu-old-vs-new.jpg`: 左 旧・エミュなし / 中 旧・エミュあり / 右 新・エミュあり)。

**修正(`meguru-3d.mjs`)**
- `pngTexture(asset)`: `img.decode()` が おわってから 画像を canvas に うつし、アルファの 合計(px)が 0 で ない ことを たしかめてから CanvasTexture に する(canvas の upload は 同期で 確実)。px が 0 なら 次の frame で 再試行(6 回まで、その あとは `blank`)。
- fallback の 順: 表情の PNG(ready)→ base の PNG(ready)→ 絵文字 glyph(canvas)→ 色の まる(solid)。**どの 時点でも 何かが 描かれる**(エミュレーションで 6/6 visible を frame ごとに 確認、`none` は 一度も 出ない)。
- 2D と おなじ `spriteFor` の `asset / base` だけを 読む 契約は そのまま(きもちの 語彙は 3D に ない)。

**診断(`?mgexprqa=1` の ときだけ。ふだんの URL では 計測しない)**
- hybrid renderer に `setDiag3d(on)` / `diag3d()`。QA パネルに 表示:
  - 1 行目: `3D mesh N 住民 6 visible V 視錐台 F tex-ready T/6 tex X webgl2 1 dpr 2 fog near-far gl w,h,left,top 2d w,h,left,top`
  - `GPU …`(WEBGL_debug_renderer_info)
  - 3D の 失敗時: `3D active 0 failed 1 (理由) webgl2 0|1`
  - 1 体ごと: `3D use=asset|base|glyph|solid|none png=wait|decoding|ready|blank|error(px) base=… tex=✓|× map=✓|× vis=✓|× fr=✓|× d=距離 err=…`
- iPhone で 読みかた:
  - `use=glyph` の まま `png=decoding` → decode() が おわらない(画像の 取得 / decode の 問題)
  - `png=blank(0)` → decode 後も 画素が 入らない(canvas 経由でも だめ。別の WebKit 問題)
  - `use=asset tex=✓ vis=✓ fr=✓` なのに 見えない → 描画順 / canvas の 重なり(`gl` と `2d` の rect を くらべる)
  - `fr=×` → カメラ / 視錐台
  - `3D active 0` → 3D に なって いない(`failed` の 理由)

**browser smoke(`node tests/meguru-resident-expression-qa-browser.cjs`)**: plain / 2D / 3D / 3D WebKit エミュの 4 ケース。3D は 5 emotion すべてで `visible 6 / 視錐台 6 / tex-ready 6`・6 体とも `use=asset png=ready px>0`、basis が `variant` / `normal` / `spec-base` の 期待どおり。エミュでは decode 中 `glyph` → decode 後 `asset`。page error 0。

**未確認**: これは Chromium 上の エミュレーションでの 確認。iPhone 実機で 直ったかは 下の preview の 診断行で 確定する(PC / headless の GREEN だけでは 解決扱いに しない)。
