# Full Character 3D Rollout v0 — work in progress

This is a wave checkpoint, **not the completed Full Rollout Human QA package**.

## Current review surfaces

- `character-3d/full-gallery.html`: master inventory, exact/pending status, paged lazy original/four-view records. Species, kind, archetype and stage filters. Full emotion/motion evidence filters remain pending.
- `character-3d/gallery.html`: live reviewed Pilot + dog/cat/penguin/salmon/clownfish/man/woman/ren/dandelion/butterfly exact stages, canonical expressions and motion.
- `fr1/dog-stages.jpg`, `fr1/cat-stages.jpg`, `fr1/penguin-stages.jpg`: original + front / 3/4 / side / back, all eight stages. Originals are alpha-trimmed for comparable art footprints; PNGs themselves are unchanged.
- `fr1/evidence.json`: immutable renderer source `81b04e0758bca7018f39607bbcc8fb9cb8b280f9`, 96 views, triangles/draw calls. Three sheets plus 96 views = 99 saved images.

## Coverage

Fresh master: 31 player species / 248 stages, 26 companions, 18 partners, author 1 = 293 active designs. Supplemental Home eggs (3) and retired kinoko (1) remain inventoried, not revived as gameplay actors.

Current exact specs: **88/293** (86 player stages and 2 companions); **205 pending**. Added60 exact stages: dog +5, penguin +5, player cat +8, salmon +8, clownfish +5, man +5, woman +8, ren +8, dandelion +4, butterfly +4. Reused quadruped/avian/fish/humanoid/plant/larva/pod/winged_insect, no new archetype.80 current four-view records; historical Pilot images remain in the Pilot QA packages. `coverage.json` distinguishes spec availability from saved visual evidence.

## What changed in this batch

- Explicit original-derived stage proportions, coat colours, ear shapes, face mask, tail and poses.
- Reusable lifted paw and stretched play profiles release into walking, including reduced motion.
- Reusable left/right ear parameters, left/right wing pose, and wrapped tail path.
- Exact age lookup takes precedence for reviewed families; missing exact age cannot claim nearest-stage success.
- Existing Pilot dog/penguin 01/04/08 spec values preserved. Player cat does not replace cat_friend; role mismatches are rejected.

## Visual review / outlier candidates

Four-view review found and corrected weak feline ears/mask, missing asymmetric dog07 ears, one-sided penguin03 raised wing, and a canine bow on cat04. Third capture confirms level-torso stretched play. No new species model builder was introduced.

Remaining visual outlier candidates for full v0 Human QA: cat01/cat08 resting volumes are less tightly curled than the source; cat04 normal face uses the shared happy eyes rather than the source wink. These are not adoption decisions or Human A/B/C/D ratings. Pilot stages are preserved as reference rather than repeatedly redesigned.

## First family verification (source81b04e0) and limitations

- Local dedicated **62 PASS / 0 FAIL**, including 24 stages × eight canonical emotions × idle/walk × normal/reduced motion and real presenter reuse/cleanup.
- Rollout mutations **7/7 RED**. Existing 13+11+7+6 mechanisms remain in dedicated CI.
- Post-integration full npm: **2925 + Relationship 80 PASS / 0 FAIL**, Runtime CI 37183155273. Home CI 37183155268 succeeded on the same renderer source.
- CI 37183152163 all three jobs succeeded: dedicated/mutations, wave-review, Meguru/performance. All 24 requested stages exact/live, unintended fallback 0; player 120/120 frames; 2D↔3D cleanup and region return 8 holders = 8 live. Intentional fault injection isolated one actor while World/player/other companion remained 3D.
- `meguru/` contains 61 JPEG format conversions of CI PNG screenshots and unchanged raw QA JSON (its paths refer to the original CI artifact). The 24 stages have front/back World captures; normal-distance cat04 was visually inspected.
- `pilot-regression.json` confirms 28 reference targets have identical geometry attributes/index and bone transforms for all eight emotions × idle/walk × normal/reduced motion. This is Node numerical evidence, not a pixel comparison.
- FR-0 Home CI 37182066807 failed due to local CSS `route.fetch` ECONNRESET; later 37182460604 passed without Home/CSS changes. Preserve the failed run rather than relabel it green.
- Mobile gallery filters/navigation passed CI37184732914 on a 390×844 Chromium viewport. Public rawcdn host and actual iPhone checks remain unverified.
- Chromium / SwiftShader is **not iPhone Safari approval**. No iPhone performance, temperature, 27-actor interaction or long-play acceptance is claimed.

