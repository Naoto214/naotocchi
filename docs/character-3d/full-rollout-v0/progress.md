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

### FR-1 integration validation checkpoint
- Corrected source `732f587` / tree `a575e952ac7a132f9a92d894884c465ab8143330`: four-view CI 37182744172 success; 96 views inspected. Cat face/ears, dog07 asymmetric ears, penguin03 both raised wings now represented. Cat04 was still using a canine bow, so replaced with a reusable level-torso extended-play pose; next CI verifies that final change.
- Exact rollout registry now connects dog/cat/penguin all eight stages to real template/presenter and live gallery. Immutable Pilot definitions and all six existing dog/penguin reference stage values preserved. Exact candidate additions = 18; total exact spec availability = 46/293 active rows (includes 26 Pilot stages + 2 companions). This is not full visual/World acceptance.
- Role lookup rejects player cat as companion and companion cat_friend as partner. Unsupported exact rollout age returns null rather than nearest-stage substitution.
- Local dedicated 62 PASS; rollout mutation 7/7 RED. Added CI Meguru wave traversal (24 exact player stages) plus existing lifecycle/fallback and fixed Pilot-composition 1/5/27 measurements. Performance uses explicit QA stand-ins until all relationship characters exist; never claim that as full native coverage.
- FR-0 Runtime CI 37182066777 success. Home CI 37182066807 FAILED: chromium-landscape-safe-area route.fetch ECONNRESET fetching item-memories.css, movie.css, home-care-colors.css at 144 ms. FR-0 changed no app/Home/CSS code; transport failure is suspected, base reproduction not yet executed. Later Home runs still pending. Do not call this GREEN.
- No Home/World production fix made to hide the failure. iPhone remains NOT_RUN.

### FR-1 first family batch validated (source 81b04e0)
- 24 exact stages (dog/cat/penguin), 18 newly added; total exact availability 46/293. Remaining 247. No new archetype; 3 visual outlier candidates (cat01/08 curl compactness, cat04 wink fidelity), no adoption rating.
- 99 original/four-view image records + 61 Meguru JPEG captures; complete source and raw evidence under docs/qa/character-3d-full-v0/. Pilot 28-target geometry/pose hashes unchanged.
- Dedicated 62 PASS, old mutation groups 13/13 + 11/11 + 7/7 + 6/6 RED, rollout 7/7 RED. CI 37183152163 all jobs success. Runtime 37183155273 (2925+80 PASS/0 FAIL) and Home 37183155268 success. Earlier CSS ECONNRESET retained in history, no Home/CSS changes used to obtain success.
- Meguru 24 exact/live stages; unintentional fallback 0. 1/5/27 live counts correct, fallback 0. Fixed old-Pilot mix tris 4062/19144/106403 unchanged; CPU .957/2.701/5.555 ms; heap 19.3/19.3/23.1 MB. Separate-run comparison, not full-native/iPhone acceptance. Separate animation CPU and isolated appearance hitch still missing.
- Fresh main remains 0b0a6b3. #372 remains d12ad70 open Draft. Terrain progressed to 7fda832: four mechanical conflict files retained; new veranda presentation was read-only audited. No other lane merged.
- Remaining within FR-1: man/clownfish/butterfly/dandelion/mushroom/starfish exact gaps, then original-derived existing-family relatives. Next exact step: salmon and missing clownfish source strips → representative yolk/slender fish/jaw/marking/schooling mechanisms → visual QA → batch remaining fish stages; do not fill stages by interpolation or clone/recolour. New topology stays assigned to later family waves.
- Continue ordinary work without new Human approval. This checkpoint is not full v0 completion and not the final Human QA stop. No Ready/main merge/v1.

## Execution environment interruption

[RECOVERY_COMPLETE: all 61 World JPEGs and raw performance JSON saved from verified CI artifact]
Local exec-server stopped accepting commands with `No such file or directory`. GitHub remained available. Dedicated source 81b04e0 and all CI checks are complete. Recovery workflow saves all verified World evidence to this Draft branch; it does not change models, main, #372, or adoption status. Resume ordinary FR-1 fish/existing-family work from fresh remote after a working executor is available. Full v0 is not complete; this is an infrastructure checkpoint, not the final Human QA stop.

