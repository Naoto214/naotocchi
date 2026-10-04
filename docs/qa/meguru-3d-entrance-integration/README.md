# Entrance integration: supported porches and barn identity

## Source and intent

Continue World Visual Quality from product `7fda832` / verified evidence `c312aba`. The preceding CI evidence is preserved at `../meguru-3d-ci/run-7fda832`: five jobs successful, 2865+80 PASS, 31 World + 4 entrance pairs and 20 gallery pairs; smoke13regions, corridor8directions, ray2832/hidden0/partial1. This is a prior-product result, not validation of this new code.

Images show cottage/cabin porch posts disconnected from the roof and thin ordinary-house doors on barns. Existing gables have no underside. Posts previously stopped at baseY and, in narrow porches, extended beyond the canopy footprint. The new low canopy ends at the canonical lot boundary, and inset posts reach its actual slope. The existing outer deck remains a step. Applies to 7 cottages,28 singles,2 cabins across generated regions. No geometry/material type or part is added.

Barn doors use 55% of the wall half-width and the existing handle part becomes the centre meeting strip. Door height and frame remain; no new part. Initial fixed cap46 still made large barns too narrow; targeted test and independent review caught it. Removed cap; original failure retained in targeted-initial-barn-cap.log. Final targeted69PASS/0FAIL/exit0. Independent re-review: no remaining blockers in this bounded diff.

## Protection and limits

All13 canonical2D/3D world and collision fingerprints match baseline. All13 object and part counts unchanged. Rendered descriptors change only home/city/countryside/sea/mountain/snow. Geometry float4/bury18 unchanged. Snapshot generator is included for repeatable comparisons. It hashes canonical worlds before descriptor generation, plus collider identities/positions and full rendered descriptors; it is not pixel QA.

Runtime renderer, terrain, water routing, bridge placement, season, save/schema, ResidentExpression and Character3D untouched. Local AF_UNIX socket restriction still prevents Chromium. Fresh matched CI is required before evaluating the new appearance or draw cost. CI capture baseline pinned c312aba to isolate this unit; earlier Claude/Astra/garden comparisons remain in their original folders.

Full unmodified npm test completed:2867+80PASS/0FAIL/exit0; full-npm-test.log and exact source hashes saved. GitHub run37197964997 completed with all5jobs successful. New CI artifacts/measurements/images have NOT yet been downloaded/inspected; next session must do that before any new visual/performance approval. See continuation.md. Existing history retained: formation463ms FAIL at17c1bdb, later isolatedPASS; VQ2 party overlap0.002591405357044607; current prior-product jungle overlap0.0028149653578708467 (x/z circular obstacles, not terrain penetration; cause unknown). No threshold relaxation.

## Remaining World work

This is a bounded entrance improvement, not completion of building massing or World Visual Quality. Existing flowers still intersect some decks; no blind relocation was applied because road clearance must be preserved. Next: inspect new home/cottage/cabin/barn and mountain summer/winter captures, then derive safe planting/approach placement from existing canonical roads. Continue broader silhouette, foreground/midground/background, vegetation layering, bridge/bank integration and weak props (stall,vehicles,ruins) across13regions. No new game/region/season semantics.

Keep PR374 Draft/open; no Ready, main merge/import, productionPages changes. iPhone ghost/afterimage, disappearance, stutter/frame pacing, p95/p99/>60ms/adaptive resolution and final visual quality remain HumanQA unapproved.
