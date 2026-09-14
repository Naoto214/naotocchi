# PR267 merge-ready integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve PR267 against current main, preserve both the approved item system and Meguru, verify the combined code, and let the user merge the PR.

**Architecture:** Merge upstream into the existing feature branch and resolve the shared loaders, test command and runtime exports explicitly. Keep the item module and Meguru simulation/renderer separate. Controller publishes the verified tree, monitors existing CI, and removes Draft status; it does not merge to main or deploy.

**Tech Stack:** Static JavaScript/CSS/HTML, Node runtime harness and node:test, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-14-items-economy-design.md` and its adjacent catalog remain the item authority. The user's latest instruction「マージできるようにして」supersedes the previous stop at PR266 and the previous Draft-only submission state. It authorizes the necessary feature-branch/PR updates, not merging main or deployment.

## Global Constraints

- アイテムの値は `2026-09-14-items-economy-catalog.json` の `proposal/new_price/guard/new_desc`。価格・効果・供給を今回変更しない。
- 作業は `feat/items-economy-20260914`。main・カード設計PR259を変更せず、旧所持品・貯金・実績・記録を没収しない。
- 通常装備は1枠。基本のお世話・世界設定・既存BGM・人生カードは無料。年齢・恋愛対象・レア・図鑑の条件を飛ばさない。
- じかん→てんき→きせつ→ばしょ。短いボタンはひらがな、説明はやさしい漢字、文中絵文字・機械的空白なし。固定ホーム配置を維持。
- 実点・記録・ランク・勧誘は報酬補正と分離。クイックは1ラン1ゲーム。めぐるをゲーム報酬・星の新ゲーム種として数えない。
- 読み込み順、ムービー、指輪、アイテム、めぐるの両側を保持し、ファイル全体をours/theirsで置き換えない。
- テストの既存の期待値を弱めない。実処理の結果・消費・保存・境界を確認する。Quickの2件のhome/cloudy/night/autumnと元気91・報酬13を維持。
- ワーカーは追加エージェント・外部送信・push・PR操作を行わない。controllerがレビュー、必要なfeature更新、Draft解除を行う。mainへのマージ・公開は行わない。
- 既に拒否されたローカルブラウザ・共有URL・CDP・別ホスト・トンネル等の迂回を行わない。既存CIの自然実行は確認するが、本人による実画面・PNG・試聴確認と扱わない。

---

### Task 1: Integrate Meguru and verify the item PR

**Files:** Merge upstream `3780497b8a9fc7e72a651ba6206543e47314f89d` (PR268) into the feature. Actual conflicts are `index.html`, `package.json`, `tests/dialogue-test.js`, `tests/helpers/runtime-harness.cjs`. Preserve auto-merged `script.js`, `style.css`, `README.md`, `DEVELOPMENT_CHECKPOINT_2026-09-07.md`, `tests/smoke-test.js`; add upstream `meguru.js` and `tests/meguru-test.cjs`. Update `docs/qa/items-economy-2026-09-14.md` with truthful integration results. Modify behavioral tests only for a demonstrated integration gap. Controller owns the prepared PR-description document.

**Interfaces:** `installNaotocchiMeguru` must load before `script.js`; the item-memory and item-system modules must retain their original order and runtime binding. The runtime harness must retain all existing item/movie/Quick exports and add Meguru's `meguruMod`, `startMeguru`, `stopMeguru`, `meguruActive`, `meguruRun`, `isAuthorUnlocked`, `currentFormStageIndex`, `renderTravelRegionGrid` without losing existing fields. `meguruMod.createSimulation` remains renderer-independent; entering from travel and returning home must work. Existing travel region/GPS selection and item date/travel validation stay authoritative.

- [x] **Step 1: Inspect and merge the exact initial upstream.** Existing feature starts at published `93166a91e3aa9de57cc5d6b4be48c635f1d20d65`; all previous item/product reviews are complete, with 533/533 on the pre-Meguru integration. Read this task and relevant canonical constraints, not the whole historic plan. Check the named auto-merges and resolve the four conflicts by retaining both feature sets.

```sh
git merge --no-commit --no-ff 3780497b8a9fc7e72a651ba6206543e47314f89d
```

- [x] **Step 2: Resolve precise integration boundaries.** Add Meguru to both test loaders while preserving item bindings; retain every npm test file and add `tests/meguru-test.cjs`. Keep the reviewed partner-specific `ふたりの合言葉` test and single ring/reward memory semantics. Refresh cache references for the actual combined `script.js` and `style.css` if their contents differ; unchanged main assets retain valid upstream tokens. Do not redesign Meguru or item effects.

- [x] **Step 3: Run focused integration evidence and fix only demonstrated regressions.** Verify real Meguru entry/talk/exit, home visibility and return, sleeping rejection, secret gates, renderer isolation and persistence via the existing Meguru suite. Check that item notifications wait while its scene occupies home, and entering/talking/exiting is not a minigame reward or a new Star category. Use a focused runtime probe or regression test for that concrete cross-feature boundary if existing evidence does not answer it. For an actual bug, first capture a failing behavior and then implement the smallest correction; retain the failure and root cause. Preserve all existing item/Quick assertions.

```sh
node tests/smoke-test.js
node tests/dialogue-test.js
node --test tests/meguru-test.cjs tests/item-relations-travel-test.cjs tests/item-care-game-test.cjs tests/item-experiences-test.cjs tests/quick-mode-test.cjs tests/movie-test.cjs tests/audio-regression-test.cjs tests/asset-versions-test.cjs
```

- [x] **Step 4: Freeze the integrated source after focused verification.** A concrete current-main CI failure was found during execution and is handled by Task2 below. Commit this merge/fixes and record focused output, exact commit and self-review. The single final full gate is moved to Task2 after the required illustration compatibility fix; it is not waived or duplicated here. Expected recovery-test diagnostic stacks remain distinguishable from new failures.

```sh
git diff --cached --check
git diff --check
```

- [x] **Step 5: Commit QA evidence and report.** Add a chronological QA note with actual failures, focused count/command/commit and manual limitations; state that the final full gate follows Task2. Save the full report in this plan's ignored SDD workspace as `task-1-report.md`, including BASE/HEAD, exact conflict resolutions, changed scope, test commands/full outputs, probe results, self-review and limits. No forced addition of SDD files. Send final source-frozen status. Controller alone runs the unchanged nine-policy economy simulation once after Task2 and publishes; worker must not duplicate it.

### Task 2: Repair the demonstrated upstream illustration CI failure

**Evidence:** Current-main3780497 Home layout job104050374351 fails in `tests/all-display-browser.cjs:272` (called by `tests/home-layout-browser.cjs:280`). The real CI observer reports count0 for27 newly introduced source glyphs. Package install/browser setup succeeds. Its whole-root source inventory includes Meguru; `tests/illustration-catalog-test.cjs` only inventories index/script/games and therefore misses them. This is a concrete publication gate, not speculative visual redesign. Controller saved the text-log diagnosis in this plan workspace.

**Files:** Modify `ui-symbol-art.js`, `tests/illustration-catalog-test.cjs`, `index.html`, and QA chronology. Use existing catalog/normalization/HTML/Canvas APIs; touch `illustration-catalog.js` only if a necessary semantic alias cannot be represented by the existing shared art module. Do not edit browser assertions, skip glyphs, alter source text to evade the corpus, modify CI workflows, add raster dependencies or add a generic fallback for unknown symbols.

**Interfaces:** `NaotocchiUISymbolArt` contains normalized glyph keys and `[label,svgFragment]` definitions, using its existing `add`, path/shape helpers,24-unit grid and outlined warm palette. `displayCatalog.resolve()` and `.html()` serve real DOM and Canvas paths. Supply meaningful art for the intended object/animal/gesture, preserving stable save/source identifiers. Related gesture variants may deliberately share an appropriate picture; unrelated symbols must not all become one placeholder.

Missing corpus (27): `🛝 🪑 🛖 🚉 ⛲ 🛷 🧊 🌉 🪺 🏛️ 🚲 🍜 🧦 🐷 🐯 🐮 🥕 🖐️ 🤤 🔪 🙌 🐺 🍅 🌛 🤚 ❗ 🪶`.

- [x] **Step 1: RED in the ordinary Node gate.** Expand the first catalog test's source set to the same shipped root `.js/.css/.html` inventory as the existing CI sourceCorpus. Keep every original definition/asset/safe-SVG/frame assertion and unknown joined-glyph preservation test. No tests or documents are UI sources.

```js
const sources = fs.readdirSync('.', {withFileTypes:true})
  .filter(entry => entry.isFile() && /\.(?:js|css|html)$/.test(entry.name))
  .map(entry => entry.name).sort();
