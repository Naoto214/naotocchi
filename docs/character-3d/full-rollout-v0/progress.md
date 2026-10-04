# Full Rollout v0 progress ledger

Plan: docs/character-3d/full-rollout-v0/plan.md. Spec: design.md. Execute inline; normal work is authorized without repeated confirmation.

## FR-0
- Fresh Pilot remote d12ad70550b29c125f44ac2b32d7195905fb15f0; main 0b0a6b30e8e098472b2fa965604f4901874942e3. #372 open/Draft/unmerged; retain it.
- New branch feat/character-3d-full-rollout-v0, stacked Draft PR against Pilot for reviewable delta. No main or other feature merge.
- Fresh master: 31 lines, 248 stages, 26 companions, 18 partners, 1 author = 293 active designs.
- Assets: 2869 PNGs; 2572 expression/relationship variants protected; 3 Home-startup egg states + retired kinoko PNG supplemental. No missing/unclassified PNG.
- Ruling: retired assets and Home-only startup states stay in supplemental inventory, not active Meguru coverage; reviving them would change existing gameplay/Home scope. Original kinoko is not silently reassigned to clock.
- Baseline dedicated 54 PASS. Inventory tests RED for absent auditor; then 3 PASS. First audit caught kinoko as unclassified; corrected the mistaken koala-asset assumption using master compatibility and filesystem.
- FR-0 code only audits; no new 3D coverage yet. Active exact templates remain 28 (26 Pilot stages + 2 companions).

## Execution record
- Plan review focus mapped to exact-ID/metamorphosis tests, special face tests, alpha visual/perf checks, cache lifecycle tests.
- Next: inspect all original contact sheets; update family assignments where legacy Pilot inventory misclassifies actual topology. Then implement existing-family stage expansion, representative QA before batch.
- Full regression/CI for FR-0 not yet run. iPhone performance NOT_RUN. Full Rollout incomplete.

## FR-1a candidate checkpoint (not a completed wave)
- Branch `feat/character-3d-full-rollout-v0`, stacked Draft PR #376; FR-0 remote `12a4fdcdf22f60f22e599dd2eb8e498dbe45458d`, tree `b02a58cecc1937b5b59afc15674c43645772e201`. #372 untouched.
- 24 candidate exact stages: dog 8, cat 8, penguin 8. This adds 18 candidate stages; existing dog/penguin 01/04/08 copied byte-equivalent in spec values. Not yet promoted to runtime coverage.
- Shared mechanisms: parameterized lifted-paw idle that releases into locomotion; wrapped-tail family for curled feline resting poses. No new archetype.
- Dedicated 59 PASS, 0 FAIL locally. Three rollout removal mutations added. FR-0 dedicated CI 37182044066 success. Runtime/Home FR-0 CI pending at checkpoint.
- `wave-review.html` and `tools/character-3d/wave-review.cjs` render original + front/3/4/side/back from real shared builders/rig/expression/motion. CI artifact will contain 96 individual views + 3 species sheets.
- Local browser download failed (invalid/truncated archive); CI is the rendering route. No visual pass, fallback-zero claim or performance claim yet.
- Exact next: inspect CI wave images, correct any silhouette/pose/contact problems, run emotions/motion coverage, promote reviewed exact specs. Then remaining existing families and new topology waves.
- Full npm local run remains unresolved; do not report PASS without completion. Full inventory coverage, performance, final gallery and Human QA package remain pending.

### FR-1a visual review and correction
CI 37182457478 succeeded: 96 views + 3 sheets inspected from source `0d21776` (artifact 11294804833). Explicitly found: cat ears too small and face mask too narrow, dog07 asymmetric ears missing, penguin03 only one wing raised. Corrected through shared ear-side parameters, wing pose and original-derived feline parameters. Re-capture required before runtime promotion. Candidate-only view framing also aligned original and model art footprints more closely.

Local dedicated now 61 PASS / 0 FAIL including every candidate × eight canonical emotions × idle/walk × reduced/normal motion; rollout mutations 5/5 RED. FR-0 full npm run completed: 2920 + Relationship 80 PASS, 0 FAIL. These are checkpoint-specific results, not full-rollout completion or iPhone acceptance.

