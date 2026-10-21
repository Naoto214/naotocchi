# CPU stage 4 + released CARD GAME integration

2026-10-21. Owner authorized integration, targeted tests, independent Draft PR and owner-private trial. No main merge or production Pages deployment.

## Sources and merge strategy

- Released main: c3a72aa0e66164b5a27a30faa58d9c74fa7127f4 (tree 0ac1831d461f2984a0ed55a4afd9a7afdb3b8115), includes PR403.
- PR409: 7157b934068c0b4a723c5feaafbe511000a871f3.
- Dependencies: #404 143f7092 → #406 dda7c9db → #407 25c15199 → #409 7157b934.
- Three-way integration using shared base db9ea8e8. app.mjs, index.html and style.css required combining released menus/learning hooks with CPU deck controls; remaining changes merged cleanly.
- CPU policy, observation, session and all seven deck lists retained exactly from PR409. No new tuning or large match campaigns.
- All four upstream balance-verification directories are retained as their exact Git tree objects, with main and PR409 as commit parents. Prior 9,094 matches and tuning/ablation reports remain upstream evidence, not newly rerun results.
- Existing 452 card definitions, rules/effects/engine, art and fixed400 evidence unchanged. Released learning/rulebook/tutorial files unchanged. Main card signatures, rarity marker and alignment retained.

## Integration details

- Menu switches, human seat changes and tutorial-to-CPU route refresh deck controls together.
- Switching to My Deck also refreshes explanatory copy (new DOM test reproduced stale copy before fix).
- Strategy choices validate only the human My Deck; CPU uses chosen strategy list. Hotseat and My Deck mode validate both seats.
- CPU label is absent during play and rendered at results; save restore validates label against actual 40 cards. Old saves without a label remain accepted.
- Draft-only runtime allowlist adds cpu-decks.mjs and refreshed changed-source hashes. No Actions dispatch, Pages settings change or production deployment.

## Verification

- Card suite: 394 total, 392 PASS, 2 existing failures: FUN_ITEMS deterministic catalog audit; adopted-color-design broad CSS search (also fails on pre-integration PR403 source). Neither is hidden or reclassified as passing.
- New CPU integration DOM: 14 starts across seven decks/two difficulties; fixed repeat; three independent auto seeds; human B; My Deck coexistence; restore; hidden deck name; menu mode switching; learning coexistence PASS.
- Existing DOM checks: menu, learning all nine steps, tutorial shared board/18 slots, My Deck CPU, My Deck hotseat, collection PASS.
- Existing CPU variety tests cover complete match result label, invalid save label rejection, old format, own modifiers, opponent hidden-information invariance.
- Chromium preview: 390px iframe, strategy selection and match start; horizontal scrollWidth equals clientWidth (375px menu after scrollbar, 390px match). Card images loaded. Browser logs showed extension metadata errors only, not application errors.
- Independent review: no important runtime findings. Packaging missing-module/stale-digest finding addressed in allowlist.
- No broad main-game/3D suite or large simulation repeated: unchanged areas outside targeted integration.

## Trial and remaining checks

Owner-private trial: https://naotocchi-cpu-stage4-20261021.kerzion214.chatgpt.site/
Deployment is recorded by the final PR/report once native publication succeeds.
The new origin has separate browser storage. Use the existing JSON export/import to carry My Decks or match saves across URLs.

Real iPhone Safari remains owner QA: start beginner/intermediate, choose all seven strategies, auto across matches (repeats are allowed), fixed retains previous strategy but shuffles cards, My Decks, app-switch/save restore, portrait/landscape, Safari bar and safe-area interactions, rulebook/tutorial and result deck name.
Upstream limitations remain: moderate difficulty separation, high challenge-declarer win rate, initial-hand sensitivity. No balancing claims beyond PR409 evidence.
