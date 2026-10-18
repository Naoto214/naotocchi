# Task 11 — bounded integration evidence workflow

Base: `8523a522bf8967a2679ed7cbfdcdd63b328d354b`.
Head: `cc8f42584dec9e4844184bd252d0d57888794044`.
Branch: `work/integration-evidence`.
Worktree: `/workspace/scratch/150320e8a2fd/rollout-integration-evidence`.
Local commit only; clean working tree. Root owns integration, review, capture and remote save.

## Files

- `.github/workflows/character-3d-rollout.yml`
- `.github/character-3d-integration-motion.json`
- `docs/character-3d/full-rollout-v0/final-player-evidence-map.md`
- `tests/character-3d-integration-workflow-test.cjs`

The durable evidence map is a byte-for-byte copy of the read-only SDD map; SHA-256 `e1af02ce63681fcd1af594a6fb145792f7499549fe2144f07d91e99f0669ab0d`. No checkpoint, exporter, capture tool, model, runtime, gameplay, World, Home, save, Expression, 2D or author file edits. No new jobs or browser framework.

## Behavior

Explicit `[qa:integration]` takes precedence when combined with existing family markers. It retains all 31 stage-evidence shards and their aggregate, scene/lifecycle and performance gates, gallery and dedicated tests. The existing 18-job layout remains. Within each existing family stage-evidence job, the existing `wave-motion.cjs` receives only that family's configured missing stages and writes to `test-results/full-rollout/stages/$QA_LINE/missing-motion`, included by the existing family artifact path. Families without missing stages skip that step. The timeout is 25 minutes in integration mode and remains 15 otherwise. The existing matrix has max-parallel 5.

Integration skips the five already-approved wave-review capture steps while retaining gallery, four aquatic/armored/botanical/mythic wave-capture jobs, four old candidate-distance jobs, and the nonplayer capture job. Dedicated integration routing selects the existing mechanism mutations, rather than scoped candidate mutations. Without the integration marker, all 64 combinations of the six existing scoped markers retain their previous job and dedicated-step routing. The upcoming root `[qa:nonplayer]` capture save does not activate this mode.

## Exact selector

86 unique legal stage keys in 15 families; no accepted full-matrix stage or Pilot sample is selected. The accepted 136 stages, 26 Pilot stages and 86 missing stages partition all 248 legal player stages. The config matches the selector in the durable map exactly.

| Family | Missing stages | Count |
| --- | --- | --- |
| dog | 2,3,5,6,7 | 5 |
| cat | 1,2,3,4,5,6,7,8 | 8 |
| penguin | 2,3,5,6,7 | 5 |
| salmon | 1,2,3,4,5,6,7,8 | 8 |
| clownfish | 2,3,5,6,7 | 5 |
| man | 2,3,5,6,7 | 5 |
| woman | 1,2,3,4,5,6,7,8 | 8 |
| ren | 1,2,3,4,5,6,7,8 | 8 |
| dandelion | 2,3,5,7 | 4 |
| butterfly | 2,3,6,7 | 4 |
| mushroom | 2,3,5,6,7 | 5 |
| starfish | 2,3,5,6,7 | 5 |
| turtle | 1,2,4,5,6,7,8 | 7 |
| frog | 1,2,4,6,8 | 5 |
| coral | 1,3,4,6 | 4 |

At most eight stages / 256 raw motion cells are added to one family artifact. Existing exporter limits remain 64 MiB archive and 256 MiB unpacked; no combined 86-stage motion artifact is created. Existing stage-coverage parsing and artifact names/paths remain.

## Validation

Proper before-implementation run: 4 PASS, 2 RED for missing integration gating and family motion/timeout behavior. Log: `task-11-before.log`.

Final command:

```sh
node --test --test-reporter=tap tests/character-3d-integration-workflow-test.cjs tests/character-3d-stage-evidence-test.cjs
```

7/7 PASS, zero failures/skips, duration 2263.989546 ms. Log: `task-11-validation.log`.

The six new tests verify exact unique/disjoint/legal inventory selection; in-memory negative selectors (duplicate, accepted coral stage, Pilot dog stage, illegal stage); integration and all 64 prior scoped-marker routes; the actual inline selector command for all 31 families; artifact splitting/timeout; and the existing stage-evidence CLI's handling of nested motion metadata. That CLI test uses synthetic same-source distance records and file-existence fixtures, proving 31 shards / 248 aggregate records and that child motion metadata cannot pollute distance aggregation. It is not browser or image evidence.

Local PyYAML parsed all 18 jobs successfully. The actual new motion shell block passed `bash -n`. `git diff --check` and staged diff check passed. No broader suite, production mutations, full npm, screenshots or remote actions. No unchanged model/default rechecks were needed because no production geometry changed.

## Review limits and concerns

The plan minimum is five emotions × idle/moving = ten cells per missing stage, or 860 cells. The unchanged tool emits all 32 states, or 2752 raw cells plus 86 sheets; emission is not acceptance. Root must review the selected minimum cells and owned face coherence against actual images/records. Existing tool metadata validates requested identity/state/triangles, not every owned face emotion. Fixed stills do not prove an animation cycle.

The historical map preserves the early 80-image normal-distance review gap and clownfish stage-05 notice-obstruction caveat. The 31 existing stage jobs supply 496 fresh distance images without duplicating old family distance jobs. Source identity and actual image review remain root-owned gates; no new image PASS or full-rollout acceptance is claimed. Approved four-view captures are not repeated by this addition. Root's separate legacy resolver fix (reported 2 PASS and C0/I0) is not included here.
