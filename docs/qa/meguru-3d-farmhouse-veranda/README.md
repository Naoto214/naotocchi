# Farmhouse veranda: supported entrance canopy

This bounded visual unit follows the actual farmhouse gallery and countryside scene in [714877d comparison](../meguru-3d-ci/run-714877d/compare.md). The old veranda has three tall posts ending without a connected roof. Replace the middle post with a shallow existing gable and keep two end supports: same object and part count, reused geometry/materials, a readable sheltered entrance above the existing deck. Main roof, wall mass, windows, annex, door, garden, road and terrain are unchanged.

The low canopy is entirely inside the canonical collider. Its front ends at D, while the existing outer deck remains a low step. Supports meet the actual gable slope, not the gable's base plane (the existing mesh has no underside). No renderer, per-frame or architecture change.

## Checks and retained failures

- Original VQ-8 RED catches missing canopy. Initial implementation GREEN is retained as an intermediate log, not final proof.
- Independent review identified two errors in the first implementation: supports ended below the roof slopes, and copying the low deck footprint let the below-head roof extend beyond the collider. Both were corrected. Strengthened VQ-8 RED is saved as review-red.log; final targeted suite includes slope contact, roof-corner collider containment and deck containment. No existing threshold was relaxed.
- Initial targeted run had65PASS/2FAIL due an incorrect cache-token hash formula (SHA256 instead of existing SHA1). Corrected only the meguru.js token using the repository formula. The failure log remains targeted-stale-token.log.
- Final targeted suite:67PASS/0FAIL, exit0, Node test concurrency4. Foundationv2, ArtDirection, Geometry/Terrain, Geometry Audit, VisualQuality and asset-integrity.
- Final static audit: float4/bury18, all18 path-water crossings valid.
- All13region2D/world-semantic/collision fingerprints match a41dd08. Only countryside rendered descriptors differ. Home/city/forest/jungle and the remaining regions are unchanged.
- Re-review: no remaining blockers. Reviewer checked58farmhouses including28annex layouts; smallest canopy half-depth3.62 supports the inset posts. This is not visual/Human QA approval.

Final source hashes are in verification.json. protection-after.json records the base checkout HEAD while the product was modified; use the source hashes to identify the actual working tree. The full2864+80PASS and browser2832/hidden0/partial1 result in the preceding CI folder belongs to a41dd08/714877d, NOT this new veranda code. Full regression, matched screenshots, smoke/corridor/visibility and rendered performance for this change remain pending until a new Actions run completes and its raw evidence is inspected.

Historical x/z party overlap0.002591405357044607,17c1bdb formation timing failure and all prior raw logs remain. No terrain-penetration0 claim. No Resident Expression/Character3D,2D/collision,save/schema,stream-crossing or productionPages changes. No main merge, Ready or completion judgment. iPhone HumanQA remains pending.
