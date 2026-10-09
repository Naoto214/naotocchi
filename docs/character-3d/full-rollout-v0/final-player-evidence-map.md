# Final player image evidence map

## Current integration review

This current section supersedes the historical pre-integration audit below. Production source: `0be70751e0896388e46a33969bef51c15dcdb3ae`. All31 families/248 stages are registered; ae9 run37922214774 aggregate113805523751 confirms exact browser coverage. Registration is separate from image acceptance.

- The86 formerly missing motion stages were actually inspected at32 cells each. Ae9 supplied78 PASS/8 REJECT; ddaf replacement review resolved Clownfish02/03/05/06/07 and Mushroom05/07. **85/86 are currently accepted; Mushroom06 remains OPEN until its0be replacement is actually inspected.** Original rejection reports remain saved.
- All80 early-family normal-distance images were actually inspected from ae9. The changed Clownfish rows use ddaf replacements (10 distances); Mushroom05/07 also have accepted replacement distances. Prior unchanged416-distance evidence is retained, with Mushroom06 replacement pending.
- Previous136 complete32-state gates and26 narrower Pilot five-emotion×idle/walk gates are reused. After the last replacement passes, the total will be222 complete32-state stages plus26 narrower Pilot stages. This is not a claim that all248 stages have32 reviewed images.
- Phoenix all8 actual image approval is unchanged: original-source `fde2580` visual-review.json and byte-identity reuse details below. No new Phoenix capture or implementation is needed.
- Review authorities: `export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/reviews/` (motion, distance and data); `export/ddaf1edf5c4d13254151308996a1727bc705829b/reviews/` (seven accepted repairs and retained Mushroom06 rejection). Paths are relative to `docs/qa/character-3d-full-v0/`.

Human adoption and actual iPhone acceptance remain separate OPEN gates.

## Historical pre-integration audit and preserved selector

The following records describe the original missing scope and its capture plan. Their pending counts are historical, not current verdicts. Preserve the exact selector for provenance; current acceptance is stated above.

Source-scoped audit for the final Human QA package; no fresh image inspection, capture, implementation, or acceptance performed. Paths below are relative to `docs/qa/character-3d-full-v0/` unless stated otherwise. Counts distinguish recorded actual review from capture/automated checks.

The canonical checkpoint currently records 31 player families / 248 exact stages. Its `currentGates.playerStageAggregate` is source `d3e64f0dd5c9f038c0a0c61a9a77314f4c83d99c`, run37881115241, aggregate113671073543: 31 families /248 exact-live stage records. This is historical browser registration/distance-file completeness, not an actual review of every expression/motion image. `full293Integration`, Human QA and iPhone QA remain OPEN.

## Honest minimum and remaining scope

- Four views: **992 source-scoped reviewed views** (31×8×4), with all31 family acceptance paths mapped below. Preserve the accepted images when implementation identity is retained.
- Complete canonical image-state gate: **16 families ×256 =4096 cells**, plus Turtle03 32, Frog03/05/07 96, Coral02/05/07/08 128 = **4352 explicitly reviewed 32-matrix cells across136 stages**. Full248-stage arithmetic would be7936 cells. The corresponding **3584-cell full-matrix completeness gap** covers112 stages; narrower Pilot cells are accounted separately below. This arithmetic is not a newly imposed universal32-image requirement; no missing images are implicitly passed.
- Historical Pilot26 stages have **five emotions ×idle/walk =260 visible sample cells**, separate from the preceding count. These are useful source-scoped comparison evidence, not 32-state matrices: sleeping/strained/wantsPlay and reduced-mode captures are absent from that protocol. Two revisions in a comparison board do not double accepted revised-state coverage. Do not deduct260 from the canonical gap without an explicit final review/identity decision.
- Normal distance: the later26 families have **416 explicitly reviewed front/back images**. The earlier dog/cat/penguin/salmon/clownfish80 captures exist with exact/live metadata and some documented actual inspections, but a complete per-stage actual-image acceptance statement is not established in the targeted records. Keep those80 as capture evidence / review-completeness gap. Clownfish05 source048 has an explicitly documented discovery-notice obstruction; do not call it an unobstructed accepted view.

