# Planting contact and open market counters — in-progress Draft checkpoint

Baseline product 1cbc27b (docs-only HEAD04c2a82); recovered CI evidence39d6cc5. This bounded World pass continues after the successful entrance integration evidence, without changing the renderer architecture, terrain/grounding, game/season/collision/save semantics or character lanes.

## Product changes

1. Flower instance emission previously discarded the descriptor's y: flowerbed y7 and window-box elevated flowers were emitted at ground height. The stem, petals and centre now all use the declared base. Ground-level flowers, rotations/scales/colors and instance counts remain unchanged. This fixes the rendering contract; it does not claim every planting/deck or planter/terrain intersection is solved.
2. Six existing soft city shop/cafe props used a full-height solid box with a window. They now have low counters, an open serving space, a countertop and four supports under the same canopy. Existing positions, footprint, walkability, canopy height and palettes remain. Existing geometry/material types only; 24 additional post parts total, no additional objects. Hard guardposts and vending machines remain unchanged.

## Verification completed before product checkpoint

- RED reproduction for both changes saved. VQ11 exercises the actual production switch emission without WebGL, including omitted y and elevated flowers, immutability and invariant scale/rotation/material/count. VQ12 exercises all six generated stalls and support contact/footprint.
- Intermediate text-replacement mistakes affecting sy/ry were caught and corrected; intermediate failure logs retained. Current production diff changes only the intended flower y coordinates.
- World/Foundation/ArtDirection/Terrain/Geometry/VQ/cache suites: **82 PASS / 0 FAIL**, exit0; raw targeted log and sourceSHA256 retained.
- Protection snapshots: all13 canonical2D/3D/collision hashes and object counts unchanged. Rendered descriptor hashes unchanged outside city; city parts12682→12706. Flower renderer fix intentionally does not alter descriptors.
- Geometry audit: historical float4/bury18 retained;18 valid crossings. No threshold changes.
- Independent read-only review: no Critical/Important issues. Minor nonblocking future guard: VQ12 could additionally assert tabletop presence and horizontal canopy coverage. Current geometry was inspected; supports stay inside the existing counter/canopy.

## Full regression and browser status

Full unmodified npm test on final source is in progress at this product checkpoint; do not claim full GREEN until its exit/log is saved. The earlier preliminary run was interrupted with Ctrl-C (exit130), after detecting stale cache-token failures while development was still in progress; it is not a completed full run and is preserved separately. Cache tokens now match both changed source files. No thresholds or tests were relaxed.

Local AF_UNIX remains denied (errno1), so fresh browser evidence must come from the authorized existing GitHub QA workflow. Its BEFORE ref is04c2a82, with existing identical recipes for both sides. New product smoke/corridor/visibility/triangles/drawcalls/images are pending; previous1cbc27b measurements are NOT new-code measurements.

## Remaining scope / next action

Fetch new push-triggered workflow results and raw artifacts; verify SHA256/commit/exits. Inspect window flowers, planted beds, open stall closeup and city context, plus all35World/entrance and20gallery pairs; compare same-camera budgets and retain all overlap/visibility observations. Preserve mountain same-camera summer/winter. Then resume safe planting/deck/road integration, building massing, wider scene composition/vegetation, water/bridge contact, weak vehicles/props and13region identity. Do not endlessly polish one object or declare the whole pass complete.

PR374 stays Draft/open. No main merge/import, Ready, productionPages, save/schema, collision semantics, new season state, Character3D or ResidentExpression changes. HumanQA is still required for iPhone ghost/afterimage/disappearance/stutter/p95/p99/>60ms/adaptive resolution, final depth/composition/architecture/bridge/water/identity/beauty. Automated GREEN is not HumanQA approval.
