# PR #403 handoff revalidation — 2026-10-20 22:00 JST

## Outcome

The requested implementation was already present at the supplied latest HEAD. No product code, rules, card definitions, CPU policy, or deployment changes were necessary. This commit adds only this revalidation record. The existing owner-private version 2 is the matching completed trial; it was not redeployed unnecessarily.

## Starting GitHub state

- PR #403: open, Draft, unmerged; branch `feat/card-rulebook-tutorial-20261020`.
- HEAD: `b2409f4373216e5c0f360d33a921c2001fcc3fdd`.
- tree: `d2cabe6fc6b0b7c78d85fd2e7a71034716f735eb`.
- remote main/base: `db9ea8e8d86c632a68ed8ab4880968803f78a243`.
- Existing implementation, audit, screenshots, publication record and runtime integrity record were reused.

## Fresh checks

- Focused unit command: `node --test prototypes/card-game/tests/learning.test.mjs prototypes/card-game/tests/rulebook-current.test.mjs prototypes/card-game/tests/tutorial-match.test.mjs`: 11 passed, 0 failed.
- `learning.dom.mjs`: PASS, including 15 chapters, search, all nine lessons via card taps, resume/restart/skip, ordinary match/deck save isolation and beginner CPU preparation.
- `tutorial-board.dom.mjs`: PASS, production two-sided board/18 slots, card detail, hand controls, wrong-card inspection, CPU lifecycle, reverse chain, save isolation.
- `menu.dom.mjs`: PASS, six routes, start/restore and save isolation.
- `collection.dom.mjs`: PASS, nine pockets, filter/page restore, flip, egg exclusion, favorites, shared deck addition/limits, swipe suppression and save preservation.
- `my-decks.dom.mjs`: PASS for both CPU and hotseat modes, 452 cards, create/rename/clone/delete, filters/copy limits, stable catalog/scroll, start/restore and handoff privacy.
- JSDOM commands use the existing `JSDOM_PATH=/tmp/collection-dom/node_modules/jsdom`. Initial missing-module failures from other default/runtime paths were environment configuration only and resolved without modifying tests.
- `git diff --check HEAD`: clean.
- Engine, normal CPU policy, full catalog and Pages allowlist show no PR diff against main.
- Source version `51ab968953cce7a310172597de7b70fea63e5bdd` was reopened from Sites. Every one of its 959 source/asset files was compared by Git blob hash against PR HEAD: zero mismatches. Root redirect is the separately recorded 960th runtime file.

## Formal rule cross-check

`docs/card-game/01-core-rules.md` sections なかま / こいびと and `engine.mjs` agree: companions and partners share one normal person placement per own turn, base time 0. Companion slots maximum 3, partner slot maximum 1. A new companion may replace an existing one only as the normal full-field placement procedure. The engine uses shared `personUsed`; relationship progression uses separate `relationshipUsed`, normally once per own turn for time 1. Relationship 0→1→2→3→marriage; marriage grants base growth +10. Existing source audit found no card effect granting an extra person deployment; おともだちチケット searches into hand. No unverified generic exemption is taught.

Both explanation levels preserve 15 chapters and 79 current detailed rulings. All 452 normal cards are available from the start; collection 453 includes the deck-excluded egg. Historical discovery/unlock policy remains in source history, not in the current displayed/searchable rules. See `rulebook-current-audit.md` for provenance and coverage. No substantive formal-rule/engine contradiction identified in this scope.

## Current visual verification

Managed Chromium opened the exact saved Site source through the supported local preview. Main menu title and six routes render correctly. Real pointer interaction completed STEP 3 through the production card-detail action: time 1→0, turtle main present, own egg hidden, completion message visible. Collection cover title and caption have computed transparent backgrounds and no background images; original gold botanical emblem, frame, spine and green cover remain visible.

The earlier saved responsive screenshots/measurements remain applicable because runtime source is byte-identical: portrait 390×844, landscape 844×390, narrow 320×568 and height change 390×700→844. These are Chromium checks, not iPhone Safari hardware tests. This handoff did not repeat the entire browser matrix or full card suite.

## CI and remaining gates

Latest implementation HEAD workflow runs:
- Runtime smoke test 39387203512: success.
- Home layout 39387203454: success.
- World visual quality 39387203481: success.
- Pages runtime package 39387203527: failure; build job 118509780423 reports unpublished references to learning-ui.mjs, rulebook-content.mjs and learning.css. Deploy skipped. The 11 package guard tests passed.
- This is the known publication dependency/allowlist gate. The allowlist was intentionally not changed. It must be reviewed before a later authorized main/Pages release.
- Previous full card result remains 369/370, with known FUN_ITEMS regeneration-audit failure; no canonical data/hash adjustment and no repeat of the fixed 400 matches.
- Previous repository-wide npm test was interrupted in unrelated World stress work; no whole-repository pass claim.

Owner iPhone QA remains: portrait/landscape, Safari bars and keyboard/safe area, touch reachability, app switching/resume, reduced motion, and subjective tutorial clarity. No main merge, ready-for-review conversion, production Pages publication, other CPU branch edit, or normal-save schema change.

## Publication

- URL: https://naotocchi-learn-20261020.kerzion214.chatgpt.site
- Project: `appgprj_6ad6fa1914c88191aa80d1bf654d9cb9`.
- Saved version 2: `appgprj_6ad6fa1914c88191aa80d1bf654d9cb9~appgver_8a35902806d48191ba1e9fd17d7be219`.
- Deployment: `appgdep_6ad718c294d48191991efa89a66883ae`.
- Native status rechecked: succeeded, owner-only audience preserved.
