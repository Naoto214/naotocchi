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
