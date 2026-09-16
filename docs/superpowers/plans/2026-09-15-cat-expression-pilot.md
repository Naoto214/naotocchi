# Cat Expression Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adult cat visibly changes face with current distress and actual care results, safely testable in an isolated preview session.
**Architecture:** DOM-free expression mapping consumes phase-one emotion profiles. script.js owns transient face reaction timing and selects an optional main-pet portrait. Three art assets and a preview-only disposable session complete the pilot.
**Tech Stack:** Vanilla UMD JavaScript, existing runtime harness/Node tests, PNG, static Sites hosting.
**Spec:** docs/superpowers/specs/2026-09-15-cat-expression-pilot-design.md

## Global Constraints
- Pilot only assets/characters/cat/06.png. Original PNGs untouched. Three individually generated variants at assets/characters/expressions/cat/06-happy.png, 06-strained.png, 06-sulky.png; transparent 128×128. No sheet slicing.
- No gameplay, threshold, death, recovery, romance, save-schema or companion-layout changes. care-status.js remains threshold authority. No new buttons or automatic care.
- temporary expression > persistent expression > normal; critical overrides happiness. Sleeping uses original face. After expiry always latest state. No saved expression fields.
- Main home portrait only; preserve original art layout metrics, pet/accessory motion, existing static alerts/sweat/! and social portraits. Reduced-motion permits static face swaps, not new animation.
- User approved implementation. Root owns art generation, GitHub publication and Sites; workers do not push, deploy or spawn agents. iPhone visual acceptance remains unconfirmed.

### Task 1: Expression resolver and runtime coordination
**Files:** Create pet-expression.js, tests/pet-expression-test.cjs, tests/pet-expression-integration-test.cjs. Modify script.js, index.html, package.json, tests/helpers/runtime-harness.cjs. Do not change artwork or docs owned by root.
**Interfaces:** UMD window.NaotocchiPetExpression / CommonJS exports resolve(emotion, options), assetFor(baseAsset, expression), reactionFor(event). Options {sleeping=false,reaction=null}; returns string normal/happy/strained/sulky. assetFor returns base URL or exact variant URL. reactionFor maps the events in spec, other events null. Runtime has one transient record/timer only; no new global test API outside existing harness pattern.
- [ ] Write failing resolver cases and run node --test tests/pet-expression-test.cjs; capture RED.
```js
assert.equal(expression.resolve({state:'hungry',severity:'mild'}),'strained');
assert.equal(expression.resolve({state:'weak',severity:'critical'},{reaction:'happy'}),'strained');
assert.equal(expression.resolve({state:'unhappy'},{reaction:'happy'}),'happy');
assert.equal(expression.resolve({state:'unhappy'},{sleeping:true,reaction:'happy'}),'normal');
assert.equal(expression.assetFor('assets/characters/cat/06.png','happy'),'assets/characters/expressions/cat/06-happy.png');
assert.equal(expression.assetFor('assets/characters/cat/05.png','happy'),'assets/characters/cat/05.png');
```
- [ ] Implement pure frozen API with no numeric care thresholds; unknown values return safe normal/base fallbacks. Add all mapping/immutability cases, confirm GREEN.
- [ ] Add real-runtime RED cases, based on existing emotion-integration fixtures. Set speciesLine cat and ageTicks selecting stage index5 via actual stageForAge. Exercise real feed/play/medicine handlers and timer advance; assert literal portrait URLs/datasets, not just internal flags. Capture failures before runtime edits.
- [ ] Add module script tag after emotion-state.js, register in harness and npm test. Use currentCareSignals/deriveHomeEmotion; integrate into renderPetVisual with visual key including selected expression asset, without moving main motion wrapper or changing base-art bounds. Failed expression URLs must fall back to the original PNG before existing original-image error handling.
- [ ] Connect pet-only semantic speech reaction via reaction.event in setSpeechBubble; normal care speech lasts SPEECH_DURATION_MS. At validated scheduleCareAfterglow callback start happy face for motion duration or 1000ms in reduced-motion; no new animation. Do not show happiness on wrong medicine/spam/blocked feed. Expiry calls pet visual rendering against fresh state; clear stale expression across newer care/life/form/blocked visibility, sleeping and critical. Ensure a new render during reaction does not reset its deadline.
- [ ] Cover all spec lifecycle/error/save/26-companion invariants using actual runtime outcomes. For any harness missing capability, make only a faithful small extension. Asset files are supplied independently by root; do not fabricate substitute assets.
- [ ] Run node --test tests/pet-expression-test.cjs tests/pet-expression-integration-test.cjs tests/emotion-state-test.cjs tests/emotion-integration-test.cjs tests/care-status-integration-test.cjs tests/cast-motion-test.cjs tests/time-pause-test.cjs; git diff --check. Commit only owned files after GREEN. Report RED/GREEN evidence and concerns.