### FR-1 fish representative checkpoint (not promoted)
- Recovered working tree from exact remote c2bb41d/tree46d5e04; local existing object reuse was hash-verified. Original assets match remote. Historical QA images are sparse locally and remain saved on GitHub.
- Next family originals inspected: salmon01 yolk /03 parr bars /07 red body, olive head and hooked jaw; clownfish05 parent and two small school members. Implemented these representatives in a separate fish-spec candidate module; no new runtime coverage claimed.
- Shared fish parameters add yolk volume, lateral markings/back/head colour fields, forked tail contour, softly curved jaw volume and a school attachment with independently addressable faces. No new archetype, textures, actor state, gameplay or emotion semantics.
- Representative tests first RED (missing candidate module), then 2 PASS; removal mutations 5/5 RED. Pilot 28-target numeric geometry/pose hashes still identical to the saved Pilot baseline. Dedicated suite 64 PASS/0 FAIL after restoring the missing historical Claude source fixture (initial sparse-checkout run failed only because that fixture was absent).
- Local Chromium render failed before page load: socket() Operation not permitted. This is an execution-environment limitation, not a visual pass. CI renders the seven available fish candidate/reference stages in four views; inspect those artifacts before filling remaining fish stages or promoting them.
- Exact runtime availability remains46/293;247 pending. Full npm / candidate CI pending at this checkpoint. iPhone NOT_RUN. No Ready/merge/v1.

### Fish representative visual correction
- Source e2db5bd, CI37185762824 wave-review and dedicated successful; artifact11296947716 inspected. No runtime promotion yet.
- Visual defects found: salmon nose too pointed, yolk too large, dorsal fin too long, vertex-noise flecks became streaks. Corrected through optional rounded-head profile, smaller original-derived yolk, parameterized dorsal span and 6-triangle surface spots merged into the existing body draw (no texture or new draw per spot). Small school members retain round neutral eyes rather than copying the parent happy-eye pose.
- Fish tests2PASS initially, but parr-mark removal then survived because unrelated spot-count changes masked its absence. Split the test into a bars-only colour comparison and a separate bounded spot-geometry assertion; re-run the six mutations before claiming detection. Re-capture is required before remaining stage expansion. No Pilot shape changed by the optional parameters.
- Corrected fish verification:64 dedicated PASS/0FAIL;6/6 fish mutations RED after isolating the parr-band assertion. Local full npm stopped because its long run overlapped source-mutation work; do not use that interrupted run as evidence. Immutable-commit Runtime CI remains the full-regression source.

### Fish stage batch awaiting complete visual review
- Corrected representative source9d86c70 / artifact11296688918: head volume, smaller yolk, shorter dorsal span and bounded speckles inspected in four views. Clownfish05 three faces and group silhouette present. Mature salmon face/jaw fidelity remains a Human-QA outlier candidate; no adoption verdict.
- Expanded explicit original-derived candidate data to salmon01–08 and clownfish01–08; original Pilot clownfish01/04/08 unchanged. Optional outward pectoral spread corrects a newly observed buried-fin connection for rollout candidates without changing the Pilot reference shapes. Salmon01 grey tail retained separately from its pink fins.
- Fish mutations7/7 RED; all16 candidate stages finite, swimHover retained, no identical adjacent body parameters. Still not promoted to runtime; coverage46/293, pending247 until full-batch visual review and integration.

### Fish batch runtime promotion
- Source88888c0 four-view CI37186326551/artifact11296838939: all16 salmon/clownfish stages inspected; pectoral silhouette now reads outside the flank. Preserve mature salmon face/jaw and silver-stage gill/fin nuance as outlier candidates for full v0 QA.
- Exact runtime coverage59/293 (+13 since prior batch),234 pending;40 current four-view records. Reused fish builder, no new archetype. Pilot clownfish01/04/08 and all28 reference numerical geometry/pose hashes unchanged.
- Runtime exact-template test first RED for missing salmon, then dedicated66 PASS. All40 promoted stages tested across canonical emotions, idle/walk and reduced motion; all faces in a school checked individually. Rollout7/7 and fish7/7 mutation RED.
- Added separate fish-family1/5/27 QA mix to avoid presenting unchanged Pilot composition as new-family performance. Fish mix uses explicit QA stand-ins for unbuilt companion roles; not full-native or iPhone acceptance. CI normal-distance/all40stage integration and both performance mixes still pending.
- Next after CI evidence: finish remaining existing Pilot stage gaps (human/plant/insect/fungus/radial), then new family responsibilities and relationship/author coverage according to plan. Continue ordinary authorized work; this is not the final Human QA stop.

