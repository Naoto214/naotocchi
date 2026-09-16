# Items V2 Economy Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the approved item chapter, including Quick, daily rewards, obsolete coin sources and reward-free legend encounters.

**Architecture:** Keep the existing runtime and session guards. Split Quick settlement from ordinary care/recruitment settlement, make daily completion a once-per-local-date inventory grant, and remove retired rewards at their event sources while preserving events and records. Do not reimplement completed catalog, inventory migration, equipment or consumables.

**Tech Stack:** Browser JavaScript, node:test runtime harness, Playwright Chromium/WebKit, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-16-items-v2-decision-log.md` (authoritative); focused Quick, daily and legend specs are supporting detail only. Prior implementation audit is historical, not proof of present code.

## Global Constraints

- PR #274 remains Draft and unmerged; no force push. Checkpoint to GitHub at tested boundaries.
- User explicitly authorized Quick/daily and then all remaining approved item-chapter work. Do not invent products, rewards, prices, modes or new balances.
- Ordinary games: failure0 / success30 / great60; Star multiplies ordinary game coins only by3.
- Quick: mixed20/20 only100 coins; incomplete/quit/solo0; no energy or other care/relationship/growth/decline changes; records and achievements preserved. No daily limit on legitimate new completed Quick runs is specified, so do not add one.
- Daily: real success in the day's designated game, once per local date, Lucky Coin1 only. No streak/direct coins/growth boost/random sticker reward. Gamepass excluded.
- Allowed ordinary coin sources: ordinary games (including approved gamepass success), mixed Quick20/20, duel, immediate Lucky roulette. Migration refunds remain compensation, not earnings.
- Legend: random condition encounter, once per life, unseen preference, regional weights; no coins/care rewards; preserve movie/discovery/life record.
- Preserve established save data, claimed daily dates, balances, inventory, migrations, and four approved PNG blobs. No retroactive clawback, double grants, refunds or consumption.
- Tests RED before production edit; focused -> full -> actual browser -> final review -> latest CI. Known Quick solver flake must be separated by same-condition baseline evidence, not hidden by weakened assertions.
- Existing isolated worktree `/workspace/scratch/949941642af1/items-v2-work` on `work/items-v2-completion-20260917`; base local30df0ae / publishedb3faed9 share tree6ad809d46b2f3ca9cad882d0103b978afc8b4670. Baseline latest CI760/760, Chromium81/WebKit81 success.

### Task 1: Quick and daily settlement

**Files:** Modify `script.js`, `index.html`, `tests/helpers/runtime-harness.cjs`, `tests/quick-mode-test.cjs`, `tests/economy-test.cjs`, `tests/item-inventory-test.cjs`, `package.json`; create `tests/quick-daily-economy-v2-test.cjs`.

**Interfaces:** Existing `startQuickRun(gameId?)`, `tryStartPlay(chosenGame)`, `startMinigame(game,opts)`, `finishMinigame(score,customMessage)`, `retireMinigame()`, `dailyChallengeGame()`, `dailyChallengeToday()`, `ITEM_SYSTEM.grant(state,'c_coin2')`. Preserve callbacks/session invalidation, Quick stats and generic played/best records. Task2 uses unchanged ordinary result payment, Task3 exercises public UI/save.

- [x] Write and run RED behavior tests. Quick mixed scores0/30/95/100 =>0/0/0/100, solo100=>0, equipmentStar and environment do not multiply; every direct care field stays identical after start/finish/quit. Test lowenergy start, S-rank no boost/sticker, no recruitment or story care side effects; repeated finish and stale delayed callback do not pay twice; second legitimate perfect run can pay again. Preserve records, actual Quick completion callback and dedicated achievements. Update old energy/growth/coin assertions, keeping solver/input coverage intact.

```js
const before = JSON.parse(JSON.stringify(s));
h.api.startQuickRun(); h.api.finishMinigame(100);
assert.equal(s.lifetime.money-before.lifetime.money,100);
assert.equal(s.energy,before.energy);
assert.equal(s.sodachi,before.sodachi);
assert.equal(s.transformMeter,before.transformMeter);
h.api.finishMinigame(100);
assert.equal(s.lifetime.money-before.lifetime.money,100);
```

- [x] Daily RED: actual designated game success30 and great70/S100 grant one c_coin2, failure29/quit/wrong game/Quick/gamepass grant none. Repeat same date, JSON reload, next-life/infinite continuity and old claimed date cannot grant twice; next date success grants exactly one anew. Daily direct money equals ONLY ordinary game30/60 (Star90/180), no separate coin/boost/sticker. Existing boosts and old claimed record survive loading. Old streak fields may remain inert, with no streak UI. Expose existing functions in test harness only as needed; do not add production test APIs.

```js
const game=h.api.dailyChallengeGame();
h.api.startMinigame(game,{intro:false}); h.api.finishMinigame(30);
assert.equal(h.api.itemStock('c_coin2'),1);
assert.equal(s.lifetime.money-beforeMoney,30);
```

- [x] Implement separate Quick result branch before ordinary care side effects. Retain score/runs/play records and achievement processing without `checkMeters`/story/recruitment/growth rewards. Exempt Quick from energy gate/cost and care streak resets, retaining dead/egg/UI/sleep rules unless an explicit spec requires otherwise. Use existing one-result session guard.

```js
if (game.id === 'quick-run' || game.id === 'quick-solo') {
  // Save actual result/records and fixed payout, close session, render; return
  // before ordinary growth, relationships, S-rank bonus and daily settlement.
}
```

- [x] Replace daily reward code and copy. Validate current local date + today's designated game ID + raw success threshold + unclaimed date at settlement, regardless of launch entry. New daily achievement grants only Lucky1; game itself retains normal30/60 and care result. Daily S rank must not leak the removed growth/sticker bonus. Remove unused daily reward helper/constants and stale harness exports. Preserve already active shared boostTicks rather than deleting indistinguishable legitimate boosts again. After first daily award, subsequent ordinary plays keep ordinary rules.
- [x] Run focused new test, Quick, economy, inventory, gamepass/care and session-lifecycle tests. `node tools/bump-versions.js`, asset-version test and `git diff --check`. Record exact RED/GREEN evidence, self-review, commit explicit files and report. No full/browser yet.

### Task 2: Retired earning paths and legend rewards

**Files:** Modify `script.js`, `index.html`, relevant `tests/movie-test.cjs`, `tests/midlife-test.cjs`, `tests/sticker-test.cjs`, `tests/offline-test.cjs`, `tests/item-collections-economy-test.cjs`, runtime harness and package list; create `tests/item-economy-sources-v2-test.cjs`.

**Interfaces:** `onStageChanged`, `onBirthday`, `maybeMidlifeEvent`, `onSodachiMilestone`, `scheduleEnvironmentMoment`, `checkStickerTasks`, `applyOfflineProgress`, `triggerLegendEncounter`, `playLegendEncounterMovie`. Keep event gates and one-time markers, movie/record APIs, noncoin rewards outside legend.

- [x] RED with actual event paths: birthday/stage/midlife/sodachi/environment/sticker/offline cannot increase money from an explicit initial balance. Assert their event/record/noncoin effects still happen. Check repeated events and valid old claimed saves. Preserve milestone egg grants and perks unrelated to money.

```js
const money=s.lifetime.money;
h.api.onSodachiMilestone(90);
assert.equal(s.lifetime.money,money);
assert.equal(h.api.itemStock('c_egg_rare'),beforeRareEggs+1);
```

- [x] Legend RED: trigger eligible encounter, assert money/happiness/growth/decline/death/energy unchanged, one discovery + life log + movie present; repeat cannot create second encounter this life. Preserve unseen priority/regional weighting and all legend types, not just one fixture. Movie must contain no removed payout beat.
- [x] Remove obsolete coin mutations and their amount fields/constants/copy from sources above. Remove unused additive coin multipliers/copy only if no allowed reward relies on them; do not alter prices, ordinary30/60, Star3x, roulette, duel settlement or refunds. Environment callback must not retain a latent money field payment path. Keep offline elapsed processing, recovery, memories and noncoin items.
- [x] Remove legend's four game rewards and coin argument/footer/beat; preserve actual movie, discovery and life records, random encounter rules. No legend ticket reintroduction. Update old tests to final expectations without dropping unrelated assertions.
- [x] Focused new test plus each touched event/movie/offline/sticker/migration regression, cache hashes, diff check. Record RED/GREEN and commit. Send exact before/after code paths and retained effects in report.

### Task 3: Whole item-chapter verification and documentation

**Files:** Create `tests/item-economy-v2-browser.cjs`; modify `tests/home-layout-browser.cjs`, relevant stale browser/QA fixtures, `NAOTOCCHI_MASTER_SPEC.md`, `README.md` if stale, and this plan. Preserve historical docs while adding clear current status/links. Create `docs/superpowers/plans/2026-09-16-items-v2-economy-verification.md`.

**Interfaces:** Existing Playwright module `(browser,engine,fixtures,baseURL,output)`; public UI and saved `naotocchi-save-v1`. No production debug hooks. Existing catalog and migration tests protect completed Tasks1–6.

- [x] Add browser behavior checks at320/390 for revised Quick/daily labels, real Quick entry/quit with unchanged care, real designated daily game success and one Lucky grant, duplicate reload/old claim, daily failure not claiming. Use deterministic clock/inputs and production game logic; do not replace payout handlers. Exercise successful mixed20/20 in runtime via real Quick callbacks if a browser full random run is impractical. Connect new module to both CI engines and retain existing layout coverage.
- [x] Run all affected focused tests -> `npm test` -> actual localChromium modules -> inspect screenshots. Diagnose failures before fixes, separate baseline Quick random solver instability. No optional repeated green suites.
- [x] Verify authoritative spec§1–10 coverage matrix (including existing inventory migration/idempotence and gamepass exclusions), approvedPNG4 hashes unchanged; classify Naoto-series as separate achievements outside 판매22 and do not invent unapproved new effects. Fix concrete gaps via RED and scoped review.
- [x] Update master/current docs to final implemented scope, remove current-page stale reward descriptions; historical specs stay historical. Record counts, commands, changed files, baseline/commitSHAs and decisions. Task3 individual review PASS/Approved; durable handoff complete.
- [ ] Full whole-change review after task reviews, one bounded final fix wave if needed.
- [ ] Save reviewed code to requested PR branch fast-forward, update PR body with complete scope, latest Runtime/HomeCI links; keepDraft/unmerged. After docs-only verification record commit, check latestHEAD CI too. Confirm main unchanged and recovery checkpoint is accessible. Final report must distinguish any actual unresolved item from out-of-scope new design.

Tasks1／2／3は個別レビューPASS。ローカル実装・監査・文書更新・判断台帳・再現コマンドは[検証記録](2026-09-16-items-v2-economy-verification.md)を参照。残るチェックはrootによる全体レビュー・PR反映・最新HEAD CI確認であり、個別タスクの再実装を意味しない。