## Remaining work

Other exact Pilot stages and existing-family relatives; arthropod, tentacled, tree, object and luminous responsibilities evaluated from originals; relationship/author/hidden designs; full emotion/motion/cache/World boundaries; 1/5/27 full-native mix; final protected regression and CI; complete contact sheets/gallery/mobile preview. Stop only after complete v0 package for Human QA. No Ready, main merge, or automatic Quality Pass v1.

## Fixed-composition performance checkpoint

Chromium / SwiftShader, eight seconds, **separate CI runs**. The before column is saved Pilot v3. QA stand-ins remain necessary for unbuilt companions; this is not full-native rollout performance. World visibility changes draw calls. No statistical improvement claim.

| actors | Character triangles before → now | World calls | presenter CPU avg ms | JS heap MB | fallback now |
|---|---:|---:|---:|---:|---:|
| 1 | 4,062 → 4,062 | 41 → 39 | 0.615 → 0.957 | 19.3 → 19.3 | 0 |
| 5 | 19,144 → 19,144 | 85 → 85 | 2.226 → 2.701 | 19.3 → 19.3 | 0 |
| 27 | 106,403 → 106,403 | 236 → 255 | 4.844 → 5.555 | 23.1 → 23.1 | 0 |

27 actors: 1 shared Character material, 10 templates, 79 World textures, total build 513.7 ms / maximum build 83.1 ms; average frame 191.02 ms / p95 683.4 ms. CPU average is higher than the saved run and needs further controlled sampling; unchanged triangles/heap are not an iPhone pass. New family individual views range 2,300–4,262 triangles and 9–12 draws.

Separate animation CPU and isolated first-appearance hitch are **not measured yet**. Boot maximum frame/long task and build durations are saved but must not be renamed as that missing measurement. Full-native mix, cache long travel and iPhone remain open.

## Executor recovery

[RECOVERY_COMPLETE: all 61 World JPEGs and raw performance JSON saved from verified CI artifact]
The local exec server became unavailable during evidence upload. All 99 four-view/sheet images and the verified source are saved. CI recovery is copying the remaining World images and raw performance JSON from artifact 11296655081 into this Draft branch only. Recovery completed at c2bb41d. Working files were later restored by matching the latest remote blob/tree hashes; full rollout is unfinished.


## Fish integration checkpoint

- `fr1-fish/`: 64 four-view images +2 original comparison sheets, source048ebfd5771da7e9080d37a1a99dda859769e886 (CI37187842663, artifact11297826213); recaptured after the school articulation fix. Both species/all8stages visually inspected. Geometry unchanged during runtime promotion.
- Added yolk volume, rounded-head option, fork tail, local dorsal span, outward pectoral connections, head/back/tail colour regions, parr bars and bounded merged surface spots. Schooling is one gameplay actor with three face rigs; canonical semantics unchanged.
- Corrected pointed nose, oversized yolk, long dorsal, smeared spots and buried fins during representative review. Remaining candidate outliers: mature salmon07/08 facial/jaw character and silver-stage gill/fin detail; keep for full v0 Human QA, not automatic adoption.
- Local dedicated66 PASS/0FAIL; rollout7/7 RED and fish7/7 RED. A parr-band mutation initially survived because unrelated spots masked it; split assertions now detect both independently. Pilot28 geometry/pose hashes unchanged.
- Full npm/Runtime/Home, all40 exact Meguru stages, fixed-Pilot1/5/27 and additional fish-family1/5/27 CI are pending on the promoted source. New results must not inherit source81's PASS. Interrupted local npm is not evidence.
- All fish four-view body+face captures range recorded in fr1-fish/evidence.json. Schooling costs more than one fish and is included in the additional mixed-cast performance job. QA stand-ins are explicit; no full-native/iPhone claim.