### Performance composition defect (QA only; results rejected)
- Source374e12d fish-performance CI reported success, but raw templatesByActor proved that all unbuilt companion stand-ins were dandelion08 (a truthy string was passed to the old puff boolean selector). This also invalidates the fixed-Pilot composition results from this source. Do not use either as fish/fixed-Pilot performance.
- Replaced boolean/string interpretation with an explicit QA composition module shared by setup and expected template counts. Added RED→GREEN dedicated test rejecting the exact mislabeled result; browser verdict now requires exact actual/expected template composition, not actor count alone. Re-measure both mixes before publishing numbers.
- Original actor/game state and presentation code are unchanged by this QA fix.

### Independent fish review and subrig articulation fix
- Read-only reviewer at4990f62 found one Important issue: school fins/tails were grafted under prefixes but only the main fish appendages animated. Six school appendage deltas stayed0 during moving/reduced motion.
- Reproduced RED, then reused the existing swim appendage equations for registered presentation subrigs with fixed phase offsets, same actor animation state, and no duplicated root hover. Focused reviewer recheck11/11 PASS, no remaining Important defect in this wave's reviewed scope. This is not merge or aesthetic acceptance.
- Local dedicated68PASS; fish/QA mutations10/10 RED; Pilot28 numerical shape/pose hashes unchanged. Updated source still needs immutable CI performance and recaptured school images.
- Corrected pre-articulation fish composition at4990f62 succeeded:1/5/27 live and exact template composition, fallback0; character tris2816/16792/108316, World calls40/74/289, presenteravg .812/2.996/4.954ms, heap18.2/20.5/23.1MB. Saved raw checkpointJSON. These are a different composition from Pilot baseline and predate the articulation fix; not an improvement claim or iPhone pass.
- Fresh CI read-only conflict audit at4990f62: main0b0a6b3 clean; #367(index.html), #369/#371/#374(index.html, meguru-3d.mjs, meguru.js, package.json) conflict. Heads unchanged; no other lane merged. Semantic visibility/ground-contact/occlusion/emotion-motion ownership/lifecycle integration still unverified for those open lanes.

### Fish source048 evidence and human representative start
- Recapture64 views/two sheets and corrected-composition fish1/5/27 evidence saved. Live1/5/27, fallback0; tris2816/16792/108316; World calls38/73/322; presenteravg .698/3.016/5.219ms; heap19.3/20.5/23.1MB. Explicit QA stand-ins, not full-native/iPhone acceptance. Actual school articulation and normal-distance screenshot inspected. Latest dedicated/wave/fish-perf/conflict jobs succeeded; Runtime/Home/Meguru pending at08:17UTC.
- Home374 failed on CSS route.fetch ECONNRESET, later4990 Home passed with no Home/CSS change. Record as intermittent transport observation, not a proven base reproduction.
- Human original analysis led to man02/06 shared wardrobe/pose/hand-prop representative candidates. Tests initially RED for absent candidates, then70 dedicated PASS. The first sleeve mutation survived a weak colour-count test because hand skin masked forearm absence; replaced with bounded forearm/calf region assertions. Held-prop assertion compares parent identity without formatting entire cyclic scene graphs. Corrected mutation rerun4/4RED; exact source bytes restored.
- Pilot28 shape/pose hashes remain identical. Candidate image CI pending; no runtime promotion; coverage remains59/293,234 pending. man02 ground toy not yet represented. Next: inspect representative images and fix silhouette/clothes/grip, then woman04/08 and ren03/05 shared hair/skirt/seated/held-object responsibilities, then full24-human batch. No gameplay, save, canonical emotion, World or Home changes.