### FR-1 integration validation checkpoint
- Corrected source `732f587` / tree `a575e952ac7a132f9a92d894884c465ab8143330`: four-view CI 37182744172 success; 96 views inspected. Cat face/ears, dog07 asymmetric ears, penguin03 both raised wings now represented. Cat04 was still using a canine bow, so replaced with a reusable level-torso extended-play pose; next CI verifies that final change.
- Exact rollout registry now connects dog/cat/penguin all eight stages to real template/presenter and live gallery. Immutable Pilot definitions and all six existing dog/penguin reference stage values preserved. Exact candidate additions = 18; total exact spec availability = 46/293 active rows (includes 26 Pilot stages + 2 companions). This is not full visual/World acceptance.
- Role lookup rejects player cat as companion and companion cat_friend as partner. Unsupported exact rollout age returns null rather than nearest-stage substitution.
- Local dedicated 62 PASS; rollout mutation 7/7 RED. Added CI Meguru wave traversal (24 exact player stages) plus existing lifecycle/fallback and fixed Pilot-composition 1/5/27 measurements. Performance uses explicit QA stand-ins until all relationship characters exist; never claim that as full native coverage.
- FR-0 Runtime CI 37182066777 success. Home CI 37182066807 FAILED: chromium-landscape-safe-area route.fetch ECONNRESET fetching item-memories.css, movie.css, home-care-colors.css at 144 ms. FR-0 changed no app/Home/CSS code; transport failure is suspected, base reproduction not yet executed. Later Home runs still pending. Do not call this GREEN.
- No Home/World production fix made to hide the failure. iPhone remains NOT_RUN.

### FR-1 first family batch validated (source 81b04e0)
- 24 exact stages (dog/cat/penguin), 18 newly added; total exact availability 46/293. Remaining 247. No new archetype; 3 visual outlier candidates (cat01/08 curl compactness, cat04 wink fidelity), no adoption rating.
- 99 original/four-view image records + 61 Meguru JPEG captures; complete source and raw evidence under docs/qa/character-3d-full-v0/. Pilot 28-target geometry/pose hashes unchanged.
- Dedicated 62 PASS, old mutation groups 13/13 + 11/11 + 7/7 + 6/6 RED, rollout 7/7 RED. CI 37183152163 all jobs success. Runtime 37183155273 (2925+80 PASS/0 FAIL) and Home 37183155268 success. Earlier CSS ECONNRESET retained in history, no Home/CSS changes used to obtain success.
- Meguru 24 exact/live stages; unintentional fallback 0. 1/5/27 live counts correct, fallback 0. Fixed old-Pilot mix tris 4062/19144/106403 unchanged; CPU .957/2.701/5.555 ms; heap 19.3/19.3/23.1 MB. Separate-run comparison, not full-native/iPhone acceptance. Separate animation CPU and isolated appearance hitch still missing.
- Fresh main remains 0b0a6b3. #372 remains d12ad70 open Draft. Terrain progressed to 7fda832: four mechanical conflict files retained; new veranda presentation was read-only audited. No other lane merged.
- Remaining within FR-1: man/clownfish/butterfly/dandelion/mushroom/starfish exact gaps, then original-derived existing-family relatives. Next exact step: salmon and missing clownfish source strips → representative yolk/slender fish/jaw/marking/schooling mechanisms → visual QA → batch remaining fish stages; do not fill stages by interpolation or clone/recolour. New topology stays assigned to later family waves.
- Continue ordinary work without new Human approval. This checkpoint is not full v0 completion and not the final Human QA stop. No Ready/main merge/v1.

## Execution environment interruption

[RECOVERY_PENDING]
Local exec-server stopped accepting commands with `No such file or directory`. GitHub remained available. Dedicated source 81b04e0 and all CI checks are complete. Recovery workflow saves all verified World evidence to this Draft branch; it does not change models, main, #372, or adoption status. Resume ordinary FR-1 fish/existing-family work from fresh remote after a working executor is available. Full v0 is not complete; this is an infrastructure checkpoint, not the final Human QA stop.
