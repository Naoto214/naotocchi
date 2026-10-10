# Actual ad96 repeated-scene diagnostic review

**Overall FAILURE retained; diagnostic-only evidence.** No cause established and no scene/integration PASS. Source ad96bc539b8bfc2799d1ad8e9790fa5360c0f4ac, Character37929709480, failed Meguru113817149491, artifact11615707537. Inspected actual `scene-save-diagnostic/meguru/meguru-qa.json`; manifest explicitly DIAGNOSTIC_NOT_APPROVED. Root verified raw/direct bytes. No tests/capture/implementation or normalization of failed data.

All17 bounded phases reached ready: one current-view baseline, four warmup phases and four phases for each of three cycles. Baseline takes1frame; subsequent waits take1–2frames. Callback and restoration error fields absent. The recorded exact11-actor fixture is dog04 player, shiba/cat_friend/tanuki/penguin_friend, mushroom04/06/08 and butterfly02/04/08 residents.

Independent read-only comparison of original resource/composition predicates found no discrepancy. Each cycle off has live0/holders0; on and forest have the same exact11 models and11 attached holders. Every city is natural2D with hidden GL canvas and true sameScene/sameHolders/sameCanvases. City retains on-phase live/holders/canvas count, resources and created/removed counters. Each forest has fallback0/failedTemplates0 and the warm plateau:

| Resource | Post-warmup baseline | Each cycle / final |
|---|---:|---:|
| templates |11|11|
| materials |1|1|
| atlases |12|12|
| eyeGeos |10|10|
| textures |44|44|
| geometries |106|106|

Pre-warmup baseline geometries107 becomes106 after warmup; the source correctly uses the latter for strict warmed resource comparisons. Final created110−removed99=live11. Recorded heap before/after26,000,000bytes is an endpoint observation, not general leak/long-play proof.

**Important unresolved save blocker:** unchanged.save=false, storage=false, saveWrites=false; getter=true. Observed save-call count20→23 (three additional calls). Raw restored.step=true and restored.region=true; final world/saved region both forest. Restoring the region does not establish invariance of other saved fields. Original validator reaches all resource checks before throwing `unchanged save`; storage/write/restoration assertions follow that throw and were not executed. Their raw values are reported independently here, without relabeling the run.

Missing causal evidence is confirmed: no full before/after saved state/storage or field deltas, no returned save-call stacks/timestamps or phase counters, no synchronous presentation constituent proofs and no separate warmup/strict-cycle save intervals. The three calls cannot be assigned to warmup or specific cycles. Source-supported natural city map initialization remains a hypothesis; these bytes do not distinguish it from other ordinary application work or a synchronous/deferred presentation mutation.

The separate diagnostic worker should retain the existing strict baseline while exposing that provenance. No unchanged flag may be overwritten or ignored to manufacture PASS. Overall scene/save and performance gates remain OPEN. This software-GPU no-capture diagnostic also provides no isolated animation/appearance-window or Human/iPhone approval.

Exact path/hash, manifest provenance, phase waits, fixture composition and cycle metrics are saved in `actualdiagnostic-review.json`.