### Rejected performance run — source374e12d
The fish-mix job37186931724 initially passed, but its template evidence contains dandelion08 stand-ins rather than the intended fish. Both new mix labels on that source are invalid due to QA boolean/string selection. Raw fish JSON is retained in `rejected/fish-mix-374e12d.json`; its embedded pass flag is the old insufficient verdict, **not accepted evidence**. An explicit setup/expected composition module and exact browser composition verdict replace that path. Corrected rerun is pending. This does not relabel the source81 baseline or change gameplay.

### Independent review
One concrete fish-wave issue was found and fixed: school tails/fins now reuse the actor's swim appendage motion with fixed phase offsets. RED reproduction showed six frozen bones; focused reviewer recheck11/11 PASS. Local dedicated68PASS and fish/QA10/10 removal cases detected. Latest articulation-source CI and school recapture pending.

`fr1-fish/checkpoints/performance-4990f62.json` is the corrected-composition **pre-articulation** sample (1/5/27 exact/live, fallback0); it must not be silently relabeled as the later source or compared as if identical to the Pilot cast. Actual iPhone and full-native mix remain unverified.

### Fish articulation evidence (048ebfd)
- Re-captured all64 views and two sheets; school appendages move and the three-face group silhouette remains intact. Normal-distance27-actor screenshot inspected. Fish performance artifact11298276441 saved under `fr1-fish/performance-048ebfd/`.
- Exact composition checks pass for1/5/27 actors, fallback0. This is the explicit fish-family **QA stand-in mix**, not full-native coverage.

| actors | Character tris | World calls | presenter avg ms | heap MB | templates | build total / max ms |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 2816 | 38 | .698 | 19.3 | 1 | 61.1 / 61.1 |
| 5 | 16792 | 73 | 3.016 | 20.5 | 5 | 223.3 / 59.1 |
| 27 | 108316 | 322 | 5.219 | 23.1 | 7 | 489.8 / 155.1 |

One Character material; World textures17/29/74. Geometry and heap for27 remain unchanged from pre-articulation4990f62; CPU4.954→5.219ms and World calls289→322 are separate CI samples, with moving actors/World visibility. No statistically controlled performance improvement or iPhone acceptance is claimed. Separate animation CPU/first-appearance hitch remain NOT_MEASURED.

- Source048 dedicated/wave-review/fish-performance/conflict-audit CI jobs succeeded; full Runtime/Home and all40-stage Meguru job still pending at08:17UTC.
- Home37186935255(source374) failed at `chromium-landscape-safe-area`: CSS route.fetch ECONNRESET for movie.css/home-care-colors.css/pet-expression.css. Later Home37187432209(source4990) succeeded without Home/CSS changes. Do not rewrite the earlier failure or claim a base reproduction.
- Fresh read-only audit source048: main0b0a6b3 mechanically clean; #367/369/371/374 conflicts retained, semantic integration unverified.

### Human representative work (not promoted)
Original-derived man02/06 candidates exercise shared overalls/short sleeves/short trousers/socks, idle arm spread that releases into walk, tie, and a briefcase parented at the actual hand. Local dedicated70PASS and unchanged Pilot28 numerical hashes. Candidate visual CI pending; no additional coverage. Remaining woman/ren representatives and other stages must pass original/four-view and normal-distance review before promotion. Ground toy-car detail in man02 is not yet represented.

Human initial representative captures: `fr1-human/`, source7e0b104 / CI37188558261. Review found interrupted rear straps and closed foot stance; latest candidate corrects those shared parameters and raises toddler arms. Images here precede those corrections until re-capture; no visual-complete or runtime-coverage claim. Human mechanism mutations now5/5RED. Source048 Home CI37187846343 succeeded; full Runtime/Meguru still pending.

