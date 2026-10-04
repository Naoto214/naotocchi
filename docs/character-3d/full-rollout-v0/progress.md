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
