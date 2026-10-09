# Full Rollout v0 — Human / iPhone QA

Status: **OPEN; automated integration and remaining player image review are not yet complete.** This document prepares the separate Human gate; it does not grant acceptance. Draft PR376 stays based on the Pilot branch. No Ready/main merge, PR372 changes or automatic v1 work.

Use the final source/tree recorded in the [checkpoint](../../character-3d/full-rollout-v0/checkpoint.json), with the matching [evidence map](../../character-3d/full-rollout-v0/final-player-evidence-map.md) and source-specific export manifests. Historical Pilot URLs and performance numbers are references, not current measurements.

## Review surfaces

- [Full gallery](../../../character-3d/full-gallery.html):293 exact entries, original/four-view comparisons, family/kind/stage filters and role-correct live links. Legacy cat_friend/shiba use the explicitly labelled immutable comparison board.
- [Live gallery](../../../character-3d/gallery.html): inspect continuous motion, canonical emotion, reaction and reduced motion. Static32-state sheets do not by themselves approve continuous animation.
- Existing Meguru QA route: `index.html?meguru3d=1&char3d=1&perf=1`; compare the same saved fixture with `index.html?meguru3d=1&perf=1`. Use a separate QA browser profile/origin and the existing QA fixtures. Do not overwrite a personal gameplay save.
- Run repository pages through the existing development server (`npm run dev`). For a remote device preview, reuse `tools/preview-url.sh` with the final source SHA; preview host availability and iPhone rendering remain unverified until actually opened. Do not change Pages/main for this gate.

## Human decisions (all OPEN)

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

The final handoff must link completed automated/image evidence, source-specific performance results and any unresolved limitations. Human and iPhone decisions remain separate even when all automated gates are green.
