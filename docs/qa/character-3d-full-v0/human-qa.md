# Full Rollout v0 — Human / iPhone QA

Status: **Human / iPhone OPEN. All293 model image gates and source-scoped automated integration are verified.** Only the two explicit repair approvals below are accepted; the remaining Human and device gates stay open. Draft PR376 stays based on the Pilot branch. No Ready/main merge, PR372 changes or automatic v1 work.

Use the final source/tree recorded in the [checkpoint](../../character-3d/full-rollout-v0/checkpoint.json), with the matching [evidence map](../../character-3d/full-rollout-v0/final-player-evidence-map.md) and source-specific export manifests. Historical Pilot URLs and performance numbers are references, not current measurements.

## 2026-10-12 — current main first

World completion is not required for Character merge. Do not import World Draft. [Current technical resolution and iPhone procedure](premerge-20261012/README.md) supersedes prior combinedWorld prerequisite. Actual iPhone display/movement/expression/regions/fallback/27-actor performance remain NOT_RUN.

## Current completion policy — revised 2026-10-11

The user accepts overall shape quality. Fine Human QA of all293 is **not a pre-merge requirement**. Minor geometry, expression and motion refinements, including the three static triage candidates, may follow in a Quality Pass. This is not a fabricated individual293 PASS. Approved Naoto and deer remain frozen.

Before requesting final approval, verify latest-main conflicts, World3D / Resident Expression / Motion semantics, save/schema protection, existing2D toggle and fallback, actor cleanup and absence of disappearing characters, plus **actual physical iPhone basic operation and27-native-actor performance**. Integration work proceeds without waiting for detailed art review. Source-specific automated evidence does not establish physical-device PASS.

Report final technical results and unresolved issues, then wait for explicit Ready/main-merge approval. PR376 remains Draft/unmerged; main and Pages are unchanged. [Acceptance plan](../../character-3d/full-rollout-v0/final-acceptance-plan.md) / [device record](batch-human-qa-20261011/iphone-device-record.json).

## Current Human approvals — 2026-10-11

The user formally approved **Naoto E plus side layers** (including the seven-three part, fringe direction and temple-to-rear continuity) and reconfirmed **deer legs**. The exact captured Naoto row is adopted without redesign; deer is unchanged. Naoto hair is frozen unless a confirmed defect is identified. [Machine-readable decisions](human-approvals-20261011.json) / [approved comparison](author-side-layer-20261011/README.md).

| Target | Approved scope | Remaining gate |
|---|---|---|
| `author:naoto` | Current E plus side-layer hairstyle | Continuous motion/gameplay and actual iPhone QA |
| `partner:grove_deer` | Corrected leg proportions, taper and joints | Continuous motion/gameplay and actual iPhone QA |
| Other 291 characters | Overall quality accepted; no individual signoff asserted | Minor visual refinements in post-merge Quality Pass; technical safety before merge |

Continue through the existing gallery: player families (248 stages), companions (26), and remaining partners (17). Filter by family/kind and follow each live link. Record the exact key/stage, view or motion condition, approve/reject/requested change and a screenshot where useful. Review known approved repairs only if a concrete defect appears. Numerical coverage and automated tests are not Human acceptance.

Actual iPhone Safari QA remains **OPEN / NOT_RUN**. Record device/iOS, source SHA and matched 3D/2D fixture, then initial display, continuous motion, ordinary distance, repeated transitions and sustained play. No development PC or Pages/main setting change is required.

## Current commit-pinned iPhone preview — approved shape

Source `00a83a4c6847bc2b6609fd42e413561973c91830`, tree `c0f2db50c2638d217aa4878dc5b44248622c4731`. Remote/local HEAD and tree matched with a clean worktree after the implementation save. These URLs include the exact approved Naoto shape in production and the approved four-view images in Full Gallery. The following documentation save changes no preview inputs.

