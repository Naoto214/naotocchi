# Growth-chain prototype implementation plan

> Execute inline with superpowers:executing-plans; user authorized implementation and continuous verification on 2026-10-12. Only Human QA decisions require a final question.

Goal: independent playable rule laboratory with deterministic experiments.
Architecture: ES modules shared by browser and Node; no production imports or save access.
Tech: vanilla JavaScript, node:test, static HTML/CSS.
Spec: ../specs/2026-10-12-growth-chain-prototype-design.md (approved).

## Global constraints
- Keep PR #380 Draft. No main merge or production deployment.
- Only add prototypes/growth-chain/ and this plan; retain approved spec.
- Every candidate configuration is experimental, not a canonical game ruling.
- Record full configs, seeds, policies, denominators, censoring and limitations.

## Review focus
- Hidden rows / overflow may not silently discard pieces (session tests).
- Overlapping candidates cannot consume a cell twice (engine tests).
- Item previews must not consume RNG/resources or alter live state (session tests).
- Strategy cannot inspect future unseen bag contents (policy tests).
- Import/reset must invalidate pending animation (UI browser tests).

## Task 1: deterministic engine
Files: rules.mjs, random.mjs, engine.mjs, tests/engine.test.mjs.
Produces: configuration(), createBag(), draw(), board(), resolve(board,rules,context).
- [ ] Write tests for 2..5, 6+, same/different species, simultaneous waves, gravity, anchor variants, deterministic competition, overflow scores and eggs.
- [ ] Run node --test prototypes/growth-chain/tests/engine.test.mjs; observe missing-feature RED.
- [ ] Implement immutable resolution snapshots with candidate traces and resource deltas.
- [ ] Run tests; expected all pass. Commit and save remotely.

## Task 2: session and policies
Files: session.mjs, policy.mjs, tests/session.test.mjs, tests/policy.test.mjs.
Consumes: engine resolver and bag. Produces: createSession(), placements(), applyAction(), preview(), replay(), chooseAction().
- [ ] Write failing tests for BFS reachable landing paths, rotations, overflow, NEXT3, item costs, bulk simultaneous mutation, seed replay, public-information policy.
- [ ] Run tests RED; implement session transitions and fixed strategy.
- [ ] Run complete prototype suite GREEN; commit and save.

## Task 3: independent UI
Files: index.html, style.css, ui.mjs, fixtures.mjs, browser tests.
Consumes the same session transitions; no duplicate game rules.
- [ ] Write browser smoke / reset / input / preview / replay tests and observe RED.
- [ ] Add touch/keyboard play, auto-drop, pause, wave playback, JSON editor/export, fixture buttons, rule controls.
- [ ] Verify desktop/mobile layouts and tests; commit and save.

## Task 4: experiments and final review
Files: experiments.mjs, search.mjs, experiment config, results/, README.md, REPORT.md.
- [ ] Write tests for statistics/denominators, replay hashes, strategic versus random, fixed experiment matrix.
- [ ] Implement paired-seed matrix and one-variable sensitivity tests, natural item economy and separate endowed positions.
- [ ] Execute baseline 200 seeds x 500 drops x six boards x two policies; report any resource-limited deviations explicitly.
- [ ] Search/save exact 3/5-chain witnesses and full legal histories where found, replay independently.
- [ ] Fresh-context whole-branch review, address important defects with RED/GREEN tests.
- [ ] Run prototype suite and attempt existing npm test; distinguish environment/asset limits.
- [ ] Verify protected paths unchanged, save, verify remote HEAD/tree, keep Draft; report Human QA only at end.