## Per-family authority and image roots

Every row has32 accepted four views. State count means a full eight-emotion ×idle/walk ×normal/reduced image set at the listed stages; `0 full` does not erase narrower Pilot evidence. Distance `16 PASS` is source-scoped recorded actual review, not final-device approval.

| Family | Source / authoritative image root | Reviewed state cells | Distance | Acceptance authority |
|---|---|---:|---|---|
| `man` | `fr1-human/2befff5` | 0 full; Pilot 01/04/08 five-emotion samples | 16 PASS | C |
| `woman` | `fr1-human/2befff5` | 0 full | 16 PASS | C |
| `dog` | `fr1` | 0 full; Pilot 01/04/08 five-emotion samples | 16 captured; partial review record | A |
| `cat` | `fr1` | 0 full | 16 captured; partial review record | A |
| `penguin` | `fr1` | 0 full; Pilot 01/04/08 five-emotion samples | 16 captured; partial review record | A |
| `turtle` | `fr2-shell/b1087ac` | 32 (03 only) | 16 PASS | G |
| `frog` | `fr2-shell/b1087ac` | 96 (03/05/07) | 16 PASS | G |
| `salmon` | `fr1-fish` | 0 full | 16 captured; partial review record | B |
| `clownfish` | `fr1-fish` | 0 full; Pilot 01/04/08 five-emotion samples | 16 captured; partial review record | B |
| `butterfly` | `fr1-topology/d8e3b76/butterfly` | 0 full; Pilot 01/04/05/08 five-emotion samples | 16 PASS | E |
| `beetle` | `fr2-armored/e1c536f` | 256 (all8) | 16 PASS | `review.json` in this root |
| `stagbeetle` | `fr2-armored/e1c536f` | 256 (all8) | 16 PASS | `review.json` in this root |
| `cicada` | `fr2-armored/56ad868 (05 corrected; other7 inherited d0b01eb)` | 256 (all8) | 16 PASS | `review.json` in this root |
| `antlion` | `fr2-armored/21e6565` | 256 (all8) | 16 PASS | `review.json` in this root |
| `hermit_crab` | `fr2-armored/f7cb48e-hermit` | 256 (all8) | 16 PASS | `review.json` in this root |
| `jellyfish` | `fr3-aquatic/0e5cdce` | 256 (all8) | 16 PASS | `review.json` in this root |
| `starfish` | `fr1-topology/3ce6f6e` | 0 full; Pilot 01/04/08 five-emotion samples | 16 PASS | F |
| `coral` | `fr3-aquatic/64855b7` | 128 (02/05/07/08) | 16 PASS | H |
| `dandelion` | `fr1-topology/99268a8/topology` | 0 full; Pilot 01/04/06/08 five-emotion samples | 16 PASS | D |
| `sakura` | `fr4-botanical/8f5245f` | 256 (all8) | 16 PASS | `review.json` in this root |
| `venus_flytrap` | `fr4-botanical/c331193-venus` | 256 (all8) | 16 PASS | `review.json` in this root |
| `mushroom` | `fr1-topology/3ce6f6e` | 0 full; Pilot 01/04/08 five-emotion samples | 16 PASS | F |
| `dragon` | `fr5-mythic/025d4bb-dragon` | 256 (all8) | 16 PASS | `review.json` in this root |
| `phoenix` | `export/fde2580dafec7691a13f94c71660cc3c8c43b52a/phoenix-wave` | 256 (all8) | 16 PASS | parent source directory `visual-review.json` + wave/distance `manifest.json` |
| `god` | `export/86dfd3a306a7bb5de583ba9e2b88f525d2bfccf3/god-wave` | 256 (all8) | 16 PASS | parent source directory `visual-review.json` + wave/distance `manifest.json` |
| `world_tree` | `fr4-botanical/9b79310-world-tree` | 256 (all8) | 16 PASS | `review.json` in this root |
| `ghost` | `export/4f3a83933e0ef9ef26a6838d5530324d98b9f183/ghost-wave` | 256 (all8) | 16 PASS | parent source directory `visual-review.json` + wave/distance `manifest.json` |
| `star` | `export/12fb2c6561e0f705c45b141cabdec590ff393d2a/star-wave` | 256 (all8) | 16 PASS | parent source directory `visual-review.json` + wave/distance `manifest.json` |
| `plush` | `fr5-mythic/3076d28-plush` | 256 (all8) | 16 PASS | `review.json` in this root |
| `unknown` | `export/8b6fcaee4af82dfe266fc4b08bdd56ae215b5275/unknown-wave` | 256 (all8) | 16 PASS | parent source directory `visual-review.json` + wave/distance `manifest.json` |
| `ren` | `fr1-human/2befff5` | 0 full | 16 PASS | C |

