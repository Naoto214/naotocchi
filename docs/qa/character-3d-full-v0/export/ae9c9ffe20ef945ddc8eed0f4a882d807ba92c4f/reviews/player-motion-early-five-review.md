# Early five player motion image review

**REJECT, scoped to captured motion/state images.** Actually inspected all 31 boards / 992 cells from source `ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f`. Confirmed 20 detached-fin cells; the other 972 cells have no blocking image defect observed. No Human or iPhone approval.

Source run `37922214774` concluded **failure**. These five stage artifacts came from successful capture jobs; neither job success nor byte integrity is an image verdict. Parent restored and verified 3,113 raw files. This review additionally matched the 31 opened board hashes and 31 distinct extracted raw-frame bytes/hashes against manifests/ZIP members. Source environment: Chromium/SwiftShader.

| Family | Stages actually inspected | Cells | Scoped result |
|---|---|---:|---|
| dog | 2, 3, 5, 6, 7 | 160 | PASS |
| cat | 1–8 | 256 | PASS |
| penguin | 2, 3, 5, 6, 7 | 160 | PASS |
| salmon | 1–8 | 256 | PASS |
| clownfish | 2, 3, 5, 6, 7 | 160 | REJECT: 20 cells |

Every board was opened via `view_image` at original detail. The original image is the first column. All eight rows (`normal`, `positive`, `dislike`, `tired`, `sleeping`, `strained`, `wantsPlay`, `sick`) and four columns (idle/normal, walk/normal, idle/reduced, walk/reduced) were inspected for source identity, visible expression, part joins and support/pose anomalies. This is 32 cells per stage, not a family sample extrapolation.

## Exact rejection

**Clownfish stages 2, 3, 5, 6, 7; emotion `dislike`; both `idle` and `walk`; both `normal` and `reduced` — 20 cells.** A background gap visibly separates the main fish's screen-left pectoral fin from its body. All 20 exact raw JPEG frames were extracted unchanged from `integration-clownfish/raw-evidence.zip` and viewed individually. No explicit prior acceptance of this detached fin was established. Stage 5's two smaller fish do not obscure the main face; the confirmed failure concerns the main fish.

Raw member pattern: `missing-motion/clownfish-{2,3,5,6,7}-dislike-{idle,walk}-{normal,reduced}.jpg`. The JSON lists all 20 exact members, state labels and hashes, plus all 31 board paths/hashes and per-stage observations.

## Other observations

Dog ears, chest/muzzle, tail and stage-specific sitting/raised-paw/standing poses stay recognizable; visible head/body/leg/tail joins remain continuous. Cat's pale face, white paws, tails and stage-specific resting/sitting/leaping/standing poses stay recognizable. Cat 1/8 normal wantsPlay walk projects the curled tail across the forelegs. Exact cat 1 normal/reduced frames were viewed: no detached tail or face obstruction was found, so this is recorded as a nonblocking overlap. Cat 4's airborne idle pose matches the original leap.

Penguin chick/adult palettes, pale face/belly, wing poses and orange feet remain visible and connected through the state changes. Salmon retains its egg sac (1), orange juvenile/parr markings (2–3), silver speckles (4–6), and spawning palettes (7–8); no expression obstruction or clear fin/tail detachment was found. All eight salmon dislike/idle/normal raw frames were additionally viewed to check comparable frontal fin joins. Clownfish retains its orange/banded identity and stage 5 grouping; the other 140 clownfish state cells have no blocking image defect observed.

Existing v0 rounding and compact low-detail features are not new blockers. This does not excuse the confirmed detached-fin defect. Unchanged approved four views were not re-reviewed. Distance is root's separate review; no distance image was opened here. Still captures do not prove every moment of an animation cycle, overall CI, Human QA, or iPhone QA.

Root should repair the fin attachment and review bounded affected-stage replacement motion evidence. Root owns any shared-geometry impact scope; no acceptance is inferred for uninspected stages. No models, captures or tests were changed/run in this task.