```

```sh
node --test tests/illustration-catalog-test.cjs
```

Expected RED: the previously omitted Meguru symbols are missing from the real catalog. Preserve actual output, which may contain variation-selector-normalized forms.

- [x] **Step 2: Repair shared definitions.** Add the27 meaningful vector illustrations through the existing shared art module. Reuse appropriate existing helpers/art only when semantics match; no generic dots or relabelled unrelated picture. Keep illustrations inside the24-unit grid, no text, embedded source emoji, script or event handlers in SVG. Refresh the actual changed ui-symbol-art cache hash. Do not change gameplay, money, supply, source glyph identities or browser audit expectations.

- [x] **Step 3: GREEN and final full gate.** Run the catalog, UI, display, Canvas and cache suites below; inspect definitions for representational/layout bounds, with no browser or image workaround. Self-review and commit all final code/test/cache edits before the one full npm run. Record exact tested commit and complete output; diagnose any failure, retaining first output. The existing CI will verify actual display boxes after publication.

```sh
node --test tests/illustration-catalog-test.cjs tests/ui-illustrations-test.cjs tests/display-illustrations-test.cjs tests/canvas-illustrations-test.cjs tests/asset-versions-test.cjs
env -u npm_config_http_proxy -u NPM_CONFIG_HTTP_PROXY npm test
git diff --check
```

- [x] **Step 4: QA, report and handoff.** Add factual CI diagnosis/RED/GREEN/full-gate results and manual limits to QA in a documentation-only follow-up commit. Write `task-2-report.md` with BASE/HEAD/tested commit, full outputs, all27 definitions and any aliases, changed scope and self-review. No external action or subagents. Controller reviews this scoped change, runs the unchanged nine-policy economy comparison once on completed code, then updates PR267 and observes existing CI. Workers must not execute browser scripts, change workflows or artificially weaken tests.

### Task 3: Preserve the newly merged Meguru layout update while completing PR267

**Evidence:** Publication preflight after Task2 found current main advanced to `14e0b2ae7045fca651d8fd1ac5b1c2d78f9fef4b` (PR269). The six upstream paths are checkpoint, README, index, Meguru module, CSS and its test. Read-only merge-tree identified three conflicts: checkpoint, index, Meguru test. This continues the user's merge-ready request; do not stop at the prior3780497 pin.

**Files:** Merge exact14e0b2a into existing feature. Resolve `DEVELOPMENT_CHECKPOINT_2026-09-07.md`, `index.html`, `tests/meguru-test.cjs`; preserve automatically merged README, `meguru.js`, `style.css`. Keep Task2 shared illustrations and complete Node corpus; add only newly demonstrated missing source glyph art if required. Update QA factual chronology. No economy, item catalog, script behavior, workflow or browser assertion changes unless a concrete integration defect is first demonstrated and reported to controller.

**Interfaces:** Upstream PR269 adds viewport sizing/resize cleanup, region backdrop/foreground data, entry residents, rendering priority and new party formation. Preserve these production behaviors. Existing ordinary-walk follow test from Task1 remains meaningful: update its expected slot geometry to PR269's actual contract (`side = partner ? -player.face : (i%2===0 ? 1 : -1)*(1+floor(i/2)*0.9)`, `x=player.x+side*gap`, `z=player.z+back+i*spacing`), retain the90-unit lag bound; do not return to teleport/2sec or merely raise distance-to-player. Retain actual notification deferral/15-second expiry and no-money/record/Star cross-feature test. Preserve original Quick home/cloudy/night/autumn,91/13 expectations. Retain old and new checkpoint sections.

- [x] **Step 1:** Inspect exact six-file upstream delta and run `git merge --no-commit --no-ff 14e0b2ae7045fca651d8fd1ac5b1c2d78f9fef4b`. Resolve three conflicts without whole-side replacement. Keep all loader entries; refresh actual combined style and new Meguru content hashes, retain Task2ui-art hash unless art changes.
- [x] **Step 2:** Run focused Meguru/catalog/cache/Quick/item travel and experience suites. Confirm actual entry/return, notification suppression, no money/game/Star award, walking formation, world/renderer isolation; use existing tests first. The widened catalog must cover every added PR269 glyph, with no exclusions/fallback. If new missing symbols are demonstrated, add meaningful shared vector definitions and preserve RED/GREEN. If an actual defect occurs, diagnose it before the smallest fix; keep all failure evidence. No product redesign and no local browser or image routes.
- [x] **Step 3:** Self-review and freeze final production/test/cache edits in a commit, then run ONE new full `env -u npm_config_http_proxy -u NPM_CONFIG_HTTP_PROXY npm test` gate on that exact commit. The earlier540/540 belongs to53b3651 and is retained, not mislabelled as this revision. Do not repeat full tests absent a diagnosed correction. Document output and code SHA; only QA-only changes follow.
- [x] **Step 4:** Report BASE/HEAD/testedSHA, conflict resolutions, focused/full commands and full outputs, actual changed scope, source glyph additions if any, and self-review in `task-3-report.md`. No push/PR/main/deploy/subagents. Controller reviews only this integration delta then publishes. The nine-policy economy comparison already ran once afterTask2 and exactly matchesTask9; because this upstream delta contains no item/economy/script changes, preserve that accurately labelled evidence unless a concrete new economy interaction requires rerun.

### Completion by controller

Use one task-scoped integration review; prior broad item review is already complete. Resolve findings through the original worker and a scoped re-review. Inspect any later main changes if they prevent the user's requested merge-ready result; the previous PR266 pin is no longer a reason to stop. Publish the exact verified tree to the same feature branch without force, update the existing PR267 and its QA links, check existing CI on its current revision, remove Draft status and verify `mergeable: true`. No merge or deployment. Disclose actual manual visual/listening limitations without claiming runtime or CI covers listening.

Execution note: All three local tasks and their scoped reviews are complete. Current product/test/cache gate is540/540 onfbd3068. Task2 bounds follow-up was covered by focused41/41 and the finalTask3 fullgate after the necessaryPR269 integration; the earlier53b3651 gate remains historical. Controller owns remaining PRpublication, automaticCI observation andReady verification.