## Earlier acceptance records / provenance

- **A**: main QA `README.md` → “First family verification (source81b04e0)” and canonical progress → “FR-1 first family batch validated (source81b04e0)”. `fr1/evidence.json` source81b04e0758bca7018f39607bbcc8fb9cb8b280f9 records96 close views; `meguru/meguru-qa.json` records24 exact stage front/back shots. Canonical-emotion numerical tests are not image-state acceptance.
- **B**: main QA `README.md` → “Fish articulation evidence (048ebfd)” / “Fish checkpoint confirmed”, canonical progress → “Fish source048 evidence” / “Confirmed fish checkpoint”. `fr1-fish/evidence.json` source048ebfd5771da7e9080d37a1a99dda859769e886, `fr1-fish/meguru-048ebfd/meguru-qa.json` + `stage-validation.json`; recorded artifacts11297826213/11297403553. Preserve the clownfish05 notice limitation.
- **C**: canonical progress → “Human runtime promotion checkpoint” and `fr1-human/2befff5/README.md`; `evidence.json` source2befff5f07583999d629d85de816b5c346ff0226, plus `meguru/{man,woman,ren}/meguru-qa.json` and48 matching World JPEGs. All24 original/four-view/distance stages were recorded as reviewed; no corresponding all24-state image matrix is present.
- **D**: canonical progress → “Dandelion visual gate / runtime promotion” and main QA README → “Dandelion promotion”. Source99268a8079e581d6ade24892f0ec5ff069107ba0, `fr1-topology/99268a8/topology/evidence.json`, `distance/meguru-qa.json` +16 World images.
- **E**: canonical progress → “Butterfly promotion” and main QA README → “Butterfly promotion / remaining topology”. Sourced8e3b7648bf6381ec6be276df173b879427ed218; `fr1-topology/d8e3b76/butterfly/evidence.json`, `butterfly-distance/meguru-qa.json` +16 World images. The neighboring mushroom historical rejection evidence is not current mushroom acceptance.
- **F**: canonical progress → “Mushroom/starfish full16 runtime promotion” and main QA README → “Latest topology promotion”. Source3ce6f6ea37afd89d54551691708f3717dbd83cd4; `fr1-topology/3ce6f6e/geometry-evidence.json`, `{mushroom,starfish}-distance.json` +32 World images. Retain known softness/eye/proportion outliers for Human QA.
- **G**: `fr2-shell/b1087ac/README.md` is precise: all16 four-view/distance reviewed, only Turtle03/Frog03/05/07 motion representatives128cells. Sourceb1087ac98360aa129590e53c2f9885d57904b472; `geometry-evidence.json`, `motion/motion-evidence.json`, `{turtle,frog}-distance.json` +32 World images. Earlier f26 representative sheets were inspected; current b108 bundle supersedes interrupted unsaved uploads.
- **H**: `fr3-aquatic/64855b7/README.md` and canonical progress → “Coral full-eight visual gate and runtime promotion” (source648). `evidence.json`, `motion-evidence.json` and `coral-distance.json` source64855b78589e0b6170392e17ee60bf2a1106d144. Actual reviewed coral motions are only02/05/07/08, not all8.

