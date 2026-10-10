# Continuation — World Visual Quality, house/garden unit

## Authority and boundaries

Repository Naoto214/naotocchi; branch `feat/meguru-3d-geometry-terrain-v1`; Draft PR #374; base `feat/meguru-3d-art-direction-v1`. Recovery source commit `704faac1e62690d9c4dff5e862a0d8d424cefff9`, tree `e8e77de03cbc24ef86182f2df7fafd26053a6aa6`, parent `dc91d3e9f99c42cc337db9177c0812e91878facb`. Fresh-check remote HEAD/tree/PR at restart; newer remote wins. No main import/merge, Ready, production Pages, save/schema, Resident Expression or Character 3D changes. Keep runtime/terrain architecture, 2D authority, collision and stream/crossing meaning.

## What was recovered

`704faac` durably saves the prior session's product tree, explicitly WIP pending new verification. Source changes are confined to `meguru.js`, its single cache token in `index.html`, and two regression contracts in `tests/meguru-3d-visual-quality-test.cjs`. No renderer change.

Home gardens share the actual first `door:true` entrance. Routes target the clamped nearest canonical road segment, go forward from the door, stay outside house/path boundaries, and reject obstructed approaches. Existing low house planting moves in a staged, bounded way to flank the route; failed relocation cancels the route. Beds, gates and mailboxes follow the same approach. Cottage wall depth reserves more porch space; porch width stays inside the wall and the existing gable orientation branch is now reachable for both variants.

An attempted farmhouse widening caused countryside:370 foundation burial of 8.2 and total bury 19; it was reverted. Farmhouse and countryside are unchanged controls in the saved source. Do not use the rejected intermediate countryside triangle count 119536 as a final result.

Independent review in the preceding session caught house flowers/shrubs covering initial stepping stones. The staged flank move and extended VQ-5 assertions fixed that case; rereview found no further concrete issue. VQ-6 covers actual generated cottage roof orientation variation. That review is not Human QA. No thresholds were weakened.

## Evidence provenance

This directory holds fresh evidence at the recovered source commit. Read `verification.json` for actual counts, provenance, scope and raw log paths, and `compare.md` for the capture blocker and prepared same-camera recipes. The old scratch workspace was pruned before its final full VQ3 run/QA documentation commit completed. Earlier VQ3 raw logs/images are missing; conversation counts are not recreated as logs.

Earlier interrupted VQ3 runs: stale asset token; missing sharp due to browser-only NODE_PATH; then farmhouse burial regression; finally a post-revert full run whose completion was not retained. The first three were interrupted, and the last result is unknown. The fresh full run uses the package.json pipeline with only Node test concurrency set to 4, with normal NODE_PATH. Do not call it unchanged npm test.

Static protection reproduction: from each commit's checkout root, `node /absolute/path/to/protection-snapshot.cjs out.json`. It hashes deterministic canonical 2D worlds, world props/paths/spots/terrain/obstacles, non-dressing object positions/colliders, and full 3D descriptors across all 13 regions. Browser recipes and attempted job commands are checked in. New captures and browser QA are blocked before game load by AF_UNIX socket creation denied (errno 1). The minimal socket diagnostic reproduces the denial. No security-control bypass was attempted. Resume captures in an authorized browser-capable runtime; subsequent gallery/smoke/corridor/visibility jobs have not run. Visibility's temporary portable runner only changes Chromium executable resolution, not sampling or ray criteria.

## Historical observations — preserve

VQ2 code dea2f17 and evidence dc91d3e remain the broader reference: 31 World views; 13-region smoke with 27 companions; four corridor pairs/eight directions; visibility 2832 samples, fully hidden 0, partial 1 mountain, yaws 0/1.2/−1.2/3.14 and step 1000 (not default 220). It is ray QA, not proof of screen visibility. Jungle party circular x/z obstacle overlap 0.002591405357044607 remains known; do not erase it because a new subset has smaller values. Pen is not terrain-height penetration. Static float4/bury18 and 18 valid crossings are retained.

17c1bdb regression: 2858 PASS/1 FAIL, formation 463ms vs unchanged <300ms; isolated PASS; root cause unconfirmed. VQ2 reviewed full: 2861 PASS + Relationship80 PASS, exit0, concurrency4. VQ2 same-camera performance relative to lighting checkpoint is mixed (city +1.92% triangles, draw calls48→50). Do not claim broad performance optimization.

## Next visual work

User priority remains a coherent living space, not independent house/yard/road objects. Obtain and inspect actual entrance before/after images first; none were captured in this recovery session. The safe-route filtering reduces some garden content; prefer bounded relocation of existing beds/fences around the clear entrance instead of simply omitting them or adding many new objects. Check flower-bearing bed integrity, lateral clearance and whole-bed footprint against the canonical road/obstacle boundaries. Small cottages can still read tall; never solve this by lowering oversized main eaves below player head again. Consider silhouette/overlap/porch/window rhythm within the protected envelope.

Continue scene depth and negative space around home; retain countryside's open, low settlement/field grammar. Then forest/jungle crown grouping and vertical layers, bank-to-ground planting and bridge approaches, shared stall/open-counter silhouette, city composition and remaining regions. Existing object positions are not a permanent prohibition on decorative repositioning. No new game/season/region semantics without user clarification. Existing 2D season/weather semantics remain authoritative.

Work in meaningful tested visual units and push each checkpoint; do not leave all assets as unreferenced Git blobs. Preserve existing local work. Record source commit and camera/environment for every capture; do not relabel historic captures. Broad comparisons are in the VQ2 directory, including paired car cameras at112.

## Unapproved

World and Art Direction are not complete or production ready. iPhone ghost/afterimage, player disappearance, stutter, p95/p99/>60ms and final beauty require Human QA. Headless GREEN cannot approve these. Prior external githack access was403; commit-pinned links and actually verified external reachability are separate. Production Pages unchanged.

## Fresh recovery-session result

At 704faac the full pipeline completed: 2863 PASS /0FAIL plus Relationship80 PASS /0FAIL, exit0, Node test concurrency4. Targeted contracts12 PASS. All13 canonical2D/world/collision hashes equal dc91d3e; only home rendered descriptors differ. Geometry float4/bury18,18crossings valid. Fresh browser QA is blocked before game load by denied AF_UNIX sockets; zero new captures and no smoke/corridor/visibility run. New draw/triangle counts are unmeasured. Home objects287→283, gardens18→14, gardenparts291→160: inspect for over-pruning before claiming visual improvement. No further product modification was made during recovery. A clean detached `next` worktree may exist but contains no implementation changes.
