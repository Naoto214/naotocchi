# なおとっち 総合アーキテクチャ監査(完成・長期運用・将来拡張)

日付: 2026-09-24 ／ 対象: GitHub `main` HEAD `13bd8bf`(Merge PR #337, Phase 4E-2)+ open PR 7 本
種別: **read-only 監査**。この文書以外のファイルは 1 行も変えていません。PR・merge・Draft への書きこみもしていません。

根拠の表記:
- **[V]** 検証済み(コードを読んだ・runtime harness で実際に動かした・ブラウザで probe した)
- **[I]** 推定(コードから読んだが、実機や実データでは確かめていない)

行番号は `main 13bd8bf` のものです。

> **2026-09-26 追記**: この監査は `13bd8bf` 時点の記録。その後、Phase 4E(walk corridor 10 / 10)と scenery / visual polish(#340〜#347)は完了し、めぐる本線へ戻る必要はなくなった。本文の「4E が終わるまで」「4E の後に」は解除済みとして読む。めぐる側の既知の残り 4 件(forest / mountain の到着時の描画コスト、city 系の定常時の描画コスト、corridor 内のまれな 60 ms 超の frame、なかまが障害物に重なる既存バグ)は Release Hardening / post-4E backlog(Roadmap §7.4 RH-7)で扱う。P1-1 は RH-1(#348)で対応。

---

## 0. 前提として確かめた実態

| 項目 | 実態 |
|---|---|
| main HEAD | `13bd8bf` Merge PR #337(Phase 4E-2 home↔forest continuous walk)。直前は #336(4E-1)、#335(4E 設計)、#334(4D-2c) |
| `npm test` | この監査中に全件実行し **exit 0**。node:test 1,307 件すべて pass(smoke / dialogue / visual-qa を含み約 15 分)[V] |
| CI | `runtime-smoke-test.yml`(`npm test` だけ)／`home-layout.yml`(Chromium・WebKit のブラウザ layout。paths filter あり) |
| 依存 | runtime の npm 依存は **0**。devDependencies は `vite 8.2.2`(開発サーバと QA fixture 用で、配信には使わない)と `sharp`(画像ツール)。`npm audit` は 0 件 |
| 配信 | GitHub Pages がリポジトリの root をそのまま配信。build も bundle もない。23 本の `<script>` を同期で読みこむ |
| 主要ファイル | `script.js` 18,170 行(1 つの IIFE)／`games.js` 10,214／`meguru.js` 7,952(1 つの closure)／`quick.js` 1,020／`item-system.js` 470／`character-world-master.v1.js` 252 |

### 0.1 open PR / Draft PR の分類

**Phase 4E はいま open PR としては存在しません。**
- 4E-1(#336)と 4E-2(#337)は main に merge 済み。本線は main 上で続いています。
- 次は **4E-3**(streaming・先読み・暗転なしの到着)、その次が **4E-4**(walk 10 本へ展開)。
- 4E-2 handoff §13 は、4E-3 に入る前の条件として「main の flaky test 2 本を `Math.random` の seed 化で直す」ことを挙げています。

| PR | 種別 | 状態 | 分類 | main との関係 |
|---|---|---|---|---|
| **#278** 成猫の表情パイロット(`feat/cat-expression-pilot-20260915`) | code + PNG 2,484 枚 + QA 文書 | Draft。自己申告で **NOT GREEN(修正方針の確認待ち)** | ② Draft で実装中 | 衝突 5 hunk(index.html・package.json・script.js)。main より 215 commit 遅れ。main の正本とは矛盾していない。**表情の進行中正本** |
| **#275** 感情状態 第1段階 | code | Draft | ② Draft で実装中 | **#278 の祖先で、中身は #278 に含まれる**(`emotion-state.js` は byte 単位で同一)。別々に merge してはいけない |
| **#259** カードプール設計(`design/card-pool-master-20260914`) | docs + Python の proxy simulator | Draft | ③ 設計のみ | main の `docs/card-game/` は 09-13 で止まっている。**branch 側(checkpoint 133、09-24)が新しい正本** |
| **#302** シールポイント廃止 | code | Draft | ① 実質 main にある | **#304 として rebase のうえ merge 済み**。その後 main は #306 / #307 / #323 でさらに変更済み。閉じる候補 |
| #300 / #298 地理の設計案 | docs | open | ③ 設計の履歴 | main の `meguru-world-geography-canon-v1` が「これが正本」として D2 を採用し、#298 / #300 を履歴として引用している |
| #92 実機プレイ修正 | code | open(09-06 から放置) | ① main で置きかえ済み | tier0 の掃除・`activeOverlay`・pose ゲームの廃止は、すべて main で別の形になった |

> 注意: 上の「閉じる候補」は提案です。この監査では PR を閉じていません。

---

## 1. Executive Summary

**総評: いま動いているものは、驚くほど丁寧に守られています。**
- テスト 1,307 件がすべて緑。
- save は「主キー → バックアップ → 書きこみ停止」の 3 段で守られ、自動 snapshot を 3 世代持っている。
- 退役したアイテムの払いもどしは idempotent。
- めぐるの simulation は DOM に触れない。
- 相対パスでの配信、画像が落ちたときの絵文字 fallback も確認できた。

**「完成・長期運用・拡張」の観点では、弱点は 3 つの層に集中しています。**

1. **登録された ID と、数えている配列が一致していない**(集計が正本を通っていない)。
   - 図鑑コンプ・④・ナオト解放・かんむり・`partner-all` が、`discoveredStages.length` などの **配列の長さ** で判定されている。旧 ID や重複もそのまま数えられる。
   - save の配列要素の **型** も検査されていない。1 要素が壊れているだけで起動のたびに例外になり、そのときには **バックアップにも同じ壊れたデータが写っている**。[V]
2. **同じ概念を定義する表が、ファイルをまたいで平行に並んでいる。**
   - めぐるの地域ごとの表は約 18 個あり、欠けると `|| home` で **黙って** 置きかわる。
   - キャラ 1 体の runtime 情報は約 11 か所にあり、欠けると **起動時に TypeError** になる。
   - 地域やキャラを倍に増やすときに一番壊れやすいのはここ。性能ではなく **作業のしかた** が先に破綻する。
3. **「時間」と「環境」の境界がまだ漏れている。**
   - production 側: `loop()` はタブが隠れているかを見ていないので、隠れた desktop タブでも時間が進む。
   - production 側: 複数タブの同時保存を防ぐ仕組みがない。
   - テスト側: harness の `pinDate` が `world-environment.js` の時刻・天気まで届かない(host realm に漏れている)。**b33947f と同じ型の flaky がまだ残っている。**

**P0(いますぐデータが壊れる・save が消える・大きく遊べなくなる)は見つかりませんでした。**
P1 は 9 件で、どれも数行から数十行の局所的な修正で閉じられます。4E の本線とはファイル・関数が分かれています。

---

## 2. 現在の architecture map

```
index.html ─(同期 <script> 23 本、?v=YYYYMMDD-sha8)──────────────────────────┐
                                                                                 │
 character-world-master.v1.js   ← 種族 31 / 仲間 26 / 恋人 18 / 地域 13 / 伝説 5 の「名前と ID」の正本
 item-system.js (ITEM_SYSTEM)   ← CATALOG 27・在庫・払いもどし・移行・normalize(副作用なしで一番きれい)
 world-environment.js           ← 時間帯・気候による疑似天気・位置情報(opt-in で外部 API)
 local-scenery.js / world-scene.js / cast-* / care-status.js / *-illustrations.js
 audio.js / games.js(ミニゲーム約 100)/ quick.js(クイック)/ movie-dialogue.js
 meguru.js ── installNaotocchiMeguru(S) ─────────────────────────────────┐
        │  data: WORLDS / WORLD_*(13 地域)/ WORLD_GEOGRAPHY / REGION_FRAME / │
        │        worldCorridors / DistantFeature / 4E-1 spec(pure)            │
        │  sim : buildWorld → createSimulation(LIFE の tier、DOM なし)         │
        │  view: createCanvasRenderer(draw(view), drawStructure 97 case)       │
        │  ctrl: start() 約 1,043 行(HUD・toast・transition・corridor・frameFn) │
        └──── S = meguruBridge(script.js:13863)── save への唯一の書き口 ─────┘
 script.js (IIFE 18k 行)
   state = freshState()+loadState/migrate(schemaVersion 5)
   saveState() 3 秒ごと: normalize → checkAchievements → checkGrandGoals → setItem×2 → snapshot
   tick() / render() / activeOverlay + boolean 約 12 個 / isTimePaused()
   SPECIES・REGIONS・COMPANIONS = master + *_RUNTIME 表(ID をキーにした平行表)
   ACHIEVEMENTS 91 / ENDING_TIERS(ordinal)/ NAOTO_ITEMS / STICKER_* / 恋愛 / 伝説 / 100歳
localStorage: naotocchi-save-v1 / -backup / -snaps(3 世代)
```

依存の向き:
- 基本は「master → script.js → meguru(bridge 経由)」の一方向で、循環依存はない。[V]
- ただし script.js と meguru.js は、それぞれ 1 つの巨大な closure です。
  - 内部の関数は互いに見えるので、**暗黙の依存** は多い。
  - さらに、テストは **ソースの文字列そのもの** に依存している(§17)。

---

## 3. 強い部分(今のままで良い)

1. **save の復旧経路。** [V]
   - 主キーから backup へ落ちる。
   - どちらも読めなければ `saveWriteBlocked` にして、原本を上書きしない。
   - snapshot 3 世代。容量ぎれのときは snapshot を捨てて 1 回だけ再試行する。
   - `replaceSavedLife` は、置きかえる前の人生を snapshot に退避する。
   - これらを `save-recovery-test` の 25 件が守っている。
2. **アイテムの退役と移行。** [V]
   - `RETIRED_*_PRICES` / `LEGACY_EQUIPMENT_IDS` / 移行済みフラグで idempotent に払いもどす。
   - `infiniteReturn` と snapshot も対象に入っている。
   - コードベースの中で一番堅い部分。
3. **パネルは 1 つだけ開く。** `activeOverlay` 1 変数で排他し、パネルが開いているあいだは時間ごと止める(`isTimePaused`)。「2 つ同時」の競合の大半が構造的に起きない。[V]
4. **めぐるの層の分離。**
   - simulation(1〜2783 行)に DOM・window は出てこない。
   - save への書きこみは bridge の callback だけ。
   - corridor の状態は save しないと決めて、実際に守られている。
   - 地図の分母(11 / 12 / 17 / 103)は runtime では data から導出している。[V]
5. **表示用の件数の多くは、登録表から導出している。** 248 = `ALL_LINES × STAGES_PER_LINE`、恋人・仲間の総数、`REGIONS.length`、ミニゲーム pool。[V]
6. **配信の安全性。** [V]
   - 静的な asset 参照 316 件で、欠けも大文字小文字の食いちがいも 0。
   - 動的に組み立てる種族パス 248 枚も欠けは 0。
   - `?v=` の token は現時点ですべてファイル hash と一致している。
   - network を切ると、画像は絵文字に fallback する。
7. **入力の検査。**
   - ゲストコードと対決コードは whitelist で厳しく検査している。
   - URL パラメータは読んでいない。
   - 外部リンクには `noopener` が付いている。
   - analytics なし。位置情報を使う外部 API は opt-in のときだけ呼ぶ。
8. **iOS の viewport 処理。** `visualViewport`・`dvh`・safe-area に対応し、pinch zoom を殺していない。home-touch は「固定レイアウトのときだけ」scroll を止める。10 種類の viewport で横スクロール 0 を確認した。[V]
9. **remove-it テストの仕組み**(4B / 4C / 4D-1 / 4E-1)。repo を 2 つの temp にコピーし、片方からブロックを抜いて subprocess で fingerprint を比べる。本物の mutation 型の証明になっている。
10. **ID の方針。** snake_case の安定 ID と表示名が分かれている。シールのキーは `form:` / `companion:` / `partner:` / `item:` / `scenery:` の名前空間で区切られている。master に alias と legacy の方針が明記されている。

---

## 4. P0

**なし。**

いま普通に遊んでいるだけで save が消える・壊れる経路は見つかりませんでした。P1 の A は「壊れた要素がどこかから入る」ことが前提の潜在的な P0 候補なので、P1 の先頭に置きます。

---

## 5. P1(リリース前に直すべき)

| # | 問題 | なぜ危険か | 壊れる場面 | 根拠 |
|---|---|---|---|---|
| **P1-1** | `discoveredStages` の要素の型を検査していない。起動中の `saveState → checkAchievements` で `rare-line-1` が `.split` を呼んで例外になる。**その前に load が raw をそのまま backup へ写している**ので、backup も壊れる | 1 要素壊れるだけで、**起動のたびに途中で止まる**(interval と listener が入らない)。救えるのは snapshot だけで、復元 UI にたどり着けるかも不明 | セーブコードの取りこみ(`decodeSaveCode` は `lifetime` と `stage` しか見ない)、将来の bug | [V] probe。script.js:1700-1720(配列要素の filter がない)、:2023-2025、:2122。**2026-09-26 追記**: 同じ種類の経路がほかに 2 つある — `endingTiersReached` の未知の値(`null`・小数・範囲外の整数)で `render()` のバッジ(`ENDING_TIERS[i].title`)が例外、`companions` の `null` で load の なかまの いこうが例外になり save 全体が読めない扱い。対応は RH-1(Roadmap §5.1) |
| **P1-2** | 図鑑コンプ・④・かんむり・ナオト解放・`dex-complete`・`partner-all`・`region-all` が **配列の長さ** で判定されている | 旧 9 系統(`LEGACY_NORMAL_LINES`、最大 72 キー)や重複が数えられる。**見た目の図鑑は 176/248 なのに ④ に到達し、かんむりも手に入る**。解放は永続する | 旧 save、重複を含むセーブコード | [V] probe。script.js:2182, 2468, 2495, 2587 |
| **P1-3** | `loop()` と `isTimePaused()` が `document.visibilityState` を見ていない | 隠れた desktop タブでも tick が進み(throttle で 1 分に 1 回程度)、**一晩で弱ったり死んだりしうる**。`savedAt` が更新されつづけるので、「やさしい留守中処理」(最大 30 分・20 を下回らない)が働かない。:18080 のコメントにある意図(「開いているあいだだけ時間が進む」)とも矛盾する | PC で別タブにしたまま放置 | [V] コード。挙動の影響は [I] |
| **P1-4** | 複数タブでの保存に排他がない(`storage` event も lock もない) | どちらのタブも 3 秒ごとに保存し、**後から書いたほうが勝つ**。古いタブが新しい進行を巻きもどす | スマホで同じ URL を 2 つ開く、PWA 風に使う | [V] 仕組みがないことを確認。影響は [I] |
| **P1-5** | `?v=` の token が最新かどうかを、CI が何も検査していない(`asset-versions-test` は「token がある」ことしか見ない) | bump を 1 回忘れると、**新しい script.js と cache に残った古い games.js / style.css が混ざる**。分割ファイル構成で真っ白になる典型パターン | release 時の人為ミス | [V] |
| **P1-6** | 起動が失敗したときの救済画面がない | script.js は 1 つの IIFE。起動中に 1 回でも例外が出ると、HTML は表示されたままボタンが全部効かなくなる。原因の例: P1-1、Safari 15.3 以前の `Object.hasOwn`、cache の混在(P1-5)。**save を救う導線もない** | 上の 3 つのどれか | [V] 構造 |
| **P1-7** | test harness の時刻 pin が host realm へ漏れている | `world-environment.js` を host の `require` で読んでいるので、`timeOfDay` と `simulatedWeather` は **本物の時計** で動く(`pinDate:true` でも 03:00Z と 13:00Z の両方で "morning" を返した)。time / weather / season を固定していない harness ファイルは 47 本ある。CI は UTC、開発は JST | 新しい assert が環境に依存した瞬間に、「実時刻で落ちる」型が再発する | [V] probe |
| **P1-8** | `item-all` の説明は「集めた」なのに、条件は「**使った**」 | 条件には `c_life_charm`(100 歳の前に死にかけたときだけ発動)も含まれる。⑤ PERFECT は全実績が条件なので、**PERFECT には「一度死にかける」ことが必須** になる。仕様の意図を確かめる必要がある | エンドゲーム | [V] |
| **P1-9** | 通知の上書きと、流れる量の多さ(製品リスク) | `#message` は後から来たものが勝つ(優先度も queue もない、103 か所から呼ばれる)。雑談が 4〜9 秒ごと、誕生日 toast が 60 秒ごとに出る。**病気や「保存に失敗しました」が数秒で消される** | 常時 | [V] コード |

**Android の戻るボタン**(`history` を使っていないので、ゲームそのものから離れる。save は残るが、ミニゲームの途中経過やめぐるは失われる)も、release の対象に Android を含めるなら P1 です(§16)。

---

## 6. P2(大型機能の追加前に直す)

**データ・正本:**
1. **めぐるの地域ごとの表が約 18 個**(meguru.js の `WORLDS` / `WORLD_STYLE` / `THEME` / `MOTION` / `SPACE` / `REGION_LIFE` / `REGION_LINE` / `SKY_OVERRIDE` / `GEO_AREA` / `GEO_ASPECT` / `WORLD_GEOGRAPHY.regions` / `REGION_FRAME` / `FOLIAGE`、外部の `CLIMATE` / `SCENES` / master / `REGIONS`)。欠けると `|| WORLDS.home` で **黙って** 置きかわる。13→26 地域の前に、網羅を検証するテストが必須。
2. **キャラの runtime 平行表**(`MASTER_SPECIES_EMOJI` / `SPECIES_STAGE_DESCS` / `PARTNER_RUNTIME_PROFILE` / `COMPANION_RUNTIME` / 台詞の表 6 か所 / meguru の `HABITAT` / `cast-bounds` …)。欠けると起動時に TypeError。恋人 1 人の追加で 5 ファイル・約 11 か所を触る。
3. **ゴールを 4 通りで記録している。**
   - `endingTiersReached`(ordinal 0〜4)
   - `dexCleared` / `perfectCleared`
   - `clears` / `lifeClears` / `bestLives`
   - `achievedGoalTiers()` で毎回再計算
   - さらに `NAOTO_ITEMS.unlockTier`・`COLOR_THEMES.unlockTier`・`ENDING_TIER_ICONS`・`ENDING_TIER_UNLOCK_LABELS` が、同じ ordinal を index にした平行配列になっている。
   - **ゴールを 1 つ挿入する・並べかえると、save と報酬がずれる。**
4. **接続 1 本を複数の field が並行して記述している**(`mouths` / `gate.ends[r].spot` / `land`×2 方向 / `transition` / `CORRIDOR_TERRAIN`)。spec と合わないと `null` を返し、**黙って** 旧 transition に落ちる。4E-4 で 9 本増えるので、その前に。
5. **未来の save を検出できない。** `schemaVersion` を 5 に上書きし、知らない item ID と shop ID を **永久に削除** する。deploy を rollback すると、そのあいだに手に入れた新アイテムが消える。
6. **`grandGoalPending` を保存していない。** お祝いが出る前にタブを閉じると、④/⑤ のお祝いとナオトの挨拶が二度と出ない(報酬そのものは付与される)。
7. **bi の恋人は、ページを読みこむたびに恋愛対象が振り直される**(12 回起動して、同じ恋人の対象が 4 通りに変わった [V])。相性・`c_match`・`partner-all` の達成可能性が reload のたびに変わる。
8. **`'ren'` を直書きしている**(`ALL_LINES` に `'ren'`、特例が 14 か所)。master に secret を 1 つ足しても、図鑑とシールに出ない。
9. **master の `regionAliases` / `speciesAliases` を runtime がどこでも読んでいない**(`tropical→jungle` は宣言されているだけ)。恋人の alias 参照は 8 か所にコピペされている。

**save・時間:**
10. **3 秒ごとの `saveState` が重い。** normalize、実績 91 件の判定、`setItem` 2 回(backup + main)、snapshot の全 `JSON.parse` を毎回やる。めぐるでは発見 1 件ごとに、frame の中で全体 save が走る。dirty flag と間引きが要る。
11. **`gamePassReadyAt` と `temporaryForm.expiresAt` が絶対時刻のまま clamp されていない。** 時計が戻ると「あそぶ」が lock されたままになる。2^31 ms を超えると `setTimeout` が溢れて、`render()` が約 1 ms ごとに再実行される [I]。
12. **セーブコードの self-XSS(推定)。** `partner.label` や `emoji` など、`freshState()` が型を定義していない入れ子の値は検査されない。未 escape の sink にたどり着く可能性がある。

**テスト:**
13. **source-text parsing テスト 24 本**が、コメントやインデントや marker コメントに依存している(§17)。
14. 分母の snapshot(471 / 654 / 118 / 107 / 17 / 103)が **20 ファイル** に直書きされている。
15. remove-it が「消費する側もいっしょに抜く」ようになって、意味が薄れてきている(§17)。
16. CI の paths filter が `assets/**`・`*.mjs`・`*.json` を拾わない。

**UI・性能:**
17. トップ階層の状態が暗黙の boolean 約 12 個(+ `let` 約 125 個)で表されている。新しい画面を足すたびに `isAnyMenuOverlayOpen` など 4〜5 か所を更新する必要がある(§16)。
18. `buildWorld` が到着時に 100〜170 ms かかる(`hash` の文字列 seed 25%、`clamp` 15%、`nearestPath` 9%)。4E-3 の暗転の主因。`foreignMap` も同じ処理を同期で実行している。
19. `games.js` と `quick.js` が reduced-motion を一度も見ていない。44 px 未満のタップ領域が多数ある。
20. 画像に cache-bust がない(ファイル名を変えて対処している)。**#278 で PNG を同じパスのまま上書きすると、古い画像が残る。**
21. HeartRails に座標を **全精度で** 送っている(Open-Meteo は小数 2 桁に丸めている)。

**文書が正本と矛盾している:**
22. README のシール(4 ページ固定・かけら)、MASTER_SPEC の 168 / 恋人 16 / 装備 14、TEXT_STYLE の「koala / kinoko を置きかえない」(コードは置きかえている)、card-game の旧 2 文書(どちらも「Single Source of Truth」を名乗り、退役した用語「ときとばし」を使っている)。

---

## 7. P3(改善の余地)

- 実績 ID の数字と条件が食いちがっている(`minigame-50` の条件は 30 回、`clear-25` は 10 回など)。ID は save 互換のため変えないのが正しいが、表の近くに注記がほしい。
- 装備 ID が昔の概念の名前のまま残り、反応文も古い(`ribbon` はいまおもちゃばこなのに「リボンを揺らして」、`bowtie` はおべんとうばこなのに「ちょうネクタイ」)。これは **ユーザーが目にする文言** なので、release 前に直すと安い。
- `ORIENTATION_WEIGHTS` が配列の位置に結びついている。`sort(() => Math.random() - 0.5)` の偏ったシャッフルが 3 か所ある。
- 絵文字を絵のキーにしているので衝突する(🐈‍⬛ = 猫 06 と `cat_ceo`、🐶)。
- 人生記録の fallback が表示名で照合している。
- 目標アイテムが 30 コインのシールパックから出る(意図なら注記を)。未知のシールキーも所持数に数えられる。
- `boolean` に `"false"` のような文字列が入っていると true として扱われる。数値に文字列が入っていると 0 に戻る(改変された save のときだけ)。
- `itemMemories` に上限がない。`pastLives` は 100 件で最大約 700 KB。
- 本番でも debug 用の global が出ている(`__meguruRun`、save を変更できる `__meguruBridge`、`__naotocchiErrors`)。1 人用なので実害はない。
- dead code: `openDreamPicker`、`itemPartnerIdentity`、`itemRegionScenes`、picker の未使用モード 5 つ、`boostTicks` の分岐、`dailyStreak` / `dailyLastDate`、`COMPANION_RUNTIME.koala` / `kinoko`、`LEGACY_*_LINES`(harness だけが使う)。**削除は急がない。**
- meguru.js の冒頭コメント(「地域移動はかならず `travelToRegion()` を通る」)は Phase 2 以降は正しくない。
- CSP がない。`github.io` の origin を同じアカウントの他の Pages と共有している。
- M+ フォント約 1 MB を unicode-range なしで preload している。

---

## 8. 二重正本

### 8.1 source of truth の一覧

| 概念 | いまの正本 | 導出データ | 重複して定義している場所 | リスク |
|---|---|---|---|---|
| 種族・系統(31×8=248) | `character-world-master.v1.js` の `playerSpecies` | `ALL_LINES` と `SPECIES`(script.js:405-434) | `MASTER_SPECIES_EMOJI`・`SPECIES_STAGE_DESCS`・`'ren'` の直書き・#278 の `expression-stage-names.json` | 中(欠けると起動時にクラッシュ) |
| 段階 | ordinal 0〜7(save・シール)／ファイル名 01〜08 | 図鑑キー `line:i` | 0 始まりと 1 始まりの 2 系統 | 低(8 段階は不変の前提) |
| 仲間 | master の `companions` | `COMPANIONS` | `COMPANION_RUNTIME` / `RARE_COMPANION_RUNTIME`(koala と kinoko は死んだ項目) | 中 |
| 恋人 | master の `partners` | `ALL_PARTNER_CANDIDATES` | `PARTNER_RUNTIME_PROFILE`(性別・指向)、台詞の表 6 か所、`movie-dialogue.partners` | 中 |
| 性別・指向 | script.js:3281-3293 の enum | `orientationLabel` | 重みが配列の位置に依存 | 低 |
| 地域(本体) | master の `regions`(home + 10 + 2) | `REGIONS` / `SPECIAL_REGIONS` | `REGION_RUNTIME_META`、world-scene の `SCENES`、world-environment の `CLIMATE` | 中 |
| 地域(めぐる) | `WORLDS` | `worldCountable()` | 地域ごとの表 約 18 個 | **高**(黙って fallback) |
| 接続・gate・corridor | `WORLD_GEOGRAPHY.connections` | `worldCorridors`・4E-1 spec | `mouths`・`gate.ends`・`land`×2・`transition`・`CORRIDOR_TERRAIN` | 中→高(4E-4) |
| spot / zone | `WORLDS[*].spots` / areas | 分母 471 / 118 など | テスト 20 本の直書き | 中(改修のたびに手間) |
| 座標 | local / `REGION_FRAME`(global)/ `mapX`・`mapY` / corridor chart の 4 層 | — | 層ごとに規則が文書化されている | **低(よくできている)** |
| `GEO_AREA` | `buildWorld` の実測値を手で写したもの | — | テストで再計測している | 低 |
| DistantFeature | 4D-1 の data | `distantRegistry` | — | 低 |
| 発見状態 | save の ID 集合 | 地図・世界地図の進捗 | links は「保存した分 ∪ spot から導出した分」を 3 か所で合成、regions は `seedWorldRegions` と合成 | 低 |
| アイテム | `item-system.js` の `CATALOG` | `shop-all` / `item-all` | `SHOP_ITEMS`・`CONSUMABLE_ITEMS`・`NAOTO_ITEMS`(`naoto_charm` の説明文が 2 通り) | 中 |
| アイテム効果 | `isEquipped('<id>')` を 12 か所以上に散らした if | — | — | 中(追加の手間) |
| 実績 | `ACHIEVEMENTS` 91 件(1 つの配列) | ⑤ = 全件 | `ACHIEVEMENT_MARKS`、数字入りの ID | 低 |
| ゴール①〜⑤ | **正本が 1 つに定まっていない**(4 通りの記録) | `achievedGoalTiers()` | ordinal の平行配列 4 つ | **高** |
| 図鑑コンプ | 判定 helper がない(length の比較が約 9 か所) | — | — | **高**(P1-2) |
| 100 歳 / 70 / 100 | `GOAL_AGE` / `LIFE_CLEAR_SODACHI` / `SODACHI_MAX` | — | 説明文やバッジに 70 / 100 を直書き | 低 |
| シールのしきい値 5 / 8 | `STICKER_TASKS` の件数 | 銀の本・金の本 | :14866、実績、UI の「5こで」 | 低 |
| 季節・日付 | `dailyKey`(ローカル日付)、`getMonth` | めぐるの配置、今日のチャレンジ | 天気なしの地域(deepsea / star_stop)を 3 か所で除外 | 低 |
| save key | script.js:5-15 | — | — | 低 |
| 表情 | (#278)`pet-expression.js` の `STAGE_ASSETS` | — | master を読まずに系統 ID を直書き | 中(統合時) |
| カード | (#259)`docs/card-game/27` で master の ID に prefix を付ける | — | main に古い「SSOT」を名乗る文書が 2 つ | 低 |

### 8.2 正本化の優先順位(特例を足すより、正本を 1 つにすることを優先)

1. **図鑑・恋人・地域の「達成数」を 1 つの helper に集める**(登録済み ID との積集合を数え、alias を正規化する)。P1-2 の根本的な修正。
2. **ゴールは `achievedGoalTiers()` を正本にし**、他の記録は「導出値か cache」だと位置づける。ordinal は ID(`life` / `lifeClear` / `best` / `dex` / `perfect`)への変換表を 1 つ置く。挿入が起きる前の、保存形式を変えない整理にとどめる。
3. **めぐるの地域は `WORLDS` を正本にし、他の表は「網羅テスト」で縛る。** 1 つの巨大 object に統合する必要はない。**抜けを検出する** ことが目的です。

---

## 9. save

### 9.1 現状 [V]
- キー:
  - `naotocchi-save-v1`(本体)
  - `-backup`(1 回前の save)
  - `-snaps`(最大 3 世代、20 分以上の間隔)
- `storage` への読み書きは script.js の中だけ。
- `freshState()` が雛形(:1334-1647)。`schemaVersion: 5`。
- 移行は 3 つの方式の組み合わせ:
  - ① 版ごとの段階(3 より前 → 3 → 4 → 5)
  - ② 機能ごとの marker(`romanceCompatibilityVersion`、`itemMigrations.*`、`itemSystemVersion`)
  - ③ idempotent な normalize(`normalizeStateShape` / `normalizeStateValues` / `ITEM_SYSTEM.normalize` を毎回の save で実行)
- 足りないキーは補う。知らないキーはトップ階層と `lifetime` では **残す**。知らない item ID と shop ID は **捨てる**。
- 保存のタイミング: tick(3 秒)ごと・操作ごと・めぐるの記録ごと・`visibilitychange` の hidden・`beforeunload`。`pagehide` はない(実用上は hidden で足りる)。
- 日付をまたぐとき: `dailyKey` はローカル日付。「今日のチャレンジ」は完了時に日付を確かめる。時計が戻った場合は、留守中処理をしないだけ。
- めぐるの途中: 座標は保存しない。地域は `enterRegionByMove` の時点で即保存する。reload すると、その地域の入口から始まる。corridor の途中なら出発した地域に戻る(設計どおり)。

### 9.2 破損への耐性

| 入力 | 結果 |
|---|---|
| JSON が途中で切れている | backup を使う。backup も駄目なら、新しい state + 書きこみ停止(原本を守る)。◎ |
| キーが欠けている | 補う。◎ |
| 古い save | 段階的に移行する。◎ |
| 未来の version | **検出しない。未知 ID を削除する。**(P2-5) |
| boolean と string の混在 | `"false"` が true になる(P3) |
| 配列の重複 | companion と shop 以外は残る → 件数が水増しされる(P1-2) |
| 配列要素の型違い | **起動がクラッシュし、backup も汚れる**(P1-1) |
| 知らない ID / 退役したアイテム | 払いもどしてから削除。◎ |
| 知らない region / resident | 表示は fallback、めぐるは無視。◎ |
| `partner` が文字列 | tick ごとに例外 → それ以降保存されない(P3、改変したときだけ) |
| 容量ぎれ | snapshot を捨てて再試行し、警告を出す。◎ |
| 複数タブ | 後から書いたほうが勝つ(P1-4) |

### 9.3 100 歳の流れ(コードで追跡)[V]
1. `tick()` の中で `currentAge() >= 100` になる(2,000 tick = 画面を開いて 100 分)。`enterFarewell()` が stage を FAREWELL にし、`clears` / `lifeClears` / `bestLives` を加算し、`grandGoalPending='life'`(メモリの中だけ)を立てる。
2. 同じ loop の中で保存 → `render` がクリア画面を出す。時間は止まる。
3. 「おわかれのじかんへ」→ farewell bar → 人生カード → 次へ → `resetBtn` の処理の中で `archiveLifeAndReset` → 新しいたまご → 保存(**1 つの handler の中なので、二重に記録されない**)。
4. 次回の起動が FAREWELL のままなら、tick は止まっていて、bar から続けられる。**お祝いの overlay は再表示されない**(P2-6)。
5. 100 歳を迎えたあとの save を開いても破綻しない。`ageTicks=999999` のように改変しても FAREWELL に入るだけ。

### 9.4 migration 機構の提案(やりすぎない範囲で)
- **versioned migration**(形や意味が変わるとき): 今の `schemaVersion` の段階方式を続ける。加えて `savedByBuild`(または `minReaderVersion`)を 1 field 足し、**自分より新しい save なら「読むけれど、知らない ID は消さずに残す」** ようにする。
- **normalize**(形の保証、毎回): 今のまま。ただし「配列要素の型」まで見るようにする(P1-1)。
- **repair**(意味の修復、登録表と照合): 図鑑・恋人・地域を、登録済み ID と alias で正規化し、重複を除く。**件数の判定は repair の後の集合だけで行う。** 生の save は捨てない(未来の ID を守るため)。
- **backup への昇格**: load に成功した時点ではなく、「起動後の最初の save に成功した時点」にする(P1-1)。

---

## 10. randomness / time

### 10.1 乱数 [V]

| ファイル | 件数 | 分類 |
|---|---|---|
| games.js | 232 行 / 385 回 | ミニゲームの game logic と layout |
| script.js | 97 行 | gameplay 約 45(種族・へんしん・ルーレット・病気・出会い・シール・対決)、台詞 約 20、飾り 約 35 |
| quick.js | 17 | クイックの logic |
| audio.js | 2 | 飾り |
| meguru.js | 3(`RANDOM = Math.random` + `setRandom`) | 呼び出し 58 か所。住民の AI 用で、差しかえられる |

- **seed 付きの汎用 PRNG は production にはない。** 決定的なのは次の 3 つ: めぐるの `hash` / `hrand`(`dailyKey` + 時間帯 + 天気)、`simulatedWeather`、今日のチャレンジ。
- テストの乱数 stub は vm context ごとなので、ファイル間にも harness 間にも **漏れない**。ただし `Math.random` を定数に固定すると、一部のミニゲームは終わらなくなる(domino の rejection loop)。
- **境界の整理**: 「世界の見た目」は決定的な hash(◎)、「住民の行動」は差しかえられる RANDOM(◎)、「本体の gameplay」は `Math.random` を直接呼ぶ(テストは vm ごとに stub する)。**本体を無理に seed 化する必要はありません。** 必要なのはテスト側の既定値の固定です(P1-7)。

### 10.2 時刻 [V]
- **実時間に依存する gameplay**: 留守中処理、`gamePassReadyAt`、一時的なすがた、環境の鮮度、`dailyKey`、自動の季節、`timeOfDay`、疑似天気。
- **描画の時間**: `performance.now` と rAF(games 387 / script 14 / quick 7 / meguru 3)。風車だけは draw に渡された `now` を使わずに `performance.now()` を直接呼んでいる(P3)。
- **テスト**:
  - 実日付で落ちる型(b33947f)は 2 本だけ直されている。
  - `new Date()` は、`pinDate` がなければ本物。`pinDate` があっても world-environment は本物(P1-7)。
  - economy 系は「実際の日付が進むこと」に依存している(`new Date()` をすべて固定すると hang する。9edc0e7)。
- この監査での時計ずらし sweep:
  - めぐる以外の 59 ファイル × 8 つの時刻(年末・閏日・DST・早朝・夜)→ すべて緑 [V]
  - 固定なしの harness ファイル 47 本 × 2 つの時刻 → すべて緑 [V]
  - **めぐる 28 ファイルは sweep していない**(1 回に約 18 分かかるため)。**ここが残っている最大の不確実性**です。

---

## 11. rendering / performance

- **Canvas renderer の実態**:
  - 毎 frame、`world.props` の **全件** を project → sort → occlusion。空間 index はない。jungle では 1,297 件。
  - 描画数には上限がある(tier ごとに 58 / 86 / 124)。
  - `shadowBlur` は 0 か所。`ctx.filter` は bake に失敗したときの fallback だけ。
- **cache**: glyph(400 件、あふれたら全消去)、sprite(160)、sh(6,000)、image、formation(64)。glyph と sky は CSS px で作るので、DPR 2 では少しぼやける(P3)。
- **DPR** は tier に応じて 2 / 1.5 / 1 で頭打ち。DPR 3 の端末も実際は 2 で描く。36 ms を超えると `halfRate`(描画を間引く)。
- **O(n²) の監査**:
  - `personalSpace` は O(k²) だが k ≤ 48。`seekPartner` は O(n) で予算制。
  - party の formation は O(n)。corridor の追従は 27 人で約 3.3k の評価/frame。
  - 図鑑の描画は O(系統 × 段階 × 発見数)。500 形態でも約 25 万回。
  - **シールのパック抽選**: 候補ごとに `stickerStore()` の全 normalize を呼ぶので、実質 O(n²)。344 件なら問題ない。**1,000 件を超えると最初に痛くなる** [I]。
  - `ITEM_SYSTEM.stock()` も呼ぶたびに全 normalize する。
  - 実績の判定は 91 件を 3 秒ごと。300 件になると無駄が目立つ。
- **Canvas はどこまで耐えるか [I]**:
  - 地域 26: 1 frame の負担は増えない(今いる地域しか build しない)。
  - party 27: p95 18.6 ms(CPU 4 倍遅延 + DPR 3、handoff §17)。
  - corridor 10 本: 1 本あたり景色は最大 150。問題なし。
  - **景色の密度** が限界。props が 1,500〜2,000 を超えたら、セルごとの prop index による culling が要る。
  - 到着時の `buildWorld` 100〜170 ms が、4E-3 の本当の課題。

---

## 12. めぐる

### 12.1 責務の分離
責務の一覧は §2 と、meguru の handoff 群がよく整理しています。この監査の評価:
- **simulation → DOM**: きれいに分かれている [V]。4C / 4E-2 のテストが source grep で守っている。
- **UI → save**: bridge が唯一の書き口 [V]。
  - ただし `worldRegions()` は「読むと書く」関数(merge したうえで `saveState` を呼ぶ)。
  - 記録 1 件ごとに全体を同期で save する(P2-10)。
- **renderer が地理を知りすぎている**: 中程度。
  - region ID による分岐が約 20 か所。
  - `SKY_OVERRIDE`、`WORLD_GEOGRAPHY` を直接参照している箇所がある。
  - `start()` が独自の `FOLIAGE` 表を持っている。
  - 逆方向の漏れのほうが大きい。`WORLDS` 自身が `clutter` / `frame` / `fore` / `edge` の **Canvas の手続き的な描画名**(`'bigtrunk'` など)を持っていて、「意味の世界」が一部「Canvas の display list」になっている。
- `drawTransition`(242 行)と `drawCorridorCover` は、renderer の contract の外(`start()` の中)で `ctx2d` に直接描いている。

### 12.2 巨大関数の判断
| 関数 | 行数 | 判断 |
|---|---|---|
| `start()` | 約 1,043 | **4E が終わったら分割する。** 継ぎ目は明確(layout / found toast / save adapter / transition / corridor lifecycle / frameFn) |
| `createCanvasRenderer` | 約 1,577 | `drawStructure`(97 case)を表か module に出す。`draw()` の順序と occlusion は **そのまま** |
| `buildWorld` | 469 | 段階に分ける(地形 → zone → 端の props → 壁 → … → 住民 → 障害物)。**4E-3 の frame 分割 build とセットで行う** |
| `drawWorldMap` | 378 | 入力が data で出力が pixel の pure 関数で、変更も少ない。**触らない** |
| `draw(view)` | 約 200 | 1 本の順序つき pipeline。**分割しない** |
| `frameFn` / `sim.step` | 100 / 85 | 問題なし |
| script.js の `loadState` / `tick` / `render` | 318 / 258 / 249 | `render` の disabled 20 か所以上は data 化の候補。`loadState` は **テストが厚いので触らない** |

### 12.3 大事な制約
**テスト 11 本が meguru.js を文字列として読み、`// ====== Phase …` の marker や `function createSimulation(` で切り出しています。**
ファイル分割や整形をすると、それだけでこれらが壊れます。module 分割は、これらを「import graph の検査」に書きかえる作業と **同じ PR** で計画する必要があります。

---

## 13. party / resident

- **住民の registry**: `form:line:i` / `companion:` / `partner:` を key で重複除去し、旧系統は除外している [V]。現在の save では 247 + 26 = 273。247 は直書きではなく図鑑から導出。
- **LIFE の tier**(詳細 48 人、近距離は 6 frame に 1 回、遠い住民は 1 frame に 12 人、相手探しの予算は 1 frame に 2 件)があるので、310 人入れても sim は 1.04 ms [V]。**500 人でも持つ。**
- **party**: formation は O(n)。LOD と bake した sprite で 27 人に対応済み。**4E が終わるまで触らない。**
- **「同一身体 / 一群 / 別個体」の 3 分類はコードにも data にも存在しない** [V]。
  - #278 の QA 文書に、ユーザーが確定した規則(A / B / C、4 つ目の分類はない、unknown 04 は例外ではない)として **文章だけ** で書かれている。
  - main 側には、クマノミの性転換が ID で特別扱いされている程度しかない。
  - **表情や住民の数を増やす前に、master(または #278 の表情 registry)に `bodyKind: 'same' | 'group' | 'separate'` を stage 単位の data として持つことを推奨します。** これは人の記憶に依存しないための正本化で、抽象化のための抽象化ではありません。

---

## 14. items / stickers / achievements

- **items-v2**:
  - CATALOG 27 = 装備 10 + 消耗品 12 + 目標アイテム 4 + テーマパック。
  - 退役・移行は ◎。
  - **効果は `isEquipped` の if が 12 か所以上に散らばっている**。1 つ足すのに 5〜6 か所。
  - 60 個規模を目指すなら、「効果の hook 名を CATALOG に書き、呼び出す側は hook を列挙する」程度で十分。汎用の effect engine は **不要** です。
- **special reward**(おまもり / ランタン / リング / かんむり):
  - 解放条件は `unlockTier`(ordinal)、効果は `hasNaotoItem` の if。
  - ゴールと効果は「ゴール → 付与(`syncNaotoRewardItems`)→ 効果」の一方向で、二重管理ではない。
  - ただし `naoto_charm` の説明文が 2 通りある。かんむりの条件は図鑑の length 判定(P1-2)。
- **シール**:
  - 自由なページ 15、1 ページ 24 枚、同じシールは 9 枚まで、パックは 30 / 60。
  - カタログ 344(form 248 / 仲間 26 / 恋人 18 / アイテム 27 / 景色 23 + 報酬限定 2)。
  - 背景は地域 11 + 特別 2(訪れたあとに解放)。タスク 8 個で銀(5)・金(8)。
  - 旧 4 ページ制と旧タスク ID は移行済み ◎。
  - README の記述が古い(P2)。
- **実績**:
  - **91 件**(依頼文の「30」は古い数字)。1 つの配列に条件の closure を持つ形で、追加しやすい。
  - ID の一意性を確かめるテストはない。
  - 数字入り ID と実際の条件が食いちがっている(P3)。
  - `item-all` の意味が問題(P1-8)。

---

## 15. goals / ending / story

- 100 歳・そだち 70・そだち 100 は定数から来ているが、**判定のコードが約 9 か所に分散** している(`endingProgress` / `achievedGoalTiers` / `crownAchievementWeight` / `getEndingTier` / `dex-complete` / `renderEnding` / `renderDex` / 人生カード / プロフィール)。**`isDexComplete()` のような共通 helper がない**(→ P1-2 の温床)。
- **story は中央の状態機械を持っていない。**
  - 伝説: `hasPerk(70)` + 確率 1.2%/tick + `movie-dialogue`。
  - ナオト: `isAuthorUnlocked()` = tier 3 以上 + 一時的な `grandGoalPending`。めぐるでは memory_lake に住む。
  - 特別な地域: いまの人生の `hasPerk(70)` が必要。
  - **初回の導入 story はない。**
- **master の伝説の label と、runtime の意味がずれている**(master では `boss` = 大王イカ、runtime では「むかしのぼく」)。`affinityRegions` だけが今も読まれていて、退役した概念に重みが残っている(P2)。
- 変更しやすさ: 伝説・ナオトは台詞が data 化されていて、変更しやすい。「どのゴールで何が解放されるか」は ordinal の平行配列で、**変更しにくい**(P2-3)。

### 恋愛(§32-33)
- 定義は script.js の中に閉じている:
  - enum:3281-3293
  - `attractedToFor`:6612
  - `mutualRomanticMatch`:6663
  - `recheckRelationship`:6679
  - 求愛の handler:16680-16790
  - 結婚:7743-7790
- 条件の二重定義は少ない ◎。
- 表示(ゲイ/レズビアン、NB には中立の文言)、random 生成、save の正規化(state / partner / guest / infiniteReturn)は一貫している。
- 問題: bi の再抽選(P2-7)。straight と gay の恋人は NB の自分とは永久に結ばれないので、`partner-all` と PERFECT は「性別の組み合わせ運」を必要とする [I]。**仕様として意図したものか確認を推奨します。**

### 言葉(§34)
- `TEXT_STYLE` と実際の文言が食いちがっている(「そうび」、koala / kinoko)。
- 装備の反応文に旧名が残っている。
- 実績の説明で、かなと漢字の方針が混ざっている。
- machine ID(`ribbon` / `bowtie`)と表示(おもちゃばこ / おべんとうばこ)が離れてしまった。**ID は変えず、文言だけ直す** のが正解です。

### 多言語化(§63)
- 文言は script.js の中に直接書かれている(`setMessage` 103 か所・台詞の表)。
- 仮に将来やるとしても、困るのは「文言を正規表現で照合している箇所」(`lifeLogIconHTML` の `/になった|にへんしんした/`)と「表示名を fallback の key に使っている箇所」だけです。**いま多言語化の準備をする必要はありません。**

---

## 16. UI / mobile / accessibility

- **Home の 3×3**: 10 種類の viewport で、ボタンは最小 49 px、はみ出しなし [V]。**余白はもうない。**
  - 提案(実装はしない): お世話 6 つを固定する。3 段目は状況によって変える(たび / きゅうあい / メニュー + 「おすすめ」枠。`careRecommended` は既にある)。新機能はメニュー sheet(スクロールできる)へ。動詞を data(`{id, icon, enabled, visible}`)で表し、`render()` の disabled 20 か所以上を置きかえる。
- **overlay の z-index**: movie 1000 > 図鑑の詳細・wipe 50 > パネル 40 > 人生カード 20 > めぐるの地図 12 > … > クリア画面 5。
  - 衝突は 2 つ。人生カードの上にメニューが開ける。**クリア画面の上に toast(z6)が乗る**。どちらも P3。
- **状態**: `activeOverlay` + boolean 約 12 個 + DOM の hidden を状態として使っている(`storyFlash` など)。
  - **提案**: トップ階層の `mode`(home / minigame / meguru / meguruMap / sheet(kind) / subdialog / cutscene / ending / lifecard / transformChoice)を 1 つ置き、そこから `isTimePaused`・Escape・戻る・focus・`homeFixed`・ボタンの有効無効を決める。
  - **時期は release の後**。いまは多くのテストが不変条件を守っているので、急いで置きかえるほうが危険です。
- **通知**: P1-9 のとおり。**めぐるの `queueFound`(優先度つきの queue・最大 4 件・180 ms の間隔)がそのまま手本になります。**
- **タッチ**:
  - `touch-action:manipulation` はボタンと overlay にある。
  - `#petArea` にはないので、iOS で連打するとダブルタップ zoom が起きうる(P2)。
  - 長押しの callout 対策(`-webkit-touch-callout`)がない。ミニゲームの長押し旗立てと競合しうる(P2)。
- **iPhone**:
  - 幅 320×568 ではキャラの領域が約 199 px。toast は `nowrap` なので、`mg-result-toast` が溢れる可能性がある [I]。
  - 横向き(高さ 500 以下)では、めぐるの pad が 30 px まで縮む。
  - 実質的な **最低動作環境は Safari 16 / Chrome 105**(`:has` / `@container` / `inert` / `dvh` / `Object.hasOwn`)。README に明記を。
- **a11y**:
  - 12 px 未満の font 指定が約 185 か所(「もじ おおきめ」設定と pinch zoom はある)。
  - パネルに `role=dialog` / `aria-modal` / focus trap がない(**P1〜P2**)。
  - games / quick が reduced-motion を見ていない。
  - 再挑戦ボタンが 3.6 秒で消える(WCAG 2.2.1)。
  - 色だけで情報を伝えている箇所は ◎(数値と文字を併記)。音だけに頼る gameplay もない ◎。
- **戻る**: `history` を使っていない。Android の戻るで離脱する。

### 製品リスク(§76-81)
- **最初の 10 分**:
  - たまご(8 つのボタンが無効、あたためる 40 回で孵る)は分かりやすい。
  - **孵った瞬間に 9 つの動詞 + メニュー 8 つ + つうしん + 雑談(4〜9 秒ごと)+ 誕生日(60 秒ごと)が一度に出る**。チュートリアルはミニゲームの初回だけ。
  - 段階的な解放を推奨します。
- **中盤**: できること(対決、シール 15 ページ、図鑑、アイテム、たび、めぐる、クイック)が多すぎて、見つけにくいのが risk。画面を開いているあいだは歳をとらないことが伝わりにくい。
- **終盤**: 100 歳まで home で 100 分、ミニゲームやめぐるを含めると 3〜4 時間 [I]。④ 図鑑と ⑤ 全実績は多周回が前提。`item-all` の近死要件(P1-8)と、恋愛の性別運(§15)が **エンドゲームの詰まりどころ** になりうる。
- **経済**: お金 0 での soft lock はない ◎。装備を買いきった後の大きな使い道がなく、お金に上限もない。ルーレットの期待値は約 268 / 300(P3)。
- **soft lock**: 通常のプレイでは見つからない ◎。改変や破損が絡むもの(未知の stage、`partner` が文字列、P1-1)だけ。

---

## 17. tests / CI

### 分類 [V]
| 種別 | 件数 |
|---|---|
| unit(pure) | 7 |
| harness を使う integration | 85(+ smoke / dialogue の独自 vm) |
| browser(Playwright) | 17(入口 4、そのうち CI で走るのは 3。`movie-browser` は **どこでも走っていない**) |
| visual | pixel diff なし(geometry と screenshot の artifact だけ) |
| remove-it | 6(めぐる 4B〜4E-2 だけ) |
| 不在の assert | 約 30 |
| 決定的(seed・時刻を固定) | 85 本中 38 |
| 件数の直書き | 20 ファイル |
| **source-text parsing** | **24 ファイル** |

### 効いているところ
- 本物のコードを vm で動かす harness(仮想タイマー・暴走ガード)。
- save の復旧 25 件。
- WebKit を含むブラウザ layout(10 viewport、safe-area、44 px、runtime error の捕捉)。
- 原因の書き残し(b33947f、9edc0e7)。

### 穴
1. **P1-7**: 時刻の host 漏れ。time / weather / season の既定値を固定していない。
2. **save のゴールデン fixture がない**。古い版の本物の save で load → save → load が冪等かを見るテストがない。visual-qa の fixture は今のコードから毎回作るので、一緒に変わってしまう。
3. **save の破損 fuzz がない**(P1-1 を防げていない証拠)。
4. **registry の property テストがない**(ID の一意性、必須 field、asset の存在、各実績がどこかで到達可能か、70 / 100 の境界 69 / 70・99 / 100)。
5. **source-text の弱点**:
   - コメントまで照合する(`lucky-coin-test:55` の `doesNotMatch` を script.js 全体にかけている、`phase4e2:568` は「`travelToRegion(` の後ろ 6,000 文字に `corridor` がない」)。
   - 6 空白のインデントで関数の終わりを判定している。
   - コメントの文言を境界に使っている。
   - `MG_SWIPE_MIN` が 11 回以上出てくることを数えている。
   - export 行の並びを正規表現で照合している。
   - 最近の実害: **668a0cf で smoke の `make*` 正規表現に合わせるため、production の名前を変えた。**
6. **remove-it が薄まっている**: 後の phase が層を使いはじめると、「X と、X を使う側をまとめて抜いても変わらない」になり、X について何も証明しない。`strip4d2` が 5 ファイルにコピペされている。**本体(script.js・save・goal)には remove-it がない。**
7. **phase 名のテストがたまっている**: 新しい phase を足すたびに、古い phase のテストを O(phase 数) だけ修正する必要がある(3B-Final では 12 ファイル)。
8. **CI**:
   - `npm test` が 1 本の `&&` の連鎖。先頭で落ちると、後ろの 91 ファイルの結果が見えない。`dialogue-test` は最初の assert で止まる。
   - smoke に `timeout-minutes` がない。
   - home-layout の paths filter が asset・`*.mjs`・`*.json` を拾わない。
   - めぐるの browser は touch や isMobile ではない。
   - 4D-2 の遠景と 4E-2 の corridor 歩行に browser での検証がない。
   - Playwright が package.json にない。
9. **分離**: ファイル間は別 process なので ◎。ファイル内で harness を共有している 4 本は、順序に依存しうる。

---

## 18. content scalability(倍にしたらどこが壊れるか)

| 増加 | 実行時 | 作業・データ | 判定 |
|---|---|---|---|
| 地域 13→26 | 問題なし(今いる地域しか build しない) | **地域ごとの表 約 18 個 + `REGION_FRAME` を手で解く + `GEO_AREA` + テスト 20 本の分母**。抜けは黙って home に置きかわる | **網羅テストなしでは破綻する** |
| キャラ 248→500 | 図鑑・住民は問題なし | 平行表 6〜11 か所(抜けると起動時にクラッシュ)。表情 PNG が約 +2,500 枚(約 33 MB) | validator があれば耐える |
| アイテム 26→60 | `stock()` の normalize が重なる | if の hook が 5〜6 か所 × 34 | hook 名の data 化が要る |
| 実績 91→300 | 3 秒ごとの判定が無駄に重い | 1 行ずつ追加(◎) | 判定の間引き |
| 住民 247→500 | LIFE の tier で約 1 ms | 自動 | ◎ |
| シール 344→1000 | **抽選が O(n²)** | 自動 | 修正が必要 |

**旧 save はこれらの拡張の後も読めるか**: 「足す」だけなら読めます(ID の追加、分母は導出)。
危ないのは次の 3 つです:
- (a) ゴールの ordinal に挿入する
- (b) 段階の ordinal に挿入する
- (c) ID の rename(alias を runtime に効かせる仕組みが仲間にしかない)

---

## 19. future Three.js

- **Canvas で十分な範囲**: 今の疑似 3D(pitch なし)、景色の密度が今の jungle / forest 程度、party 27、corridor 10 本、地域 26。4D と 4E の設計(§21)が Three.js を見送った判断に **同意します**。
- **WebGL が必要になる条件**: ① props がおよそ倍(1 地域 2,500 以上)、② 本物の 3D カメラ(pitch・自由視点)、③ 暗転なしの streaming を GPU 常駐で実現する必要が出たとき。
- **renderer の contract は足りているか**: **まだ足りません。**
  - `start(container,{renderer})`、`draw / resize / destroy`、view を変更しない、といった骨格は ◎。
  - しかし view が `world` をそのまま渡していて、そこに Canvas 固有の 97 種類の手続き的な描画名が入っている。
  - `drawTransition` / corridor の cover / `warmStep` が contract の外にある。
- **移行するなら**: 先に「描画に中立な prop の記述」(kind、寸法、色の役割)を 1 段かませる。ただし **③ が現実になるまでは着手しない** ことを推奨します。

---

## 20. card-game との境界

- #259(設計のみ)は、main の ID に種類の prefix を付けて **再利用** している(`M-<species>-01..08`・`C-`・`P-`・`W-<region>`・`I-<item>`・`E-`)。表示名はキーにしていない ◎。main の ID はすべて現存している [V]。
- **共有すべきもの**: **identity だけ**(ID・表示名・絵のパス)。`character-world-master.v1.js` を読む側として共有する。
- **分離すべきもの**: ルールと効果。カードだけの属性(8 属性、ちから / ちえ、時コスト、レア度、同名の枚数制限)を master に **入れない**。
- **同じ名前でルールが違う概念**(無理に共通化しない):
  - そだち: 本体では EXP ではない。カードでは競争の得点。
  - レア度: 本体では入手の段階。カードではデッキ構築の制限。
  - 恋愛: カードは性別も相手も扱わない。
  - 伝説: 本体では抽選の重み。カードでは場所を問わない できごと。
  - 地域: 本体は home が拠点。カードでは 13 すべてが普通。
  - へんしん / たまご / 時、アイテムの効果、ナオト(本体は作者で神ではない。`E-naoto` は canon との照合が必要)。
- **統合時のリスク**:
  - main に古い SSOT 文書が 2 つ残る(「ときとばし」)。
  - branch が main を追跡しているのは 09-18 まで。その後の伝説の書きかえ(#315)、世界の canon(#321)、シール(#304 / #306 / #307 / #323)に追いついていない。
  - 23 MB の data JSON が Pages にも公開される。

### 表情システム(#278)
構造の評価:
- 基本の絵 + 表情 10 種類の PNG。
- マーク・汗は PNG に焼きこまず、SVG で重ねて stage ごとに位置を指定する。
- resolver の優先順位が明快(blocked > sleeping > weak+critical > reaction > persistent)。
- fallback は 3 段(表情 → 基本の PNG → 絵文字)。
- **save に触れない** ◎。

統合時のリスク:
1. F01〜F06 が未解決(PNG 26 枚、空腹マークの既定値、`isSick` と汗の重なり 346 組)。
2. **PNG に cache-bust がない**。同じパスで差しかえると古い絵が残る。
3. main の master を読まず、系統 ID を直書きしている。段階名を JSON で複製している。
4. 3 分類が data になっていない(§13)。
5. repo が +65%(約 33 MB の PNG + 10 MB の QA 文書が Pages に公開される)。
6. main で `emotePet` を呼ぶ経路や stage が変わる経路(例: `c_life_charm`)に、一時的な表情を消す処理を足す必要がある。
7. 感情の語彙が 3 系統ある(#275 の `state`、#278 の顔、main の `emotePet`)。

---

## 21. quick wins(安く、効果が大きい)

1. **図鑑・恋人・地域の件数 helper**(登録済み ID との積集合 + 重複除去)。約 9 か所をこれに置きかえる。→ P1-2
2. `normalizeStateValues` で `discoveredStages` / `achievementsUnlocked` / `partnersRecorded` / `regionsVisited` を「文字列だけ、重複なし」にする。→ P1-1。backup への昇格は、起動後の最初の save に成功した後にする。
3. `asset-versions-test` で hash を計算しなおし、token と照合する。→ P1-5
4. harness の `reset()` で time / weather / season の既定値を固定し、world-environment には harness の `now` を渡す。→ P1-7(4E-3 の前提条件とも重なる)
5. `loop()` に `if (document.visibilityState === 'hidden') return;` を入れる。→ P1-3(仕様を確認のうえ)
6. index.html に inline の起動 watchdog(N 秒以内に起動しなかったら「再読みこみ / セーブコードを写す / snapshot から戻す」)。→ P1-6
7. `home-layout.yml` の paths に `assets/**`・`**/*.json`・`**/*.mjs` を足す。
8. HeartRails に送る座標を小数 3 桁に丸める。
9. 装備の反応文とコメントを今の概念に合わせる(文言だけ。ID は変えない)。
10. 古い文書の冒頭に「superseded」の注記を入れる(README のシール節、MASTER_SPEC の 168、card-game-design×2)。

---

## 22. do-not-touch(いまはきれいに動いているので触らない)

- **4E が終わるまで**: `REGION_FRAME` と変換(meguru.js:4887-5019)、4E-1 spec の純粋性、`continuousWalkMode` という唯一の分岐点、corridor の状態を保存しないという規則、bridge が唯一の save の書き口であること、LIFE の tier、party の formation / LOD / bake、`worldMapData` の漏れ防止規則、`resolveGate` の優先順位。
- **meguru.js のファイル分割・整形**(source grep テスト 11 本が壊れる)。
- `loadState` / `migrate` の段階 gate(`parsed.schemaVersion` を見ている点を含む)。直すのは要素の検査と backup への昇格タイミングだけにする。
- `item-system.js` の退役と払いもどしの層。
- `activeOverlay` + `isTimePaused` の排他と時間停止(state machine 化は release の後)。
- home-touch.js、viewport と safe-area の処理。
- `draw(view)` の順序つき pipeline、`drawWorldMap`。
- guest / duel コードの whitelist 検査。

---

## 23. recommended roadmap

前提: **Phase 4E の本線(4E-3 → 4E-4)を壊さない。別の Draft に割りこまない。大きな改修を同時に始めない。**

### 23.1 今すぐ(最大 5 つ。どれも script.js の save / goal まわりかテスト基盤で、meguru.js の 4E 領域には入らない)
1. **件数の正本化 + 配列要素の検査 + backup 昇格の修正**(P1-1 / P1-2)。旧 save を模した fixture テストを添える。
2. **harness の時刻・環境の既定値の固定**(P1-7)。4E-3 の前提条件(flaky 2 本の seed 化)と一緒に進めると 1 回で済む。
3. **token の hash 照合テスト + CI の paths の修正**(P1-5)。
4. **起動 watchdog / 救済画面**(P1-6)。
5. **PR の整理の判断**(ユーザーが決める): #302 と #92 を閉じる(置きかえ済み)。#275 は #278 に吸収するか、先に小さく merge するかを決める。

### 23.2 4E 完了後(最大 5 つ)
1. **めぐるの地域・接続の網羅 validator**(18 の表 × 全地域、接続の field どうしの整合、spec が `null` になったらテストを落とす)。地域追加の前提条件。
2. **meguru.js の分割**を、source grep テストの import-graph 化と **同じ PR で** 行う(`start()` の継ぎ目、`drawStructure` の表化、`buildWorld` の段階化)。
3. **テストの負債整理**: 分母を 1 つの helper に集める、`stripPhases` を共通化する、remove-it の「卒業」規則、phase ファイルを topic ファイルに統合する。
4. **save の write path を軽くする**: dirty flag と間引き、snapshot を毎回 parse しない、めぐるの記録を frame の外で確定させる。
5. **未来の save への耐性**: `savedByBuild` を足し、未知の ID を削除しない。

### 23.3 リリース直前(最大 10)
1. タブが隠れたときの時間の扱いを仕様として決め、実装する(P1-3)。
2. 複数タブの保護(`storage` event で「別のタブで開いています」を出す)(P1-4)。
3. `history` による戻る操作への対応(P1)。
4. 通知の優先度 queue(`queueFound` を手本に)(P1-9)。
5. `item-all` / PERFECT と、恋愛の性別運の仕様確認(P1-8、§15)。
6. save のゴールデン fixture(古い版の実 save 5〜10 個)+ 破損 fuzz。
7. パネルの dialog semantics(role・focus trap・inert)。games / quick の reduced-motion。
8. 画像の差しかえ方針(改名するか `?v=` を付けるか)。#278 を統合する前に必ず。
9. 文書の正本の整理(README / MASTER_SPEC / TEXT_STYLE / card-game の旧 SSOT)。最低動作環境(Safari 16)を明記する。
10. HeartRails に送る座標を丸める。toast の 320 px 対策。`#petArea` に `touch-action` を付ける。

### 23.4 リリース後でもよいもの
- トップ階層の state machine 化。Home の動詞を data 化する。
- ゴールの ordinal を ID に変換する層、`bodyKind` の data 化(表情の拡大より前)。
- アイテム効果の hook 名を data 化する(アイテム 60 個を目指す段階で)。
- シール抽選の O(n²) 解消(1,000 件を目指す段階で)。
- `buildWorld` の hash seed の数値化、prop の空間 index(景色を増やす段階で)。
- renderer に中立な prop の記述(Three.js を本気で検討する段階で)。
- CSP、debug global の整理、dead code の削除、フォントの subset。

---

## 24. maintainability scorecard(文章による評価)

- **data modeling**: ID の設計は良い(安定した snake_case、prefix による名前空間、alias の方針)。弱いのは「ID ごとの平行表」と「ordinal の平行配列」。登録表を正本にし切れていない箇所が P1 の原因になっている。
- **state management**: save の state は `freshState` を雛形にしていて明快。UI の状態は boolean の集合で、今はテストで持ちこたえているが、画面を足すたびに手間が増える。
- **render separation**: めぐるの simulation と renderer は良く分かれている。renderer contract はまだ半分で、意味の data の中に Canvas の語彙が混ざっている。
- **save safety**: 失われないことに関しては非常に強い。**「壊れた内容」への強さ**(要素の型、未来の版、複数タブ)が弱い。
- **test quality**: 量と執念は突出している(1,307 件)。質の穴は、時刻の host 漏れ、source-text 依存、save / registry の property テストがないこと。
- **mobile robustness**: layout は WebKit 込みで検証されている。戻るボタン・長押し・dialog semantics が残っている。
- **content scalability**: 実行時の性能は十分。「足したときに抜けを検出する仕組み」がない。
- **performance headroom**: 景色の密度と到着時の `buildWorld` 以外は余裕がある。
- **developer ergonomics**: 1 ファイル 18k / 8k 行の closure と、source grep テストの組み合わせで、「分割できない」状態が強化されつつある。4E の後がちょうど分割の好機。

---

## 25. 最後に(明示的な回答)

### 一番危険な 3 点
1. **save の配列要素が壊れると起動不能になり、backup にも同じものが写る**(P1-1)。いまは起きていないが、壊れたときに save を失いうる唯一の経路。
2. **ゴール・図鑑・かんむり・ナオト解放を配列の長さで判定している**(P1-2)。旧 save で見た目と判定が食いちがい、しかも永続する。**集計が正本を通っていない** という設計上の欠陥の代表例。
3. **めぐるの地域の表 約 18 個が、抜けても黙って fallback する**(P2 の筆頭)。地域を倍にする段階で、見た目や挙動が静かに壊れる。

### 一番よくできている 3 点
1. **save の復旧経路**(backup・書きこみ停止・snapshot・容量ぎれへの対応)と **アイテムの退役・移行層**。
2. **めぐるの層と座標の分離**(DOM を持たない sim、save の書き口は bridge だけ、4 層の座標規則、corridor を保存しない)と、remove-it の fingerprint テスト。
3. **排他的なパネル + 時間停止**、iOS の viewport 処理、Chromium と WebKit の両方で走るブラウザ layout CI。

### 今すぐやるべき 5 点
§23.1 のとおりです。① 件数の正本化と要素の検査、② harness の時刻と環境の固定、③ token の hash 照合、④ 起動 watchdog、⑤ superseded な PR の整理の判断。

### Phase 4E 完了まで触らないほうがいい箇所
`REGION_FRAME` と変換、4E-1 spec、`continuousWalkMode`、corridor を保存しない規則、bridge、LIFE の tier、party の formation と LOD、`resolveGate`、**meguru.js の分割と整形のすべて**、`buildWorld` の構造(4E-3 が段階化と一緒に扱う)。

### リリースまでの残作業
- P1 の 9 件(+ Android の戻る)。
- §23.3 の 10 項目。
- 4E-3 / 4E-4 の完了、もしくは「4E-2 の 1 本だけで release する」判断。
- #278 の F01〜F06 の判断と、画像の cache 方針。

### 長期的に最も重要な設計判断
**「登録表(master / `WORLDS` / CATALOG / `ACHIEVEMENTS`)を唯一の正本とし、件数・達成・表示・save の repair はすべてそこを通る。平行表は網羅テストで縛る」という規律を固めること。**
Three.js にするかどうかや、ファイルの分割よりも先です。これが固まれば、キャラ・地域・アイテム・カードをいくら増やしても、「抜けが黙って通る」ことがなくなります。

### 今後 100 キャラ増えても耐えられるか
- **実行時: 耐えます。** 図鑑・住民・シールの抽選(1,000 件未満)は問題ありません。
- **作業: 条件つきで耐えます。** 平行表 6〜11 か所の抜けは起動時のクラッシュになり、表情 PNG は 1 キャラ 8 段階 × 10 枚が増えます。**ID の網羅 validator(テスト 1 本)を入れれば耐えます。**

### 今後 region が倍になっても耐えられるか
- **実行時: 耐えます**(今いる地域しか build しません)。
- **作業と正しさ: 今のままでは耐えません。** 18 の表、`REGION_FRAME` を手で解く作業、テスト 20 本の分母、黙って置きかわる fallback があるからです。
- **4E の後に validator と表の網羅テストを入れることが前提になります。**

### save 互換は十分か
- **古い save → 新しいコード: 十分です**(段階移行 + normalize + 払いもどし)。
- **不十分なのは次の 4 点:**
  - ① 配列要素の型(起動不能)
  - ② 未来の版と rollback(未知の ID を削除する)
  - ③ 複数タブ
  - ④ ordinal(ゴール・段階)への挿入
- さらに、**古い版の本物の save を使った golden テストがない** ので、互換を「証明」できていません。

### テストは十分か
- **量と回帰の検出は十分以上です**(1,307 件が緑、WebKit layout、remove-it)。
- **質は、4 か所が不十分です:**
  - ① 時刻と環境が host に漏れている(flaky の再発源)
  - ② save の golden / fuzz がない
  - ③ registry の property テストがない
  - ④ source-text テスト 24 本がリファクタリングを妨げている
- ①〜③ は数十〜百行で足せます。④ は meguru.js の分割と同時に解消するのが最も安く済みます。

---

*この監査は、実コード・テスト・git 履歴・open PR 7 本を一次資料にしました。数値の実測(`buildWorld` の時間、sim の負荷、save の probe、時計ずらし sweep、CDP による layout と offline)は、この監査の scratchpad で行いました。リポジトリの既存ファイルは変更していません。*
