# Final production runtime integration QA slice

Base: `711f2dcb6836f27370b8155483f466ea312458df` (Author hair correction; production registration remains43 roles in this isolated base).
Head: `c4e5b2263acf04e5c6c873a563b88392b5bf1b92`.
Branch: `work/final-runtime-integration`.
Worktree: `/workspace/scratch/150320e8a2fd/rollout-final-runtime-integration`.
Clean local commit. Root owns final Author/Eagle promotion, independent review, final full npm and immutable browser/CI results. No push or local browser download.

## Scoped files

- `.github/workflows/character-3d-rollout.yml`
- `tools/character-3d/nonplayer-review.cjs`
- `tools/character-3d/meguru-qa.cjs`
- `tools/character-3d/runtime-integration.cjs`
- `tools/character-3d/runtime-integration-remove-it.cjs`
- `tests/character-3d-runtime-integration-test.cjs`

QA/workflow only: no model/spec/registry/renderer/runtime/gameplay/World/Home/save/Expression/2D/gallery/default changes. Existing source flags and ordinary capture routes remain. No new job or browser framework.

## Production role sweep

Existing `nonplayer-review.cjs --functional-only` serves unmodified production files (`serve()` without overlay or historical options), reuses `saveFor` and `distanceActor`, and performs no screenshot, image generation or candidate capture. Master-derived45 inventory covers26 companions,18 partners and Author. It asserts canonical role→model identity and original asset independently of production lookup. Shiba and Cat retain legacy model IDs; every other model ID is the exact role key. Actual simulation actor key/kind/id/asset, production spec key, stage0/exact, attached live template, fallback0 and failed-template0 are checked. A normal renderer draw is bracketed by saved-state/getter/write-count assertions. Current-approved subset mode explicitly records missing roles; `--require-full` rejects any missing approval or filtered subset and requires45.

Author uses the unchanged legal lifetime.dexCleared actual memory_lake resident, observes its natural2D presentation, stages that same object through the existing bounded forest view adapter, and checks same identity plus draw/step/list/pose/actor restoration. Finally cleanup releases the adapter even when validation/readiness fails; no party substitution or fake Author. Author save/getter/write counters compare before staging with after restoration. This proves presentation in the established forest QA context, not a memory_lake3D rollout.

The browser route saves `production-nonplayer.json` with sourceCommit, productionOnly/candidateOnly/capture flags, complete checked/missing lists, actual identities/templates/stats, save-write counters, author proof, errors/failures and verdict. No final45 PASS can be inferred from the43-role worker snapshot.

## Scene and measurements

The existing Meguru scene mode gains `--integration-scene --no-capture`. It retains scene/lifecycle/player-visible/isolated fallback assertions and adds one warmup plus three repeated character3D→2D→3D and forest→city→forest cycles. The repeated probe runs before intentional Shiba fallback so expected fault counters do not contaminate its fallback0 gate. It never forces a city presenter reset. It captures live/holders, created/removed balance, templates, materials, atlases, eye geometry cache, GPU textures/geometries, heap and actual save-write counters. Warm forest resources must plateau; city/off must have zero live holders, and forest count must recover. The QA simulation's step is held only during this renderer/region proof and restored in finally; the actual bridge getter and save calls are never replaced or suppressed. Its temporary region field is restored. Saved-state bytes/storage and write-count invariance are assertions, not a claim that ordinary gameplay should stop progressing.

Existing perf gains `--integration-metrics --no-capture` on the unchanged actual1/5/27 composition. `isolatedAnimation` clones each actual live template, warms30 frames then measures120 frames of animate() atdt1/60, moving=true, level2; records raw samples, mean/p95 and exact template histogram, verifies live actor animation/bones unchanged, and disposes clones in finally. It is labeled isolated QA simulation CPU, not main-render animation CPU. The RAF probe records timestamps/intervals/live/created/template/built counters and creation-window neighboring frames. Appearance-window maximum excludes unrelated startup maximum and is labeled observed RAF intervals, not isolated build CPU or a universal hitch bound. Probe is bounded to30 seconds after presenter detection, with120-second startup ceiling. Browser execution of these additions is pending.

