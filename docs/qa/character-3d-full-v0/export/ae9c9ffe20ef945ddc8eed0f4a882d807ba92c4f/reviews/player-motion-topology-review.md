# Player motion topology actual image review

Verdict: **REJECT — C0 / I1 / M0**. All 18 requested boards and all 576 produced cells were actually viewed using `view_image` at original detail. Nine unchanged raw JPEGs were extracted from the Mushroom ZIP and actually viewed to confirm obstruction.

Source: `ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f`, run `37922214774` (**failure**). The four source `stage-evidence` jobs are completed/success in their manifests; their successful artifact capture does not make the overall run successful. Export root: `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/`.

| Family | Stages actually inspected | Boards / cells | Scoped result |
| --- | --- | --- | --- |
| Dandelion | 2, 3, 5, 7 | 4 / 128 | PASS |
| Butterfly | 2, 3, 6, 7 | 4 / 128 | PASS |
| Mushroom | 2, 3, 5, 6, 7 | 5 / 160 | 2 PASS; stages 5, 6, 7 REJECT |
| Starfish | 2, 3, 5, 6, 7 | 5 / 160 | PASS |

Each board has the original reference in its first column and 32 produced cells: eight emotions × idle/walk × normal/reduced motion. All cells were inspected for face visibility, body connections and source identity. The passing boards preserve readable expressions and coherent connections in these sampled poses. Mushroom bodies remain connected, but their cap clearance fails.

## Important I1: Mushroom cap obscures canonical emotion details

- `integration-mushroom/missing-motion/mushroom-5-motion.jpg`: tired and sleeping eyes are largely or wholly covered; sick eyes/forehead detail disappear under the cap. Dislike upper eye/brow detail is also clipped. This repeats across all four motion columns.
- `integration-mushroom/missing-motion/mushroom-6-motion.jpg`: dislike/tired upper face is obscured, and sick forehead stress marks are hidden by the cap, across all four columns.
- `integration-mushroom/missing-motion/mushroom-7-motion.jpg`: the tilted cap partly covers sick forehead stress marks across all four columns.

Raw confirmation entries in `integration-mushroom/raw-evidence.zip` are `missing-motion/mushroom-{5,6}-{tired,sleeping,sick}-idle-normal.jpg`, `missing-motion/mushroom-{5,6}-dislike-idle-normal.jpg`, and `missing-motion/mushroom-7-sick-idle-normal.jpg`. The nine actual paths are recorded individually in the JSON, including extracted scratch paths. Stage 5 is an unambiguous face obstruction at raw 320×320 resolution, not a board-size artifact.

Minimal fix: keep the cap clear of the complete eye/brow/forehead/mouth footprint through the affected emotion poses while preserving source silhouette and cap/stem attachment. Recapture and actually inspect all 32 states for stages 5, 6 and 7. Unaffected image acceptance can be retained only where inputs/geometry remain unchanged.

This review does not reopen accepted four-view evidence, inspect continuous animation, approve runtime QA, or grant Human/iPhone approval. Root's reported 3113-file raw verification was not rerun. No code was changed. Per-board exact paths and observations are in `player-motion-topology-review.json`.

