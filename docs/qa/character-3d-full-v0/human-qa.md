# Full Rollout v0 — Human / iPhone QA

Status: **Human / iPhone OPEN. All293 model image gates and source-scoped automated integration are verified.** This document prepares the separate Human gate; it does not grant acceptance. Draft PR376 stays based on the Pilot branch. No Ready/main merge, PR372 changes or automatic v1 work.

Use the final source/tree recorded in the [checkpoint](../../character-3d/full-rollout-v0/checkpoint.json), with the matching [evidence map](../../character-3d/full-rollout-v0/final-player-evidence-map.md) and source-specific export manifests. Historical Pilot URLs and performance numbers are references, not current measurements.

## Source-specific handoff

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
- Run repository pages through the existing development server (`npm run dev`). For an iPhone on the same network, serve the source-pinned checkout with `npm run dev -- --host 0.0.0.0` and open the development machine’s address and reported port. Device connectivity and Safari rendering remain unverified until actually opened. Do not change Pages/main for this gate.

## Human decisions (all OPEN)

### iPhone preview without a development PC (2026-10-10)

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
