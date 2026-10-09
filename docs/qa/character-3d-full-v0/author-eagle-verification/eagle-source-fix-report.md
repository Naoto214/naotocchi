# Eagle source silhouette fix report

Base: `d7dc8973d7acfadb9298712505bb8735ffdbf0ce`.
Head: **`a7c955a1cb6dfd38787c8cd1d458a97647a75b50`**.
Branch/worktree: `work/eagle-source-fix`, `/workspace/scratch/150320e8a2fd/nonplayer-eagle-source-fix`.
Status: clean local commit; no promotion, screenshots, remote operation, broad suite, shared factory or runtime changes. Targeted fix for sole I1 in `spider-yarn-eagle-snowman-image-review.md`; independent code/image acceptance belongs to root.

Exact existing key: **`partner:high_eagle`**.
Mutation tool: **`tools/character-3d/distinct-partner-remove-it.cjs`**, now 17 total cases. Only affected/new controls were replayed.

## Source and change

Actually opened `assets/characters/partners/high_eagle.png` and the rejected source-inline `partner-high_eagle-views.jpg` in the 73a1b4e384b1a636a1f2f557edd3afd1cd19dfe6 export. The source has long hanging pale/dark-tipped primaries under descending brown coverts, near its talons. Captured geometry instead formed short shallow sideways wedges, including its rear view.

Redistributed the same seven primaries and four brown coverts per wing into longer descending fans. Endpoints move downward and inward to match source proportions; brown coverts overlap the upper/middle pale primaries. Exactly 22 existing feather centerlines changed. Counts, feather width/depth/color/tip settings, wing attachment/placement, body/head/beak/ruff/tail/talons and all non-wing data are unchanged. No geometry was added, so produced topology/triangle counts remain at the existing budget; actual expressions are rechecked by the targeted suite.

Rest produced wing dimensions are approximately 0.38 horizontal ×0.65 vertical ×0.17 depth. Four distal pale primary tips reach about 0.06–0.12 above talon floor, versus about 0.25–0.30 for the rejected paths. Full body/head height remains unchanged. All 41 other rows compare exact against base; Eagle non-wing fields and per-feather non-path fields compare exact.

## Regression and controls

The former broad local-AABB test did not prove source descent. It is replaced with actual indexed-constituent world-space checks: each of four pale primaries descends near feet (clearance >0.025, <0.19 at rest), vertical drop >0.44 and drop/spread >0.95; lower brown covert descends below 0.24; whole rest wing span is 0.35–0.48 wide and >0.55 tall. World coordinates are derived through actual mesh transforms, and each shell uses only its own triangle indices, rather than shared merged vertex buffers.

Canonical existing wantsPlay motion legitimately flaps wings upward. The source silhouette constraints apply to rest; the new all32-state branch checks actual distal ground clearance, with existing all32 closed-volume constituent contact and eye/mouth clearance regressions retained. No motion was changed or artificially locked. Observed lowest animated distal clearance is about 0.0306 above the lowest foot.

Dark tips are now checked on the distal region of every actual pale primary constituent instead of the stale horizontal abs(x)>0.35 assumption. This avoids counting dark brown covert/inner-feather vertices as proof of dark pale-primary tips.

New negative controls restore the exact former shallow primary paths and former short upper coverts, each producing its specific world-space source regression failure. Detached-primary anchor/replacement is updated to the new exact path, still translating only constituent 6 away from the owner. Dark-tip control was rerun against the more precise per-primary color check.

## Evidence

- Before production correction: `node --test --test-reporter=tap --test-name-pattern='world-space primary silhouette' tests/character-3d-distinct-partner-candidate-test.cjs` **RED**, first pale primary at 0.299 above talon floor. `eagle-source-fix-before.log`.
- Final affected-only baseline: `node --test --test-reporter=tap --test-name-pattern='high_eagle|two distinct' tests/character-3d-distinct-partner-candidate-test.cjs`: **6/6 PASS**, 42.953 s. Closed/finite/ground/budget; Eagle canonical face in all32 states; rest constituent graph; all32 contact graph; source anatomy; new indexed world-space silhouette/all32 animated clearance. `eagle-source-fix-baseline.log`.
- `node tools/character-3d/distinct-partner-remove-it.cjs --case='eagle former shallow primary wedges'`: **RED → restored GREEN**, expected near-talon failure. `eagle-source-fix-wedges-control.log`.
- `node tools/character-3d/distinct-partner-remove-it.cjs --case='eagle detached primary feather'`: **RED → restored GREEN**, actual shell6 cannot reach owner. `eagle-source-fix-detached-control.log`.
- `node tools/character-3d/distinct-partner-remove-it.cjs --case='eagle former short upper coverts'`: **RED → restored GREEN**, lower covert regression. `eagle-source-fix-coverts-control.log`.
- `node tools/character-3d/distinct-partner-remove-it.cjs --case='eagle dark outer tips'`: **RED → restored GREEN**, every pale primary's distal dark surface checked. `eagle-source-fix-tips-control.log`.
- Mutation runs restored source and plumed_bird buffers byte-for-byte in finally; current source SHA256 `6c4729072503e5b686473a8d8438118ba0a5c21c02e767b22634902332e13533`, unchanged factory SHA256 `b620a99327b2352236ec21cc1adcb5a33f83b092773ca31c5ccec30cae33e0b9`. No mutation residual. Reused unchanged prior Task9 Snowman/default PASS and 13 unchanged RED cases; no whole mutation batch/factory audit replay.
- Read-only data comparison against base: **41/41 other rows exact**, Eagle all non-wing fields exact; each of 22 feathers' non-path fields/counts exact.
- `git diff --cached --check`, `git show --format= --check HEAD`: PASS. Final `git status --short`: empty. No dependency link staged.

## Files and integration

- `character-3d/nonplayer-spec.js`: highEagle feather paths only.
- `tests/character-3d-distinct-partner-candidate-test.cjs`: source/world silhouette and precise distal color regressions.
- `tools/character-3d/distinct-partner-remove-it.cjs`: exact updated primary anchor, two source-shape controls.

Root's newer Snowman registration boundary must be preserved on integration; this worker retained its older first registration assertion as instructed. Task10/root pending changes untouched. Fresh full Eagle four views/32-state/two-distance image gate still required; no actual image PASS is claimed. Human/device gate stays separate.