Pilot supplement authority: `docs/character-3d/quality-pass-2026-10-02.md` specifies26stage five-emotion idle/walk protocol; `docs/qa/character-3d-quality3-2026-10-03/package-manifest.json` pins sourcecf7b787d1ca422a358216ff36c6c29d06a571dd4 and the26 `comparisons/<id>-<stage>-emotions-motion.jpg` boards. Its `comparisons/manifest.json` and `audit/visual-regression.json` record revision sampling and identity. `character-3d/gallery.html` uses `SPEC.PILOT_EMOTIONS` for this layout. No row for player cat, salmon, woman or ren exists in that26stage Pilot matrix. The five `gameplay-emotion-*` scene samples in older Meguru runs are fixed-cast shots, not five images for every species/stage.

## Final plan minimum and exact missing-stage route

`docs/character-3d/full-rollout-v0/plan.md`, FR-8, calls for every active row **five emotions ×idle/locomotion** (10 image cells), not a retroactive universal32-image matrix. Its canonical eight-emotion/reduced-motion requirements are separately expressed as tests. Existing accepted32-state family gates remain intact; do not downgrade them.

For248 player stages the minimum five×two image scope is2480 cells. The136 stages with reviewed32-state sets already cover1360 minimum cells. The prior26stage Pilot sample protocol supplies another260 cells if its recorded prior actual acceptance and source/current identity are carried forward; **86 stages /860 minimum cells remain**. If a Pilot stage lacks an actual prior acceptance record, keep that exact stage OPEN too; source existence or numerical hashes alone are not a new actual-view PASS. The fifteen table rows identify the remaining stage-specific scope rather than assigning a single family sample to every stage.

| Family | Missing five-emotion idle/locomotion stages | Required minimum cells | Existing additional distance images to actually review |
|---|---|---:|---|
| `dog` | 2, 3, 5, 6, 7 | 50 | 01–08 front/back (16); use scheduled final stage artifact |
| `cat` | 1, 2, 3, 4, 5, 6, 7, 8 | 80 | 01–08 front/back (16); use scheduled final stage artifact |
| `penguin` | 2, 3, 5, 6, 7 | 50 | 01–08 front/back (16); use scheduled final stage artifact |
| `salmon` | 1, 2, 3, 4, 5, 6, 7, 8 | 80 | 01–08 front/back (16); use scheduled final stage artifact |
| `clownfish` | 2, 3, 5, 6, 7 | 50 | 01–08 front/back (16); use scheduled final stage artifact |
| `man` | 2, 3, 5, 6, 7 | 50 | No extra source-gate capture; preserve prior16 reviewed views |
| `woman` | 1, 2, 3, 4, 5, 6, 7, 8 | 80 | No extra source-gate capture; preserve prior16 reviewed views |
| `ren` | 1, 2, 3, 4, 5, 6, 7, 8 | 80 | No extra source-gate capture; preserve prior16 reviewed views |
| `dandelion` | 2, 3, 5, 7 | 40 | No extra source-gate capture; preserve prior16 reviewed views |
| `butterfly` | 2, 3, 6, 7 | 40 | No extra source-gate capture; preserve prior16 reviewed views |
| `mushroom` | 2, 3, 5, 6, 7 | 50 | No extra source-gate capture; preserve prior16 reviewed views |
| `starfish` | 2, 3, 5, 6, 7 | 50 | No extra source-gate capture; preserve prior16 reviewed views |
| `turtle` | 1, 2, 4, 5, 6, 7, 8 | 70 | No extra source-gate capture; preserve prior16 reviewed views |
| `frog` | 1, 2, 4, 6, 8 | 50 | No extra source-gate capture; preserve prior16 reviewed views |
| `coral` | 1, 3, 4, 6 | 40 | No extra source-gate capture; preserve prior16 reviewed views |

Reusable existing motion command: `node tools/character-3d/wave-motion.cjs <source-specific-output> <comma-separated id:stage entries from the table>`, with exact `GITHUB_SHA`. This script already accepts arbitrary explicit player stage entries and validates id/stage/emotion/moving/reduced metadata. It always emits32cells+one sheet per selected stage; its86stage missing-only batch would produce2752 cells. It has no five-emotion-only flag, so do not pretend it emits only860, and do not invent a new capture framework. Review the required five×two cells at each selected stage; record any broader32-cell review only if actually performed. Reuse existing accepted four views. A universal canonical32 retrofit would be a different, larger scope: include partially sampled Pilot stages as needed; that is not the historical FR-8 minimum.

