# Runtime scene timeout diagnostics

Base: 6df4db58dc505b272fe365748b3f55b9c7780ff0; branch work/runtime-scene-diagnostics; isolated worktree /workspace/scratch/150320e8a2fd/rollout-runtime-scene-diagnostics. Head: 49616900044159eb2dfb370f715a3a8315f9f308 (clean local commit).

## Actual evidence and conclusion

Actual targeted CI 37924802873 / job 113801069134 shows every45 functional role PASS including author:naoto; source6df, tree38aa3e77eb3ec21caac08deb934fe57f1501f15e. Then repeatScene failed with readiness timeout. Raw main SDD/runtime-6df-scene-failure.log contains callback cycle line10:27 and warmup invocation line19:21. Mapping the exact source callback locates warmup characters-on (`setChar3D(true); await live===fixtureCount`), before city is entered. This run gives no evidence of city cleanup failure. Parent recovery confirms only production-nonplayer.json exists in artifact11613667094; meguru-qa.json was never written. No missing scene JSON is represented as evidence.

The baseline live count is sampled immediately after QA pose and a live>=5 wait that can be satisfied by the prior frame. Renderer uses current player-to-resident distance (<1500) for 3D, so stale baseline composition is a plausible source explanation. Without actual last-frame counts/composition it remains a hypothesis; this patch does not change the count condition, baseline establishment, rendering, or any production behavior. Actual scene readiness/cleanup/cache/save outcome stays OPEN pending a diagnostic rerun. Original ae9 unchanged-save cause is also still unproven.

## Five-file QA-only patch

- runtime-integration.cjs: extracted the existing browser callback for directly testing its real QA logic. Before each bounded240-frame wait, log the named warmup/cycle characters-off/on/city/forest phase with expected condition and actual resource/actor snapshot. Save last-frame status, actual live/holders/counters/templates/materials/atlases/eye geometry/texture/geometry counts, exact actor keys/kind/line/stage/positions/live/attachment, region, frames and timestamps. A timeout retains the partial result, error/stack/phase, failed snapshot, and restoration/save proof. Restoration errors are explicit. validateRepeated rejects either error before all original gates.
- meguru-qa.cjs: relay the phase browser messages to CI; call retainRepeatedResult to store the raw result first, validate, write failed meguru-qa.json with verdict.pass=false, and rethrow the original error. This preserves diagnostics before later checks can run; no error is accepted as PASS.
- character-3d-runtime-scene-diagnostics-test.cjs: four focused tests run the actual QA callback in the existing Node VM style with declared synthetic renderer resources. They prove bounded timeout/expected-versus-actual actor snapshots/restoration/logging, unchanged completed-loop strict gates (including dirty city live1 rejection), JSON persistence before original failure propagation, and exact marker routing. This is QA logic verification, not actual browser/render evidence.
- runtime-integration-remove-it.cjs: two new scoped controls, --scene-diagnostics-only: omit readiness-error rejection; omit failed JSON persistence. Existing controls remain available.
- existing workflow: both explicit [qa:runtime] and [qa:scene] skip only the production45 functional step, reusing the actual source6df45PASS. Repeated scene/default native metrics and focused dedicated remain; runtime alone and integration (including integration+scene without runtime) still run all45. No new jobs, browser framework, captures or production edits. Dedicated includes the new tests/two controls.

All original repeated live/holder cleanup, fixture count, warm resource plateau, save/storage/getter/write counters and restoration requirements remain intact. No forced city reset. Snapshot capture is observational; no save suppression or getter replacement.

## Evidence

- node --test --test-reporter=tap tests/character-3d-runtime-scene-diagnostics-test.cjs: four PASS; runtime-scene-focused.log.
- node tools/character-3d/runtime-integration-remove-it.cjs --scene-diagnostics-only: two meaningful RED, exact bytes restored, four-test GREEN; runtime-scene-controls.log. Restored runtime-integration SHA256 767f40542f49fe7a344abe7e15d0ceed2e58640b2dea4ce36b3092e4bfd343ff.
- Final node --test --test-reporter=tap --test-skip-pattern='every currently approved production role' tests/character-3d-runtime-scene-diagnostics-test.cjs tests/character-3d-runtime-save-boundary-test.cjs tests/character-3d-runtime-integration-test.cjs tests/character-3d-integration-workflow-test.cjs: 24 PASS, 0FAIL, 2136ms; runtime-scene-final.log. The unchanged Node45 sweep is intentionally reused from prior dedicated CI, and actual browser45 from6df.
- Same-runtime git-show/Module compile identity audit: all11 exported functional/save/metrics functions are byte-identical to6df, including functionalRun and validateFunctional. Exact hashes in runtime-scene-identity.log. No author/othermodel or production input changed.
- node --check runtime-integration.cjs, meguru-qa.cjs, runtime-integration-remove-it.cjs; git diff --check: exit0.

No full suite, images, local browser download, remote push or root exporter/gallery edits. Local Chromium unavailable; parent will run [qa:runtime] [qa:scene] after independent review and retain the6df functional source separately. This patch fixes lost diagnostics; it does not claim the actual scene failure fixed.
