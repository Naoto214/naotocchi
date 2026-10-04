# Full Character 3D Rollout v0 — work in progress

This is a wave checkpoint, **not the completed Full Rollout Human QA package**.

## Current review surfaces

- `character-3d/full-gallery.html`: master inventory, exact/pending status, paged lazy original/four-view records. Species, kind, archetype and stage filters. Full emotion/motion evidence filters remain pending.
- `character-3d/gallery.html`: live reviewed Pilot + dog/cat/penguin exact stages, canonical expressions and motion.
- `fr1/dog-stages.jpg`, `fr1/cat-stages.jpg`, `fr1/penguin-stages.jpg`: original + front / 3/4 / side / back, all eight stages. Originals are alpha-trimmed for comparable art footprints; PNGs themselves are unchanged.
- `fr1/evidence.json`: immutable renderer source `81b04e0758bca7018f39607bbcc8fb9cb8b280f9`, 96 views, triangles/draw calls. Three sheets plus 96 views = 99 saved images.

## Coverage

Fresh master: 31 player species / 248 stages, 26 companions, 18 partners, author 1 = 293 active designs. Supplemental Home eggs (3) and retired kinoko (1) remain inventoried, not revived as gameplay actors.

Current exact specs: **46/293** (44 player stages and 2 companions); **247 pending**. Added 18 exact stages: dog +5, penguin +5, player cat +8. Reused quadruped/avian, no new archetype. 24 current four-view records; historical Pilot images remain in the Pilot QA packages. `coverage.json` distinguishes spec availability from saved visual evidence.

## What changed in this batch

- Explicit original-derived stage proportions, coat colours, ear shapes, face mask, tail and poses.
- Reusable lifted paw and stretched play profiles release into walking, including reduced motion.
- Reusable left/right ear parameters, left/right wing pose, and wrapped tail path.
- Exact age lookup takes precedence for reviewed families; missing exact age cannot claim nearest-stage success.
- Existing Pilot dog/penguin 01/04/08 spec values preserved. Player cat does not replace cat_friend; role mismatches are rejected.

## Visual review / outlier candidates

Four-view review found and corrected weak feline ears/mask, missing asymmetric dog07 ears, one-sided penguin03 raised wing, and a canine bow on cat04. Third capture confirms level-torso stretched play. No new species model builder was introduced.

Remaining visual outlier candidates for full v0 Human QA: cat01/cat08 resting volumes are less tightly curled than the source; cat04 normal face uses the shared happy eyes rather than the source wink. These are not adoption decisions or Human A/B/C/D ratings. Pilot stages are preserved as reference rather than repeatedly redesigned.

## Verification and limitations

- Local dedicated **62 PASS / 0 FAIL**, including 24 stages × eight canonical emotions × idle/walk × normal/reduced motion and real presenter reuse/cleanup.
- Rollout mutations **7/7 RED**. Existing 13+11+7+6 mechanisms remain in dedicated CI.
- Post-integration full npm: **2925 + Relationship 80 PASS / 0 FAIL**, Runtime CI 37183155273. Home CI 37183155268 succeeded on the same renderer source.
- CI 37183152163 all three jobs succeeded: dedicated/mutations, wave-review, Meguru/performance. All 24 requested stages exact/live, unintended fallback 0; player 120/120 frames; 2D↔3D cleanup and region return 8 holders = 8 live. Intentional fault injection isolated one actor while World/player/other companion remained 3D.
- `meguru/` contains 61 JPEG format conversions of CI PNG screenshots and unchanged raw QA JSON (its paths refer to the original CI artifact). The 24 stages have front/back World captures; normal-distance cat04 was visually inspected.
- `pilot-regression.json` confirms 28 reference targets have identical geometry attributes/index and bone transforms for all eight emotions × idle/walk × normal/reduced motion. This is Node numerical evidence, not a pixel comparison.
- FR-0 Home CI 37182066807 failed due to local CSS `route.fetch` ECONNRESET; later 37182460604 passed without Home/CSS changes. Preserve the failed run rather than relabel it green.
- Gallery UI and rawcdn host verification pending until this checkpoint is published.
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
The local exec server became unavailable during evidence upload. All 99 four-view/sheet images and the verified source are saved. CI recovery is copying the remaining World images and raw performance JSON from artifact 11296655081 into this Draft branch only. The implementation remains 46/293 exact specs; full rollout is unfinished.