### Task 2: Asset validation and disposable preview handoff
**Files:** Root supplies the three PNGs. Create tests/pet-expression-assets-test.cjs, tools/cat-expression-preview.cjs, tests/cat-expression-preview-test.cjs, docs/qa/cat-expression-pilot-20260915.md. Modify package.json and index.html via npm run bump. May amend Task1 code only for demonstrated failing integration issue after telling root.
**Interfaces:** tool exports buildPreview({preset='hungry'}={}) returning complete HTML and can write CLI output when invoked with an output path and preset. It reads current index.html and uses runtime-harness freshState to construct an adult-cat save; prepend a script defining a fresh Map-backed localStorage adapter with getItem/setItem/removeItem/clear/key/length, before any game scripts. Seed only the in-memory naotocchi-save-v1 key. Script is escaped against closing script tags. Base href points to ./ so assets resolve from root when served as cat-expression-check.html. The page is independent from normal index.html; normal game never imports this tool. Presets normal,hungry,sick,tired,sulky,critical are selected by a strict allowlist from URL query; links reload disposable state. Visible banner says 猫の表情テスト / このページでは保存しません. Ordinary game care buttons operate unchanged.
- [ ] Read root-supplied image paths and inspect actual image files; add asset tests for PNG signature/IHDR128×128/alpha, three different files, original PNG hash unchanged, runtime allowlist paths exist. Built-in zlib or existing PNG validator can inspect alpha. No placeholder or missing-image bypass.
- [ ] Write failing preview test before tool: require module, assert generated HTML contains the original game loaders, cat adult fixture, memory storage setup preceding script.js, allowlisted presets, and no normal storage read. Test adapter in vm by extracting its script and simulating writes, confirming external storage sentinel unchanged. Capture RED.
- [ ] Implement the preview tool to satisfy that contract; keep all test seeding out of script.js and normal index.html. Use exact fresh-state shape and current age-stage APIs rather than inventing a save. Default preset hungry so feeding tests relief, then full state reevaluation.
- [ ] Run node --test tests/pet-expression-assets-test.cjs tests/cat-expression-preview-test.cjs and the Task1 focused suite; npm run bump; npm test; git diff --check.
- [ ] Write QA document with automatic results, source/variant hashes and image normalization notes provided by root, unsupported-form fallback, and iPhone rows all 未確認: normal vs three expressions; hunger feed sequence; play/spam; correct/wrong medicine; latest-state return; critical; reduce; 26-companion layout; disposable preview isolation.
- [ ] Commit owned files and supplied image files after GREEN. Report result. Root performs reviews, publishes separate Draft PR and regenerates/deploys confirmation Site including tool output.

## Approved continuation — adult dog, 2026-09-16

Starting PR HEAD: 4587266d2906f27a9b70249fec8997af7442ee70. Main: 3f4bfda0b8c0d30098ebb68c4313abd370a8576a. Existing worktree has the same tree as the PR HEAD. Baseline: 718 tests passed.