## What the final unscoped workflow already emits

Read `.github/workflows/character-3d-rollout.yml` at the current checkout. With no scoped `[qa:*]` marker, `stage-matrix` derives31 families and `stage-evidence` calls `meguru-qa.cjs --rollout --species-only --line <family>`: all248front/back pairs,496 images, artifacts `full-rollout-stages-<family>-<sourceSHA>`. `stage-coverage` merges only exact same-source, duplicate-free records and requires both saved images. This already supplies the80 early-family distance images that need actual review, including a newer clownfish05 capture after the real notice queue clears. **Do not launch separate duplicate distance captures for those families.** If identity/scene remains usable, old distance pictures can alternatively be reviewed directly, while retaining the recorded source048 notice obstruction.

| Existing job | Motion scope produced today | Missing-stage contribution |
|---|---|---|
| `wave-review` | Turtle03; Frog03/05/07 (128cells) | None; these representatives were already reviewed |
| `aquatic-wave-review` | Coral02/05/07/08; Jellyfish01–08 (384cells) | None; Coral01/03/04/06 remain omitted |
| `armored-wave-review` | Beetle/Stagbeetle/Cicada/Antlion/Hermit all8 (1280cells) | None; all five gates already accepted |
| `botanical-wave-review` | Sakura/Venus/WorldTree all8 (768cells) | None; all three gates already accepted |
| `mythic-wave-review` | Dragon/Phoenix/God/Ghost/Plush/Star/Unknown all8 (1792cells) | None; all seven gates already accepted |
| `meguru-wave` | Lifecycle/fallback/performance and five fixed-cast gameplay emotion snapshots | Does not cover the missing per-stage emotion/locomotion scope |

The unchanged workflow therefore emits the same136-stage /4352-cell full-matrix scope already represented by source-scoped accepted records. Its current `wave-review` also rerenders four views for early families, but still generates no corresponding all-stage motion batch. A green unscoped final run will **not by itself close the86 missing minimum-stage gates**. Controller must explicitly run the existing missing-stage motion selector (or minimally adapt its existing invocation later), retain source/hash provenance and actually inspect each required stage/state. Do not re-review or recapture Phoenix merely to fill unrelated missing stages.

## Preservation and packaging cautions

Phoenix **all8 remains PASS**: `export/fde2580dafec7691a13f94c71660cc3c8c43b52a/visual-review.json` explicitly records32views/256states/16distances,128 freshly inspected cells for04/05/06/08 plus128 previously reviewed cells verified through148 byte-identical wave images, all16 new distances inspected. Source run37870348699; artifacts11589911880/11590141387. No new Phoenix capture or model work is needed for this map.

Cicada05 uses corrected `56ad868` acceptance; do not reinstate its superseded normal-eye rejection from `d0b01eb/review.json`. Dragon04 uses `025d4bb-dragon`; other7 retain hash-verified `dragon-wing-root-20261008/stage-01.zip` through `stage-08.zip` acceptance. Export manifests remaining `PENDING_VISUAL_REVIEW` are transport manifests: the separate `visual-review.json` is the acceptance authority. Venus recovery carries explicit all8 acceptance but expressly does not claim byte-equivalent recovery of the lost former332-file bundle.

For final Human QA, preserve the reviewed four-view/distance/full-state gates and link each source-specific record. Report the older sample protocols and gaps explicitly. This audit does not reopen accepted Phoenix or other full-family gates, does not authorize recaptures, and does not turn numerical emotion tests or31-family stage aggregation into missing actual-image approval.

## Exact selector for implementation brief

This is the complete86-stage missing plan-minimum selector; no existing full-matrix or Pilot-five-emotion stage is included. Use these exact entries with the existing wave-motion positional selector. Per-family batches retain the same selector while keeping artifacts recoverable; no four-view or separate distance capture is needed.