### Fish checkpoint confirmed on source048ebfd
Runtime37187846342 completed: full npm2931 +Relationship80PASS,0FAIL. Home37187846343 and all Character jobs37187842663 succeeded. All40 exact stages have live3D, no fallback and front/back captures; raw JSON was additionally checked against exact inventory keys locally.32 fish World JPEG conversions and raw all40-stage/lifecycle data are saved in `fr1-fish/meguru-048ebfd/` (original PNGs in artifact11297403553). The clownfish05 normal-distance source screenshot has a temporary discovery notice overlapping the lower school member; this is recorded as capture obstruction, not absence. Subsequent stage QA waits for the real notice queue to settle without modifying World/UI.

Fixed-Pilot mix at048:1/5/27 tris4062/19144/106403; calls45/85/255; presenteravg .748/2.758/5.464ms; heap19.3/19.3/23.1MB; fallback0 and exact composition. Keep this separate from the fish-family mix. Pilotv3 saved27 baseline106403tris/4.844ms/23.1MB is retained; separate CI sampling is not iPhone acceptance.

Human corrected sourcec375a3b / artifact11297503285: all8 representative views and sheet replaced with the recapture. Rear straps, higher toddler arms and separated feet confirmed; wardrobe and case grip remain intact. Candidate-only, no new runtime coverage. Dedicated/wave-review CI succeeded; latest full regression still pending.

Stage QA is now inventory-driven per-family CI with same-source aggregation requiring all exact keys, no duplicates, no fallback and existing front/back images. Lifecycle and fixed performance run separately. This avoids a growing monolithic40+stage job. Local dedicated71PASS; rollout9/9RED including completeness/source mutations. New matrix CI has not yet run at this checkpoint.

## Human batch

`fr1-human/2befff5/`: all24 original/four-view comparisons,96 views +3 sheets, source2befff5f07583999d629d85de816b5c346ff0226. Existing man01/04/08 remain unchanged. Representative ordinary-distance evidence atf526 and all24 sourceeda captures confirmed exact/live and fallback0; latest corrected source/runtime CI pending.

Shared wardrobe, hair, hat boundary, one/both-hand secondary attachments, neutral per-eye profile, articulated seated pose and support geometry. The chair is presentation-only, scales out as existing locomotion blends in. Held pet uses one merged secondary body draw and the same canonical emotion adapter.

Known visual candidates: mature age impression, woman06 hair softness, held plush likeness and woman02 free-arm angle. Known model-cost outliers: woman08 (seated figure/chair/cat)10137tri/18draws, woman02 (plush)9050/14 at close view. Human-family1/5/27 mix is required; existing fish/Pilot numbers do not stand in for these models. iPhone NOT_RUN.

### Dandelion promotion / butterfly emergence candidate
- `fr1-topology/99268a8/`: all8 dandelion original/four-view comparison,32 views,16 normal-distance images and raw exact/live/fallback0 JSON. New02/03/05/07 promote unchanged after image review; runtime84/293,72 saved four-view records. Promoted-source72-stage matrix remains pending.
- Butterfly06 now has an optional open empty pupa shell beside the emerging butterfly, bounded separate fore/hind wing proportions and one canonical face. Casing/branch is a presentation attachment, not a second gameplay actor or World item. Unpromoted pending four-view and normal-distance images.
- Local dedicated93PASS/0FAIL, Pilot28 numerical geometry/pose hashes unchanged. Emergence4/4RED; latest promotion mutation result in progress log. Final full v0 and iPhone not complete.

### Butterfly promotion / remaining topology representatives
- `fr1-topology/d8e3b76/butterfly/` contains the current all8 butterfly32views and original comparison. Raw normal-distance8 exact/live/fallback0 +16World images saved alongside. Added4 exact stages; runtime88/293,80saved four-view records. Next promoted80-stage aggregate is pending.
- Fungus02/03/06 historical images in the same source folder exposed cap-face/underside issues, now fixed for recapture. Starfish02/03 representatives are unpromoted and image/distance QA pending. No increase in coverage for those candidates.
- Local dedicated104PASS/0FAIL; rollout12RED, fungus8RED, starfish4RED; Pilot28 numerical geometry/pose hashes identical. Source203 Runtime/Home/Character allSUCCESS. Latest source CI remains separate.
