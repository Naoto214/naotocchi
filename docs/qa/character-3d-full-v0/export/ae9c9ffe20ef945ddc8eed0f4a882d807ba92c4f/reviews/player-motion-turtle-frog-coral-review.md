# Turtle / frog / coral captured-motion image review

**PASS — no stage/state blockers found in the assigned captured poses.**

Source: `ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f`, run `37922214774`. Controller reports all 3,113 raw files across 20 artifacts SHA/size-verified; aggregate run completed FAILED but the assigned stage jobs SUCCESS. This review uses the actual recovered images and does not repeat or substitute a metadata/hash check for visual inspection.

Actually opened every assigned motion board: **16 stages × 8 emotions × idle/walk × normal/reduced = 512 state cells**. Compared the inline original first column on all 128 rows. Also extracted and actually opened seven raw JPEGs for the tadpole-tail and coral-cluster ambiguities. Existing approved four-view/model gates were not reopened.

| Family | Stages inspected | State cells | Verdict |
|---|---|---:|---|
| Turtle | 1, 2, 4, 5, 6, 7, 8 | 224 | PASS |
| Frog | 1, 2, 4, 6, 8 | 160 | PASS |
| Coral | 1, 3, 4, 6 | 128 | PASS |

## Actual findings

- **turtle:** Green turtle head, domed segmented shell and pale rim stay readable. Four short limbs stay attached and in coherent support/step poses; shell/moss attachments remain together. Canonical eyes and mouth distinguish all eight emotions across normal/reduced idle/walk cells.
- **frog:** Tadpole stages retain green round body and attached fin tail; tail-bearing frog retains front limbs and hind limbs; mature frogs retain raised eye lobes, light belly, bent rear haunches and small toes. Face changes remain visible through all cells. Walk cells show bounded limb/haunch poses without visible detached joints or runaway parts.
- **coral:** Pink orb and peach/pink branching stages preserve their identities; branch tips and stone pads remain attached in idle/walk cells. Multicolor stage retains the pink/yellow/cyan cluster with purple background branches and colored base pads. Cluster face changes remain visible without a new motion-induced occluder.

No exact stage/state blocker was identified. All eight expressions remain distinguishable in the inspected normal/reduced idle/walk cells; no new visible loose attachment, broken joint, runaway anatomy, or displaced base/support was found.

## Accepted v0 simplifications / captured pose details

- **all 16 stages, all 32 cells each:** Canonical emotion glyphs replace the sprite-specific eye and mouth drawing. Smooth volumes and rounded extremities simplify pixel highlights, claws/toes and branch texture. Existing approved geometry/source four-view decisions were not reopened.
- **turtle:7 and turtle:8, all cells:** Moss appears as small rounded clusters on the shell rather than pixel foliage; its shell attachment remains stable.
- **frog:1, frog:2, frog:4 — wantsPlay/idle/normal and wantsPlay/walk/normal:** The animated tail is nearly edge-on or behind the round body. Raw frog:2 normal-vs-reduced and frog:4 walk-normal views confirm a visible attached tip/root silhouette rather than an orphan or missing mesh. Reduced cells retain a broader tail. This is a captured pose, not a claim of identical silhouette at every time.
- **frog:4, frog:6, frog:8 — all walk cells:** Locomotion is represented by limb/haunch stepping poses rather than a sprite-exact amphibian hop. Visible limbs keep anatomical connections and supports; thin toes and rounded curled hind feet are existing model simplifications.
- **coral:3, coral:4, coral:6 — all cells:** Coral uses bounded collective sway/pose changes with its rock-pad base rather than legged walking. Background branches and lower cluster members overlap naturally; the inspected raw stage-6 cells retain readable foreground expressions without new motion-induced detachment or face-covering geometry.

## Actually inspected board paths

- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-turtle/missing-motion/turtle-1-motion.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-turtle/missing-motion/turtle-2-motion.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-turtle/missing-motion/turtle-4-motion.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-turtle/missing-motion/turtle-5-motion.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-turtle/missing-motion/turtle-6-motion.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-turtle/missing-motion/turtle-7-motion.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-turtle/missing-motion/turtle-8-motion.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-frog/missing-motion/frog-1-motion.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-frog/missing-motion/frog-2-motion.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-frog/missing-motion/frog-4-motion.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-frog/missing-motion/frog-6-motion.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-frog/missing-motion/frog-8-motion.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-coral/missing-motion/coral-1-motion.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-coral/missing-motion/coral-3-motion.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-coral/missing-motion/coral-4-motion.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-coral/missing-motion/coral-6-motion.jpg`

## Additional raw JPEGs actually opened

- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-frog/raw-evidence.zip::missing-motion/frog-2-wantsPlay-idle-normal.jpg` → `/workspace/scratch/150320e8a2fd/player-motion-qa-detail/frog-2-wantsPlay-idle-normal.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-frog/raw-evidence.zip::missing-motion/frog-2-wantsPlay-idle-reduced.jpg` → `/workspace/scratch/150320e8a2fd/player-motion-qa-detail/frog-2-wantsPlay-idle-reduced.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-frog/raw-evidence.zip::missing-motion/frog-4-wantsPlay-walk-normal.jpg` → `/workspace/scratch/150320e8a2fd/player-motion-qa-detail/frog-4-wantsPlay-walk-normal.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-frog/raw-evidence.zip::missing-motion/frog-8-sleeping-walk-normal.jpg` → `/workspace/scratch/150320e8a2fd/player-motion-qa-detail/frog-8-sleeping-walk-normal.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-coral/raw-evidence.zip::missing-motion/coral-6-normal-idle-normal.jpg` → `/workspace/scratch/150320e8a2fd/player-motion-qa-detail/coral-6-normal-idle-normal.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-coral/raw-evidence.zip::missing-motion/coral-6-positive-walk-normal.jpg` → `/workspace/scratch/150320e8a2fd/player-motion-qa-detail/coral-6-positive-walk-normal.jpg`
- `docs/qa/character-3d-full-v0/export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/integration-coral/raw-evidence.zip::missing-motion/coral-6-sick-walk-normal.jpg` → `/workspace/scratch/150320e8a2fd/player-motion-qa-detail/coral-6-sick-walk-normal.jpg`

## Limits

This is acceptance of the assigned captured 34-view state appearances. Static images do not establish continuous playback smoothness or every gait phase. Root owns distance QA separately. No Human or iPhone/mobile acceptance is claimed. No new capture, code edit, reimplementation, test, promotion, remote operation or subagent was performed. Only report files and scratch copies of existing raw evidence were written.

The paired JSON lists every stage, all 32 state dispositions per stage, exact actually opened paths, accepted simplifications and the empty blocker list.
