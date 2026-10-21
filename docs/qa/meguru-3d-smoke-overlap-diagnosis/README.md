# Read-only smoke overlap diagnosis — 2026-10-12 JST

Scope: characterize small nonzero party/circular-obstacle overlaps without changing product collision, rendering or CI thresholds. Source8e3c71a (product equivalent to c010bf2). This is a synthetic production-simulation probe, not browser/FPS/iPhone testing.

## Reproduction

From a complete source-bound checkout:

```sh
node docs/qa/meguru-3d-smoke-overlap-diagnosis/reproduce.cjs .
```

Recorded run: Node v24.19.0, exit0, empty stderr, exact assertion result PASS. result.json contains source/script SHA256, fixed fixture, witnesses and extra-resolver results. No broad CI rerun. The harness reads source from cwd; the script changes to the explicitly requested root BEFORE loading it.

The same 27-actor jungle fixture is stepped with fixed synthetic wall-frame intervals. Production's 50ms simulation-dt cap is applied. Each of four direct direction vectors is held for round(1200/frameMs) steps, with one release step; warm-up is round(2500/frameMs) idle steps. Sampling occurs after every simulated step, not actual browser setInterval. Input ramps, browser layout, real RAF/setInterval scheduling and render workloads are not reproduced.

| Synthetic wall interval | Maximum circular overlap |
|---|---:|
| 50ms | 1.0658141036401503e-13 |
| 80ms, first run | 0.003990106070830279 |
| 80ms, exact repeat | 0.003990106070830279 |
| 100ms | 4.973799150320701e-14 |
| 120ms | 0.004184211850848385 |

The repeated80ms case matches all serialized numbers/structures exactly. All five cases use capped simulation dt0.05; changing nominal wall interval changes the number of steps, trajectory and accumulated simulation duration, not just sampling phase. These intervals are experimental inputs, NOT observed device performance. Independent review reran the script and reproduced PASS/exact values; no blocking finding.

## Mechanism demonstrated in this fixture

At the80ms maximum, companion:panda is at(267.2502508047155,579.3404335252677), frame60. It has a circle residual against palm collider pi37 at joint contact with log box pi1133. The log penetration itself is only1.4210854715202004e-14; do not describe two materially penetrating colliders. The120ms schedule reaches the same joint contact through a different actor/time.

Production resolveObstacles makes at most three sequential passes; a later obstacle can push a point back toward an earlier obstacle. Production moveWithCollision rejects a move only if aggregate penetration increases by more than0.01. Its bounded iteration/tolerance can therefore retain a small residual at this joint contact. Source comments and the existing party-collision test already acknowledge shallow0.00x sliding contacts; that test's pre-existing limit is0.5. Neither tolerance was added/relaxed here.

Additional calls to the UNCHANGED exported resolver, on a COPY of the80ms witness point and the same world, reduce aggregate penetration:

0.00399010607084449 → 0.0000014278513660315184 → 5.108304890200088e-10 → 1.9895196601282805e-13 → 1.4210854715202004e-14.

This supports a bounded-iteration joint-contact residual, not a missing collider, an exact-zero guarantee or a terrain-depth measurement. Timing changes the simulated path/contact reached; the fixed fixtures demonstrate different maxima without any source change. Do not infer that every real-time sampling effect has been measured.

## Historical evidence and boundary

Saved run95c5850 and runeedd964 have byte-identical recorded meguru.js/meguru-3d.mjs/index.html SHA256s. Their jungle results differ:

| Saved source label | party max | samples | final rounded player | walked |
|---|---:|---:|---|---:|
| 95c5850 | 0.0025200611492053326 | 37 | (-28,489) | 300 |
| eedd964 | 0.004852588928741852 | 37 | (-46,484) | 298 |
| 69e2684 | 0.00599196916066802 | 44 | (-54,564) | 378 |

Source files: ../meguru-3d-ci/run-{95c5850,eedd964,69e2684}/smoke/smoke/regions-smoke.json; SHA files: ../meguru-3d-ci/run-{95c5850,eedd964}/smoke/source-sha256.txt. These files already exist in git; no duplicate originals saved.

The legacy browser smoke retains maxima/counts and end positions but not per-sample actor/obstacle/RAF/input traces. Exact attribution of those old maxima to pi37/pi1133 is NOT established and cannot be reconstructed from those aggregates alone. What is now established is a reproducible same-source mechanism in the current production simulation, with the same order of magnitude, and direct evidence that the historical identical-source paths differed. The latest near-zero run does not erase the historical values.

## Disposition

Read-only mechanism diagnosis completed for this bounded fixture. No additional collision fix is justified solely to make this metric exactly zero. General collision changes remain outside the single-tree exception. Exact historical replay remains unavailable rather than falsely solved. If materially larger contacts or visible blocking occur, capture source, actor/obstacle IDs, coordinates and input/frame timing at the event before proposing a scoped correction. Do not repeat fullCI just to obtain a zero maximum.

An initial diagnostic assertion used deepStrictEqual on nested objects from two distinct VM realms and failed despite identical serialized values; the finalized check compares exact JSON strings, including all numeric values, with no numeric tolerance increase. An attempted JSON read after that failed run also failed because stdout was empty. These were diagnostic-harness errors, not product failures; the final execution above completed successfully. Earlier fast16.67–50ms probes produced only rounding-scale overlap; the nonzero contact emerged after modeling the production dt cap under longer wall intervals.

Human appearance and physical iPhone gates remain unapproved. World remains incomplete; PR374 Draft/open/unmerged. No product/placement/collision/2D/Character/Expression/save/season/runtime/Pages changes.
