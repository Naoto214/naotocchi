# World Visual Quality — current checkpoint

Use fresh GitHub state as authority, not past conversation. Repository Naoto214/naotocchi; branch feat/meguru-3d-geometry-terrain-v1; Draft PR374; base feat/meguru-3d-art-direction-v1.

## Saved state

- Vegetation QA recovery complete: 8407964113e4fd212c994a885c6a890b6a596b04 / tree d9e888972edfbeb443d34e74fe916bf4e169fa3c. All 147 additional files saved, no code changes or deletions, force=false. Do not recreate them.
- Current product: d1c3dbad9c6089741e5a1469e06264adb7b1efae / tree209e8aec9e6484fbf66a386d055b11d0972cc978. Includes dry bank color0421779 and vehicle cab frames. Details: docs/qa/meguru-3d-bank-color/README.md and docs/qa/meguru-3d-vehicle-frames/README.md. Local/remote source trees matched. Vehicle2D/canonical3D/collision/object-count fingerprints match across13regions; only5vehicles change, +200triangles total.
- Candidate CI: https://github.com/Naoto214/naotocchi/actions/runs/37563978237. All five jobs succeeded; five artifact digests/source hashes/exits verified.59matched scene budgets unchanged. Inspected creek/river/countryside pairs show modest earth-tone variation. Human QA remains unapproved.
- Vehicle CI: https://github.com/Naoto214/naotocchi/actions/runs/37564694236. Last observed pending behind bank CI; fresh-check current state; before0421779. Full final-source regression and appearance unverified.
- Historical vegetation CI37400559319: five jobs success, saved concurrency-4 regression2878+80PASS/exit0. Lost local vegetation npm log must never be counted as success.

## Unfinished

Bank-only unmodified npm completed2879+80PASS/exit0 with matching source hashes; raw evidence is saved alongside its README. It cannot validate later vehicle code. Finish fetching/verifying both candidate CI artifacts, inspect matched water/bridge and region images, and confirm budgets. Keep runtime/source provenance separate from Human QA. Minor review gap: VQ-22 covers the real strip builder but not actual production dry-lane/ditch selection; browser comparisons must verify that scope.

World is incomplete. Continue bridge approach composition and weak props after the current unit. Car/tractor cab frames are implemented and awaiting images; avoid redoing them. Four validated dry-road bridge approach recipes are prepared under docs/qa/meguru-3d-bridge-approaches (not rendered or added to the CI shot list yet) for the next composition decision. Inspect them before canopy or bridge edits; overview shots and plan-view crown overlap alone are insufficient evidence. Final visual appeal, iPhone ghosts/player disappearance/stutter/p95/p99/>60ms/adaptive resolution are Human QA unapproved.

## Protected

Draft/open/unmerged; no Ready, main import/merge or production Pages changes. Preserve Character3D, Expression, existing 2D, save/schema, collision, season semantics and established runtime architecture. Automated success is not Human QA approval.

## Long-running tab rules

At safe units save implementation/tests/raw QA and verify remote HEAD/tree. Use this current checkpoint plus fresh remote and unfinished items thereafter; fetch older source only when needed. Keep chat updates short: results, paths, commits and important anomalies, without repeated file/image/log lists. Preserve unresolved design decisions and Human QA conclusions when compacting. Continue uniquely determined authorized work without intermediate approval. If context growth demonstrably harms speed or quality, save a safe checkpoint and offer a short handoff; do not prolong the tab at the expense of correctness.
