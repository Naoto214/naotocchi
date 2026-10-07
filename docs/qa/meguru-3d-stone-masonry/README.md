# Stone bridge masonry — candidate visual unit

Before source: a5e8e83efaa47076b892418e8b17984ee5936552 (vehicle product d1c3dba). Four baseline dry-road approach views are verified in ../meguru-3d-bridge-approaches/baseline-a5e8e83/.

## Change and intent

The three existing stone bridges get articulated coping and four raised terminal piers within the old parapet footprint. Coping preserves the previous parapet top; terminal piers make the ends identifiable. Deck, arch, abutments, ramps, crossing placement, clear deck width and trees are unchanged. Existing box geometry/material batching is reused. No new world objects, meshes/material types or runtime architecture.

## Verification and limits

- Prior VQ suite23PASS. VQ-24 first fails on absent terminal stones (red.log), then passes (green.log).
- Independent review identified overlapping base/pier faces with z-fighting risk. Added pairwise volume-overlap contract; it fails against the candidate (review-red.log). Base now abuts pier inner faces. Final targeted44PASS/0FAIL/exit0; logs are in targeted.log/targeted-exit.txt. Independent re-review: no remaining findings.
- Initial combined run had one ENOENT failure: missing restored docs/qa/meguru-3d-art-direction-v1-human-qa.md, retained in targeted-initial.log. Restored both required historical documents from remote, without changing them.
- before.json/after.json and fingerprint.cjs compare canonical worlds, obstacles, object count, nonstone objects, bridge placement and non-parapet parts across13regions. Additional parts: forest10, river_lake34; only3stone bridges.
- Full regression and browser after-images must be obtained from the new source CI. No full local npm pass is claimed. Previous vehicle2880+80 cannot validate this change. Node24 local targeted and Node22 CI are separate environments.

Draft/open/unmerged; World incomplete, Human QA unapproved. No main import/merge, Ready, productionPages, Character3D, Expression, 2D, save/schema, collision or season changes. iPhone disappearance/ghost/stutter/p95/p99/>60ms/adaptive resolution unapproved. Next: inspect four matched bridge approaches and all current CI artifacts, then continue water-edge/approach composition and props; do not stop after evidence bookkeeping.
