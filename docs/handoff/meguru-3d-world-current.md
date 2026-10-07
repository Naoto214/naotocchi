# World Visual Quality — current checkpoint

Use fresh GitHub state as authority, not past conversation. Repository Naoto214/naotocchi; branch feat/meguru-3d-geometry-terrain-v1; Draft PR374; base feat/meguru-3d-art-direction-v1.

## Saved state

- Vegetation QA recovery complete: 8407964113e4fd212c994a885c6a890b6a596b04 / tree d9e888972edfbeb443d34e74fe916bf4e169fa3c. All 147 additional files saved, no code changes or deletions, force=false. Do not recreate them.
- Current product: d1c3dbad9c6089741e5a1469e06264adb7b1efae / tree209e8aec9e6484fbf66a386d055b11d0972cc978. Includes dry bank color0421779 and vehicle cab frames. Details: docs/qa/meguru-3d-bank-color/README.md and docs/qa/meguru-3d-vehicle-frames/README.md. Local/remote source trees matched. Vehicle2D/canonical3D/collision/object-count fingerprints match across13regions; only5vehicles change, +200triangles total.
- Candidate CI: https://github.com/Naoto214/naotocchi/actions/runs/37563978237. All five jobs succeeded; five artifact digests/source hashes/exits verified.59matched scene budgets unchanged. Inspected creek/river/countryside pairs show modest earth-tone variation. Human QA remains unapproved.
- Vehicle CI: https://github.com/Naoto214/naotocchi/actions/runs/37564694236. All five jobs succeeded; before0421779. All five ZIP digests, extracted entries, commits/source hashes and exit0 verified. Regression2880+80PASS/0FAIL with Node concurrency4.59same-camera budgets: draw calls unchanged, triangle additions restricted to vehicles. Smoke13regions/corridor8directions issues[]; visibility2832samples/hidden0/partial1. Evidence: docs/qa/meguru-3d-ci/run-d1c3dba/. Automated appearance review is not Human QA approval.
- Historical vegetation CI37400559319: five jobs success, saved concurrency-4 regression2878+80PASS/exit0. Lost local vegetation npm log must never be counted as success.

## New stone bridge candidate

Vehicle evidence and the bridge capture workflow are saved in a5e8e83efaa47076b892418e8b17984ee5936552 / tree d3dd6207583afcb1e1a5ea52e5118ebf4595d54d. Bridge baseline CI37588515661 succeeded; four dry-road approach images and source/commit/exit/ZIP provenance verified. The current candidate adds coping joints and terminal piers to three stone bridges, confined to existing parapet footprints. Deck/crossings/approaches/tree crowns unchanged. Independent review caught base/pier coplanar overlap; fixed by abutting parts and protected by a failing-then-fixed overlap test. See docs/qa/meguru-3d-stone-masonry/README.md.

Candidate product95c5850e7aedde4c46c16f71f20eedfc4d0d8320 / tree759b431daad87999263c36d0c07e0121c8cfe099. Targeted44PASS/0FAIL/exit0, independent re-review no findings, protected13region fingerprints match. After-image CI37590015578 succeeded; four matched views inspected and provenance verified in docs/qa/meguru-3d-bridge-approaches/after-95c5850/. Draw calls unchanged; forest+100/river_lake+340 triangles. Full new-source CI37590015576 completed: browser4jobs success; regression2879PASS/2FAIL of2881/exit1. Subsequent80tests were not reached. Both failures required monolithic h16 parapet boxes. The test-only correction now checks assembled bilateral walls, full-length continuity, alignment, coping top/contact, retaining arch/deck/support checks and VQ-24. Independent review found no blocking issue. Three corrected test file hashes match the reviewed version. Prior local33PASS log was lost to workspace maintenance and is not retained as proof; new full CI is required. Do not count earlier vehicle tests as this candidate's regression. The bridge workflow now follows World source changes; broad World comparison is pinned before=a5e8e83.

## Unfinished

Stone CI37590015576 evidence: five ZIP digests,223raw entries, commits/source hashes verified before workspace maintenance.59comparison draw calls unchanged; triangle deltas limited to forest+100 and river_lake+340. Smoke13/corridor8 issues[], smoke maxPartyObstacleOverlap0.0025200611492053326 (not zero), visibility2832/hidden0/partial1. Raw evidence is still being saved; do not call the failed regression passing. CI artifacts remain the recovery source.

Waterwheel axle/two-support candidate is preserved in /tmp/wheel-candidate (meguru.js, index.html, visual-quality test). Not committed or visually verified. Earlier local45PASS logs/fingerprints were lost; rerun before claiming validation. First save the stone test correction and remaining QA evidence, then continue waterwheel improvement.


Bank-only unmodified npm completed2879+80PASS/exit0 with matching source hashes; raw evidence is saved alongside its README. It cannot validate later vehicle code. Bank and vehicle CI artifacts are verified and saved; matched vehicle and region images were reviewed. Keep runtime/source provenance separate from Human QA. Minor review gap: VQ-22 covers the real strip builder but not actual production dry-lane/ditch selection; browser comparisons must verify that scope.

World is incomplete. Continue bridge approach composition and weak props after the current unit. Car/tractor cab frames and their image evidence are complete for this unit; avoid redoing them. Four validated dry-road bridge approach recipes are prepared under docs/qa/meguru-3d-bridge-approaches (baseline verified in CI37588515661; after95c5850 verified in CI37590015578) for the next composition decision. Inspect them before canopy or bridge edits; overview shots and plan-view crown overlap alone are insufficient evidence. Final visual appeal, iPhone ghosts/player disappearance/stutter/p95/p99/>60ms/adaptive resolution are Human QA unapproved.

## Protected

Draft/open/unmerged; no Ready, main import/merge or production Pages changes. Preserve Character3D, Expression, existing 2D, save/schema, collision, season semantics and established runtime architecture. Automated success is not Human QA approval.

## Long-running tab rules

At safe units save implementation/tests/raw QA and verify remote HEAD/tree. Use this current checkpoint plus fresh remote and unfinished items thereafter; fetch older source only when needed. Keep chat updates short: results, paths, commits and important anomalies, without repeated file/image/log lists. Preserve unresolved design decisions and Human QA conclusions when compacting. Continue uniquely determined authorized work without intermediate approval. If context growth demonstrably harms speed or quality, save a safe checkpoint and offer a short handoff; do not prolong the tab at the expense of correctness.