- [Full Character 3D Gallery](https://rawcdn.githack.com/Naoto214/naotocchi/00a83a4c6847bc2b6609fd42e413561973c91830/character-3d/full-gallery.html)
- [Live 3D Gallery](https://rawcdn.githack.com/Naoto214/naotocchi/00a83a4c6847bc2b6609fd42e413561973c91830/character-3d/gallery.html)
- [Approved Naoto](https://rawcdn.githack.com/Naoto214/naotocchi/00a83a4c6847bc2b6609fd42e413561973c91830/character-3d/gallery.html?id=author%3Anaoto)
- [Meguru Character 3D](https://rawcdn.githack.com/Naoto214/naotocchi/00a83a4c6847bc2b6609fd42e413561973c91830/index.html?meguru3d=1&char3d=1&perf=1)
- [Same-condition 2D comparison](https://rawcdn.githack.com/Naoto214/naotocchi/00a83a4c6847bc2b6609fd42e413561973c91830/index.html?meguru3d=1&perf=1)

These links reuse the existing Pilot rawcdn delivery. **Actual iPhone display/motion/performance is NOT_RUN**, and no new browser-rendering PASS is inferred from URL construction. The cloud-browser checks in the historical section below belong only to the old source.

Open in iPhone Safari using a separate QA profile; the host may show an “Open the page” notice. Commit paths share an origin and may share saves. For Meguru 3D/2D comparison, use the same QA profile and matched save/region/camera/actor composition, opening the games sequentially. No development PC, Pages deployment or main change is required.

Record the device/iOS and source SHA with feedback. Start with the remaining gallery entries; use the live view for motion and ordinary-distance Meguru for readability. Keep 1/5/27-actor performance, repeated transitions and sustained-play results unpassed until measured on the device.

## Historical source-specific handoff

Production models: `0be70751e0896388e46a33969bef51c15dcdb3ae`. Final QA corrections: `410edf9674d5937496e7acd0f255c98de11fc399`. Final documentation/archive commits preserve these inputs. The four formerly pending Runtime/Home runs are confirmed SUCCESS;410 full npm CI passed3022+80 tests with0failures. The workspace was restored from remote with HEAD/tree equality, clean state and final scene archive SHA256 verification; see the checkpoint.

| Evidence | Scope |
|---|---|
|[Player evidence map](../../character-3d/full-rollout-v0/final-player-evidence-map.md)|248stages:222 full32-state stages +26 narrower acceptedPilot stages; all planned image gates complete|
|[Latest replacement images](export/0be70751e0896388e46a33969bef51c15dcdb3ae/mushroom6-collar/README.md) / [review](export/0be70751e0896388e46a33969bef51c15dcdb3ae/reviews/player-motion-repair-mushroom6-collar-review.md)|Mushroom06 forehead/collar issue resolved,4views/32states/2distance|
|[Browser data review](export/ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f/reviews/integration-data-review.md)|248exact registration and45role gallery; native human/fish fixture measurements|
|[Final scene audit](export/410edf9674d5937496e7acd0f255c98de11fc399/final-scene-review.md)|Actual410 PASS:38boundaries,3strict cycles,cleanup/cache/composition/restoration|
|[Native metrics](export/f07fef280059b41e6ab22c2475b0cc5fd3c7c9ca/reviews/f07-scene-native-review.md)|dog04+nativecompanions1/5/27; frame/presenter/build/heap, clone animate and appearance windows|
|[Protected proof](final-protected-verification/result.json)|11protected groups +28Pilot identities exact|
|[npm attempt and repair](final-npm-0be/result.json) / [completed CI](closure-verification.json)|Original local exit1 retained; subsequent410 full npm CI3022+80PASS/0FAIL|

SwiftShader27cast measured204.83ms average RAF/533.4ms p95 and816.6ms maximum adjacent-frame appearance window. These are limitations, not smooth-frame/device PASS. Clone animation timing excludes rendering and other presenter work. Static sampled sheets do not approve continuous animation.

## Review surfaces

- [Full gallery](../../../character-3d/full-gallery.html):293 exact entries, original/four-view comparisons, family/kind/stage filters and role-correct live links. Legacy cat_friend/shiba use the explicitly labelled immutable comparison board.
- [Live gallery](../../../character-3d/gallery.html): inspect continuous motion, canonical emotion, reaction and reduced motion. Static32-state sheets do not by themselves approve continuous animation.
- Existing Meguru QA route: `index.html?meguru3d=1&char3d=1&perf=1`; compare the same saved fixture with `index.html?meguru3d=1&perf=1`. Use a separate QA browser profile/origin and the existing QA fixtures. Do not overwrite a personal gameplay save.
- Use the commit-pinned rawcdn links below directly in iPhone Safari. Actual device rendering remains unverified until observed; no development PC is required.

## Human review and device handoff

### Historical iPhone preview and cloud delivery check (2026-10-10; superseded links)

Fresh remote source: `41441d94b74a6889dfb53e58420e2796ea0da844`, tree `5ed672ba0e62613dbb280338260c1461e04dc5c4`. PR376 was open, Draft, unmerged, based on `feat/character-3d-pilot`. Reuse the Pilot rawcdn.githack.com delivery documented in `docs/qa/character-3d-quality3-2026-10-03.md`; no deployment, Pages setting, main or runtime change is needed. These links remain pinned to this reviewed source even after this documentation update.

- [Full Character 3D Gallery — all293 / original and four views](https://rawcdn.githack.com/Naoto214/naotocchi/41441d94b74a6889dfb53e58420e2796ea0da844/character-3d/full-gallery.html)
- [Live 3D Gallery — motion and emotions](https://rawcdn.githack.com/Naoto214/naotocchi/41441d94b74a6889dfb53e58420e2796ea0da844/character-3d/gallery.html)
- [Meguru with Character 3D](https://rawcdn.githack.com/Naoto214/naotocchi/41441d94b74a6889dfb53e58420e2796ea0da844/index.html?meguru3d=1&char3d=1&perf=1)
- [Same world with 2D character billboards](https://rawcdn.githack.com/Naoto214/naotocchi/41441d94b74a6889dfb53e58420e2796ea0da844/index.html?meguru3d=1&perf=1)

Open in iPhone Safari. The host may first show a third-party-content notice with an **Open the page** button. Full Gallery supports family/kind/stage filters; follow each entry's live link. The live page retains its historical Pilot title but its source includes the Full Rollout roster. The comparison link disables Character 3D only, not the 3D world. Test in forest where this branch enables the 3D renderer; this does not integrate the separate World PR374.

Use a separate Safari profile for QA: paths/commit SHAs on rawcdn share the same origin and can share saves with older Pilot previews. Main-site saves are not automatically imported. A fresh QA profile starts at the egg, not a pre-populated Meguru test fixture; no save is injected by these URLs. Open the game comparison links sequentially in the same QA profile, not as simultaneously running games, and keep actor/region/camera conditions matched. This is an entry-point handoff, not completed 1/5/27-actor device QA.

Cloud-browser verification: Full Gallery loaded `293 / exact293 / pending0 / four-view293`; Phoenix filtering returned all8 stages with live links. Both game links rendered the initial game UI. Live Gallery HTML and vendored Three.js were delivered, but this cloud browser reports `GL_RENDERER=Disabled` / WebGL context creation failure, so no live 3D rendering or device performance PASS is claimed. A terminal HEAD request returned403; it was not retried, and browser delivery was checked separately. Actual iPhone Safari display, motion, sustained performance and Human acceptance remain **NOT_RUN / OPEN** until user observations are recorded.

| Check | Record |
|---|---|
| Identity and growth |Original likeness across all8 stages; side/back interpretation; metamorphosis and held props|
| Emotion and motion |Normal/positive/dislike/tired/sick meaning, all canonical states, species locomotion, continuous and reduced motion|
| World readability |Species/face/pose at normal distance, attachment contact and occlusion, 2D comparison on the same fixture|
| Known v0 simplifications |Historical family notes: curled cat volumes/shared face shapes, plant/fungus softness, sparse surface detail and simplified transparency/luminous effects; identify exact key/view rather than accepting by aggregate count|
| Role boundaries |Companion/partner/author exact identity; natural Author memory_lake2D remains unchanged. The bounded forest Author QA fixture is not a gameplay relocation feature.|
| Acceptance |Record approve / conditional changes / reject, exact role/stage, screenshot or motion observation, expected correction. Implementation and CI cannot choose Human adoption.|

## Actual iPhone gate (all NOT_RUN)

Record device model, iOS/Safari version, source SHA, viewport, power/thermal conditions, actor composition and save-fixture identity. Check initial load/first appearance, 1/5/27 native actors, continuous movement/reaction, repeated 2D↔3D and forest↔city travel, tab background/return and sustained play. Record frame distribution and visible hitching together with presenter/build/cache/fallback counters, responsiveness, memory pressure and heat. Include the elapsed sustained-play interval instead of inferring long-play acceptance from a short capture.

Use identical device/fixture/camera/actor conditions for comparisons. SwiftShader CPU/frame timings are software-renderer evidence only; the isolated animation benchmark is not total render CPU, and appearance windows are not automatically a device hitch verdict. Historical Pilot stand-in casts are not equivalent to the current native companion composition. No unmeasured device budget is a PASS.

This handoff links source-specific automated/image evidence, measured performance and remaining limitations. Human and iPhone decisions remain separate even when all automated gates are green.
