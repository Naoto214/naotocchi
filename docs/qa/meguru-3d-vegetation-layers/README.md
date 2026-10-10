# Forest / jungle vegetation layers — implementation checkpoint

Base: 2300ffbd4cccd25a0957907016771fbe0273d4d2 (saved facade evidence). World branch / Draft PR374 only. No main import/merge, Ready or production Pages changes. World Visual Quality and Human QA remain incomplete.

## Bounded visual change

- Existing forest/jungle ground fern leaves emerge upward from terrain rather than using the hanging-palm curvature. Same 1,447 leaf descriptors: forest455, jungle992 (567 big-tree root leaves +425 dressing leaves).
- `rise` uses proper positive-determinant rotations of the existing eight-triangle frond mesh. No new mesh/material/object, no added per-frame logic. Hanging palms retain their previous transform.
- Ground fronds join the existing GROUND_SHAPES set at y0, so the unchanged per-part grounding algorithm locates their own offset roots. This is a narrow extension of frond grounding behavior, not an unchanged-renderer claim. Terrain, grounding formula, occlusion, ray diagnostics, adaptive resolution, streaming and measurement infrastructure are preserved.
- Existing ordinary big-tree crown masses rotate together using the existing seeded variation. Heights, radial envelope, part counts and landmark silhouettes stay fixed. This varies visible overlap without adding trees or changing canonical placement.

## Review findings and corrections

Initial negative-scale proposal rejected before product commit: DoubleSide would retain visibility but invert Lambert normal/winding agreement. Initial upward fronds also floated because their offset roots were not grounded. Both were reproduced with failing tests and corrected with a proper rotation and existing per-part grounding. Independent re-review found no Critical/Important issue. Its minor real-palm `!rise` coverage suggestion was implemented. Screenshots must still judge canopy connectivity and appeal.

## Verification at implementation checkpoint

- VQ18/19 RED (buried local-plane vertices / fixed azimuth), then GREEN.
- VQ20/21 RED (actual terrain root float / absent directly testable production transform), then GREEN. Covers actual Three matrices, determinant, geometric/shader normal agreement, radial direction, generated roots and exposed tip vertices.
- 13-region canonical2D/canonical3D/collision/object/part counts unchanged. Rendered descriptors change only forest and jungle.
- Cache integrity6PASS/0FAIL. World-related final suite and unmodified final npm are still running at this checkpoint; do not claim their completion from earlier logs.
- Static grounding audit now includes1,447 previously unmeasured fronds. Existing non-frond observations remain float4/bury18. Expanded audit: float4/bury21, including3 newly observed frond footprint samples in jungle (jungle959 once, jungle969 twice;8.8/8.5/8.5). These sample a bounding footprint plane, not whole leaf burial. Actual production terrain root/tip assertions pass; do not erase or call the expanded audit18.
- Initial full-npm.log began before review corrections and code changed before it completed. Its result, whatever its exit, is superseded and cannot certify final source. `full-npm-final.log` is the separate frozen-final-source run; require its exit and source hashes.
- Local AF_UNIX socket creation remains denied. Browser QA runs through existing World CI; BEFORE is2300ffb. Gallery adds four matched forest/jungle fern/tree views to the existing20. Screenshot/performance evidence pending; no iPhone frame-pacing claim.

## Next

Finish final local/CI verification, inspect matched World and24gallery views, preserve all raw evidence and timing/source provenance, then save the final verification checkpoint. Continue World composition / bridge-water-bank contact / weak vehicle props and regional assessment. Never treat this vegetation unit as World completion.
