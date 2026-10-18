# RH-6 Test Architecture Cleanup — QA 記録(2026-09-28)

基準: `main` `783124952504cce1d5b58364c721b8154848c4a2`(Merge PR #352 = RH-5)
branch: `claude/naotocchi-rh6-test-architecture`
正本: `docs/roadmap/naotocchi-release-hardening-roadmap-2026-09-24.md` §7.3

production の JS / CSS / HTML は 変えていない(テストと テストの 部品だけ)。

## 1. harness の 既定と プリセット(`tests/helpers/runtime-harness.cjs`)

| 設定 | 既定 | 変更 |
|---|---|---|
| `environment` | **ひる・はれ(固定)** | RH-6 で 反転。host の 時計の 本物の ふるまいは `environment: 'auto'` |
| `seed` | なし(本物の Math.random) | 変えない(既定に すると 別の harness が 同じ らんすうに なり、`item-collections-economy` の duel の `matchId` が そろって 赤) |
| `pinDate` / `clockNow` / `hostEnvironmentClock` | false / 1000 / false | 変えない(`pinDate` を 既定に すると 日の 進む テストが とまる) |
| `deterministic: true` | — | 新しい プリセット: environment(ひる・はれ)+ hostEnvironmentClock + seed 20260923 + pinDate + clockNow 2026-09-16T12:00Z。個別の 値が 優先 |

- 監査の 実験: environment だけ 反転 → 1457 件中 失敗は 既定の 契約を 見る `harness-determinism` の 3 件だけ(ここで 'auto' を 明示して なおした)。めぐる 40 file を host の 時計 2 とおり(2026-12-24 / 2027-03-15、Asia/Tokyo)で 544 / 544。
- `harness-determinism-test`: 既定の テストを「ひる・はれ・本物の らんすう・new Date は 固定しない・Date.now は harness」に、host の 時計に 従う 3 件を 'auto' に、プリセットの テストを 1 件 追加(9 件)。

## 2. 既知の flaky 2 本

| テスト | 原因 | 変更 |
|---|---|---|
| `meguru-test`「めぐるに はいる」 | host の 時計の 時間帯・3 時間ごとの 天気・こよみ・めぐるの らんすう | `harness({ deterministic: true, environment: { time: 'day', weather: 'cloudy' } })`。手書きの timeMode / weatherMode / setRandom と `seededRandom` を 削除 |
| `meguru-discovery` ⑥-1 | host の 時計の 時間帯と 天気 | `setup()` に options を 足して 同じ プリセット。手書きの timeMode / weatherMode を 削除 |

assertion は 変えていない。監査で 3 日 × 9 時刻 × 2 TZ(entering 108 回・⑥-1 54 回)の sweep: 手書きを 外すと 6 / 4 回 失敗、プリセットで 108 / 108・54 / 54。プリセット(pinDate まで)で 3 つの host の 日付でも 場面の hash が 同じ。

## 3. 共通の 部品

- `tests/helpers/source.cjs`: `read`、`codeOnly`、`literal(file, decl)`(文字列と 行コメントの 中の かっこを 数えない、配列も 可、この realm へ JSON で うつす)、`loadMaster()`、`stripPhase4d2`。
  - `region-registry-test` と `content-registry-test` の `literal` 2 とおり(region の ほうは 素朴な かっこ数え)と master の 読みこみを これに。
  - めぐるの remove-it 5 本(4B / 4C / 4D-1 / 4D-2 / 4E-1)に 同じ 写しで あった `strip4d2` と、3 本の `codeOnly` を これに。
- `tests/helpers/meguru-denominators.cjs`: SPOTS 471 / PATHS 654 / ZONES 118 / SECRETS 107 / TIER1 17 / COUNTABLE_ZONES 103 / COUNTABLE_REGIONS 11 / LINKS 12(値は 直書き。変わったら 気づく ため)と `countWorlds(M)`。ひみつの みちの 定義は `p[2] === 'secret'` に そろえた。`tests/meguru-denominators-test.cjs` で WORLDS と 世界地図から 数えなおして 一致を 見る。4 つの 件数を 並べて いた 14 本の テストを `D.SPOTS` など に 置きかえた(ほかの 数は そのまま)。
- `tests/helpers/browser-route.cjs`: `guardedRoute(context, pattern, label, sink, handler)`。

## 4. home-layout の ECONNRESET(観測性だけ)

- 原因は 特定できていない(RH-3 の 記録どおり、手元では 再現しない)。**retry は 入れない**。
- `route.fetch()` が こけても unhandled rejection で process ごと 落とさず、`{ label, url, code, message, msSinceCaseStart }` を 記録して `route.abort('failed')`、その case を「CSS substitution fetch failed」で 赤に する。`measurements.json` にも 残す。CI は これまでどおり 赤に なる(かくさない)。ほかの case の 証拠は 残る。
- 適用: `home-layout-browser.cjs`(safe-area の CSS の 差しかえ)、`home-conversation-browser.cjs`(safe-area と `-min` の world-scene.css)。
- `tests/test-helpers-test.cjs` で、こけた fetch を 記録して abort し、throw しない こと、成功時は 何も 記録しない ことを 確かめる。

## 5. 残した もの

- 4B / 4C / 4D-1 / 4E-1 の remove-it の「卒業」(behavior テストへの 置きかえ)は オーナーの 了承が 要る ので 触れていない。
- `movie-browser.cjs` は CI に なく 中身も 古いが、入れるか 消すかは 未決の まま。
- source-text の 危ない 切り出し(transition-polish / sea-route / 4e2 の 層分離 / smoke の `make*`)の AST 化は RH-7 の meguru.js の 分割と いっしょに。phase → topic の file 統合は 見送り。

## 6. remove-it(1 か所ずつ こわして 赤を 確かめ、もとに もどした)

| こわした もの | 赤に なった テスト |
|---|---|
| `environment` の 既定を 固定しない | harness-determinism 6 |
| `environment: 'auto'` を 解釈しない | harness-determinism 6 |
| `deterministic` プリセットを 無視 | harness-determinism 8 |
| `guardedRoute` が 記録せず 投げなおす | test-helpers 2 |
| 分母 SPOTS を 1 ずらす | meguru-denominators 1、meguru-phase3b1 3 |

## 7. 結果

- `npm test` 全体: **1461 / 1461 PASS、exit 0**(RH-5 後の 1457 + プリセット 1 + 分母 1 + 部品 2)
- flaky だった 2 本を ふくむ `meguru-test` / `meguru-discovery-test`: 44 / 44
- remove-it: 5 / 5 が 赤