The existing historical performanceMix label remains for compatibility; actual histograms/composition checks are authoritative. This is dog04 plus native companions in the current production1/5/27 cast. It does not establish improvement against historical Pilot stand-in27 measurements or actual iPhone performance.

## Workflow

Only existing `meguru-wave` receives conditional integration steps: production role sweep `--functional-only --require-full`, repeated no-capture scene and no-capture native performance metrics. Ordinary scene/perf commands retain their original behavior outside `[qa:integration]`. Existing artifact includes the JSON outputs;18 jobs,31 stage shards/aggregate, exporter limits and family splitting remain. No completed source four-view captures are repeated by these added routes.

## Validation

Proper pre-wiring baseline:4 PASS /1 RED (missing integration job commands), `final-runtime-integration-prewire.log`. The earlier absent-helper load error is not treated as a meaningful control.

```sh
node --test --test-reporter=tap tests/character-3d-runtime-integration-test.cjs tests/character-3d-integration-workflow-test.cjs
```

15/15 PASS,47.965007 s. `final-runtime-integration-final.log`. Nine runtime tests plus six existing integration-workflow tests include every currently approved production role using actual simulation actors and production actorInfo/template/presenter, attached holders, unchanged saved state and disposal. Actual43/45 Node actors pass (the base's unapproved Eagle/Author remain missing); this is not WebGL or actual browser proof.

Final small assertion/metadata additions were verified without rebuilding unchanged43 templates:

```sh
node --test --test-reporter=tap --test-name-pattern='production role planner|functional gate|repeated scene gate|final integration wiring|appearance windows|served lookup|actor fallback' tests/character-3d-runtime-integration-test.cjs
```

8/8 PASS,1523.404975 ms. `final-runtime-integration-focused-final.log`. Earlier unit/focused logs remain source-scoped. The actual43 actor/geometry test is reused unchanged; the added Author-positive branch is exercised only after production promotion. A real presenter failUpdate causes an actual actor fallback and functional rejection without changing saved state. HTTP fixture proves served production spec bytes equal local bytes, preserves missing-role negatives and never introduces an overlay.

```sh
node tools/character-3d/runtime-integration-remove-it.cjs
```

7/7 RED controls detected: omitted full45 requirement, wrong actual role kind guard, wrong live-template guard, omitted Author draw restoration, omitted city live cleanup, omitted template plateau and startup maximum mislabeled appearance window. Exact QA helper bytes restored, focused baseline GREEN; final SHA-256 `c1e575dfece9d8f8fead2320755ba0ff62dbdd5219175c3280c2be439662e381`. `final-runtime-integration-controls.log`. These are QA gate mutations; no production mutation or full replay.

Whole workflow parses with18 jobs; touched JavaScript syntax checks and staged diff check pass. No broader suite/full npm/screenshots/default or unrelated model replay.

## Actual browser execution still pending

Attempted both existing CLI routes:

```sh
node tools/character-3d/nonplayer-review.cjs /tmp/runtime-integration-smoke --functional-only --keys=companion:shiba,partner:cat_ceo
node tools/character-3d/meguru-qa.cjs --rollout --no-species --no-perf --integration-scene --no-capture --out /tmp/runtime-integration-scene
```

Both stop at Playwright launch: expected Chromium headless-shell1234 executable is absent. No actor/browser/loop/timing result is claimed. Raw blocked logs: `final-runtime-integration-smoke.log`, `final-runtime-integration-scene.log`. No local browser download attempted. The functional launcher now closes its HTTP server on launch failure.

Read-only concern for actual CI: warmed city transition may retain hidden presenter holders until the next forest disposal. The new strict city gate intentionally exposes this if it occurs; the old fixture resets fallback hooks just before city and may hide retained holders. This is a hypothesis from source inspection, not a reproduced production defect; no production fix or assertion relaxation is included. Root explicitly retained strict checks for immutable final CI diagnosis.

Final promoted45-source browser sweep, repeated-scene cache/save proof, metrics, final source gate and image acceptance remain root-owned. Node fixtures, JSON emission and successful pure validators do not satisfy actual image review or browser performance acceptance.