```json
[
  "dog:2",
  "dog:3",
  "dog:5",
  "dog:6",
  "dog:7",
  "cat:1",
  "cat:2",
  "cat:3",
  "cat:4",
  "cat:5",
  "cat:6",
  "cat:7",
  "cat:8",
  "penguin:2",
  "penguin:3",
  "penguin:5",
  "penguin:6",
  "penguin:7",
  "salmon:1",
  "salmon:2",
  "salmon:3",
  "salmon:4",
  "salmon:5",
  "salmon:6",
  "salmon:7",
  "salmon:8",
  "clownfish:2",
  "clownfish:3",
  "clownfish:5",
  "clownfish:6",
  "clownfish:7",
  "man:2",
  "man:3",
  "man:5",
  "man:6",
  "man:7",
  "woman:1",
  "woman:2",
  "woman:3",
  "woman:4",
  "woman:5",
  "woman:6",
  "woman:7",
  "woman:8",
  "ren:1",
  "ren:2",
  "ren:3",
  "ren:4",
  "ren:5",
  "ren:6",
  "ren:7",
  "ren:8",
  "dandelion:2",
  "dandelion:3",
  "dandelion:5",
  "dandelion:7",
  "butterfly:2",
  "butterfly:3",
  "butterfly:6",
  "butterfly:7",
  "mushroom:2",
  "mushroom:3",
  "mushroom:5",
  "mushroom:6",
  "mushroom:7",
  "starfish:2",
  "starfish:3",
  "starfish:5",
  "starfish:6",
  "starfish:7",
  "turtle:1",
  "turtle:2",
  "turtle:4",
  "turtle:5",
  "turtle:6",
  "turtle:7",
  "turtle:8",
  "frog:1",
  "frog:2",
  "frog:4",
  "frog:6",
  "frog:8",
  "coral:1",
  "coral:3",
  "coral:4",
  "coral:6"
]
```

The existing31family `stage-evidence` matrix already runs `npm ci`, installs Playwright/Chromium, and uploads a source-specific family artifact. A narrow conditional wave-motion invocation for mapped missing entries in these existing family jobs is a reusable placement; it avoids adding15 separate browser/setup jobs and naturally splits by family. Preserve stage-coverage JSON parsing and raw distance records; give motion output a separate child directory. Existing15-minute family timeout must be checked against combined capture duration, not treated as automatically sufficient.

Proposed `[qa:integration]` execution risks to preserve in the implementation brief:

- The marker does not currently have special workflow behavior; implement its job gating narrowly, preserving ordinary unscoped and existing family-marker behavior. It must retain gallery, scene/lifecycle/performance, all31 functional stage-evidence shards/aggregate and dedicated regression. Skipping approved wave/candidate-distance/nonplayer recaptures is transport/work conservation, never a fresh actual-image PASS.
- Reuse is conditional on unchanged reviewed implementation/source identity. Retain source-specific image reviews/manifests and existing same-runtime Pilot/default/shared-factory preservation evidence. If a reviewed role actually changes, only its affected gate becomes fresh-image work. Broad final registration/scene/CI success cannot silently replace this identity condition.
- Avoid one giant86stage artifact. Existing exporter archive read/digest limit is64MiB and unpacked safety limit256MiB;2752 JPEG cells plus86contact sheets can exceed those limits. Use existing family/output/artifact splitting with the exact per-family subsets (at most8stages/256cells each), not a new evidence framework or larger weakened limits. This also bounds existing job timeout/recovery exposure.
- `wave-motion.cjs` asserts requested stage/emotion/moving/reduced and positive triangle count, but its current loop does not itself assert every returned `faceEmotions` value matches the requested emotion. Check owned-face coherence in the raw records and actual selected images; one actor's pass cannot stand in for all faces or all10required samples of a stage. Fixed-time stills do not prove a complete animation cycle.
- Raw32cell output is broader than historical plan10cell acceptance. Record precisely which cells are actually inspected. Uninspected additional states stay unapproved; final UI/report must not label them all32PASS merely because the sheet was generated.
- Final31stage-evidence supplies496 fresh normal-distance captures already. Inspect the missing80early-family images from those outputs; keep real scene/HUD and the notice-clear wait. Do not reuse the obstructed source048 clownfish05 image as an unobstructed final picture, and do not initiate a parallel duplicate distance capture.