- [x] Verify latest GitHub PR/main/CI and preserve all cat changes.
- [x] Write failing tests for dog-only routing, ten runtime states/reactions, asset constraints, disposable preview and achievement interruption.
- [x] Add only dog/06 allowlist, head-relative outlined accents and species-appropriate yellow food bowl; reuse existing resolver and reactions.
- [x] Generate and inspect ten independent transparent dog portraits; normalize to original 128×128 canvas and bounds.
- [x] Add adult dog to disposable preview and synchronize URL-selected form with dropdown (review regression).
- [x] Run complete test suite, asset checks and diff check; document QA.
- [ ] Push verified changes to existing Draft PR #278 and update existing private confirmation page. No main merge. User performs iPhone visual review.

## Puppy continuation — 2026-09-16

Adult dog approved by user. Baseline PR HEAD bef2655c40eb06948ece22af5a5f83208cb35146. Same staged workflow for dog/03 only: failing connection/asset/preview tests → ten individual image edits → dog/03 allowlist and anchors → disposable puppy selector → full validation → existing Draft PR and private preview update. No other dog stage, gameplay or saved-state change. iPhone acceptance remains with user.

## Playful young dog continuation — 2026-09-16

Start PR HEAD 436cc627a2c4b589de1cab0d1de7f213bd77765f. Add only dog/04 after puppy approval: failing routing/runtime/PNG/preview tests → ten individual original-referenced image edits → allowlist and head anchors → preview selector → full regression → Draft PR and existing private preview. No game values or saved-state changes. Keep other stages' confirmed visuals.

## Young dog continuation — 2026-09-16

Start PR HEAD 9210c2150c734fc53ad35eb8c26fb5c64b40e5f6. Prior 731 tests and both GitHub Actions checks pass, including repaired painted-bounds probes. User approved dog04 and requested next stage. Scope dog05 only: failing connection/PNG/preview tests → ten original-referenced individual expressions → routing and anchors → youngDog preview → full tests/review → existing Draft PR/private preview. Root supplies images/docs/publication; bounded worker supplies connection/tests. No other stage expansion or main merge.

## Calm dog continuation — 2026-09-16

Baseline PR HEAD107dc0f26d210dadba2a601b11a8ab277be616cc, young dog orange position approved. Dog07 only: failing routing/runtime/PNG/preview coverage → ten original-referenced individual expressions → allowlist/anchors/preview → focused/full verification/review → existing Draft PR and private preview. Root owns art/docs/publication, bounded worker connection/tests. No other-stage expansion, gameplay/save-schema change or main merge.

## Remaining dog batch — 2026-09-16

Baseline bfcb09d582619c6e513f55e61683baebd58c92fb;743 tests previously passed. User approved batching01/02/08. Follow tests-first routing/runtime/PNG/preview and startup-achievement coverage;30 individual original-referenced images; stage anchors; full suite/review; update same Draft PR and private preview. Replace unsupported dog fallback fixtures with genuinely unsupported beetle stage. Root owns art/docs/publication, bounded worker connections/tests. Review all three together after completion. No main merge.

## Cat/dog visual review — 2026-09-16

Baseline d4dc384f01c0e2b4f25c0681b07425252bffe2e4, both CI checks successful; main remains3f4bfda0b8c0d30098ebb68c4313abd370a8576a. User authorized agent-side adjustment across all160 portraits.
- [x] Render and visually inspect every stage/state with production PNG/SVG/CSS and painted-floor offset.
- [x] Adjust crowded marks per state, preserve all32 silver/orange anchors and all portraits, then inspect all160 again.
- [x] Prepare16 stage sheets and four cross-stage overviews, labeled with static-render limitations.
- [x] Complete regression checks:756 passed, no failures.
- [x] Save four overviews and ZIP of all stage sheets.
- [ ] Save to existing Draft PR and update private confirmation page.
