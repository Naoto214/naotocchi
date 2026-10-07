# Dry bank color candidate — World remains incomplete

Baseline: 8407964113e4fd212c994a885c6a890b6a596b04, tree d9e888972edfbeb443d34e74fe916bf4e169fa3c. The previously uncommitted 147 vegetation QA files were compared with 9952dfe, confirmed additions only under docs/qa/meguru-3d-ci/run-0275faf, and saved by expected-head update with force=false. Remote tree and local checkout match.

Historical CI 37400559319 was freshly checked: all five jobs success. Saved regression log records 2878 + 80 PASS, exit 0, with Node test concurrency 4. The lost vegetation local npm log is not validation evidence.

## Candidate

Saved images show bridges surrounded by a nearly uniform green bank ribbon. The existing World continuation explicitly calls for bridge/water/bank contact and composition. This bounded first step adds broad, continuous world-coordinate soil/gravel color patches only to dry creek/river bank lanes. It reuses existing vertex colors and seeded noise; no new materials, meshes, triangles or per-frame work. Ditches, submerged color lanes, water, terrain/crossing geometry, paths, bridges and all canonical objects remain unchanged. No season behavior changes.

VQ-22 was observed RED for missing spatial variation, then GREEN. Together with VQ-3 it checks bounded continuous colors, determinism, input immutability, unchanged water colors, geometry, UVs and topology. Baseline VQ suite: 21 PASS. Independent code review: no Critical/Important findings; minor gap is helper-level test coverage of production lane selection. Rendered QA must inspect actual integration, including ditch controls.

The full unmodified npm run is in progress at this product checkpoint. Its source hashes are frozen in source-sha256.txt. Do not claim success without full-npm.exit and completed log. Fresh browser QA is pending; CI before-ref is pinned to 8407964 for a matched comparison. Local Chromium is absent. Candidate visual improvement is not yet asserted.

## Continue

Inspect new CI results and matched river/forest/countryside views, confirm budget invariance, and retain raw artifacts. Then continue bridge approach composition and weak props from the existing plan. This candidate does not complete bridges, composition, props or World Visual Quality. Draft PR374 stays open/unmerged; no main import/merge, Ready or production Pages changes. Character, Expression, 2D, save, collision and season remain protected. Human QA, including iPhone appearance and frame pacing, remains unapproved.
