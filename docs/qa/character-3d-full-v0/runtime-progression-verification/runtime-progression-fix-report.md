# Runtime progression diagnostic QA repair

Base: ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f. Isolated branch work/runtime-progression-diagnosis in /workspace/scratch/150320e8a2fd/rollout-runtime-progression-fix. Head: 116370ed5385b09e08bf2f5d17e9072ffc1a7edd (clean local commit).

## Evidence and limits

Actual CI run 37922214774 / meguru-wave job 113792592031 failed at validateFunctional unchanged save / functionalRun119. The raw log is final-meguru-ae9-failure.log in this SDD directory. It has no failing-role identity or state delta. The failed-job JSON is not yet recovered. Therefore this patch does not establish that Author or ordinary gameplay caused that particular failure, and does not claim the browser failure fixed.

Source investigation found that script.js recordMapBits/recordSpot/recordMet call the existing saveMeguruRecordSoon microtask, outside rendering. Author staging awaits readiness frames; its old whole-interval saved-state comparison could observe normal record progression. A real runtime-harness bridge.recordMapBits call proves state changes and its queued normal storage save occur outside presentation, while the same real API inside a presentation boundary is rejected. No writes are suppressed, getters replaced, or persistent state reset to hide a change.

## Changes (five files, QA only)

- tools/character-3d/runtime-integration.cjs: strict synchronous saved-state/storage/getter/write-count checks around Author entry, every staged draw, explicit final draw, release, and failure cleanup. Every dirty constituent proof is retained and validated even if aggregate flags claim unchanged. Ordinary roles keep their synchronous draw proof. Author async span is separately labelled observed progression, with exact field deltas and save-call key/timestamp/stack provenance; it is not a no-write claim. Role START/PASS logs identify progress. The failing row is stored before validation with the error and deltas; readiness/evaluate failures also retain diagnostics. Cleanup errors propagate or remain recorded alongside the primary failure. JSON declares attempted/passed/failingRole distinctly and cannot PASS an error.
- tests/character-3d-runtime-save-boundary-test.cjs: six meaningful tests for real record progression, forbidden presentation effects, thrown-action proof retention, failing-row persistence, dirty constituent validation, and narrow workflow routing. Same-value storage writes remain forbidden by the counter.
- tests/character-3d-runtime-integration-test.cjs: an explicit synthetic missing Shiba stage proves --require-full still rejects omitted roles after every real role is promoted; no current real unresolved sentinel is frozen.
- tools/character-3d/runtime-integration-remove-it.cjs: five new scoped controls plus --save-boundaries-only. Legacy seven controls remain available unchanged; the new selector runs only changed-boundary controls.
- .github/workflows/character-3d-rollout.yml: explicit [qa:runtime] enables only existing meguru-wave and dedicated jobs. Dedicated uses focused QA tests and the five controls. Meguru runs production all45, scene/lifecycle, and native-composition metrics with --no-capture. All image/stage/gallery/other-performance jobs are skipped in this mode. Ordinary, existing family-marker and [qa:integration] routing without the runtime marker remain unchanged. No new jobs/framework/capture paths.

repeatScene and its whole-async saved-state assertion are deliberately unchanged. Existing meguru-qa assigns the raw repeated result to R.checks.repeated before validateRepeated; a validation failure is included in verdict and meguru-qa.json rather than discarded. City live0/holder0 requirements, no forced city reset, and all cache/resource gates remain strict. Readiness exceptions before a repeatScene result returns remain a separate diagnostic limitation of the unchanged scene tool.

## Focused verification

Commands run from the isolated worktree:

1. node --test --test-reporter=tap tests/character-3d-runtime-save-boundary-test.cjs tests/character-3d-integration-workflow-test.cjs
   Intermediate 11 PASS before sixth boundary test added; runtime-progression-focused.log.
2. node --test --test-reporter=tap tests/character-3d-runtime-save-boundary-test.cjs
   Final six new tests PASS; runtime-progression-boundary.log.
3. node tools/character-3d/runtime-integration-remove-it.cjs --save-boundaries-only
   Five meaningful RED controls, exact byte restore, six-test restored GREEN; runtime-progression-controls.log. Controls: ignore state bytes, ignore write counter, discard dirty proof, omit failed row before validation, ignore dirty constituent proofs. Restored runtime-integration.cjs SHA256 6c6a288d4036501cb9d4d97c9a02e9fbe2e4b02fa8ccafe8e325d96525ac4c9e.
4. node --test --test-reporter=tap --test-skip-pattern='every currently approved production role' tests/character-3d-runtime-save-boundary-test.cjs tests/character-3d-runtime-integration-test.cjs tests/character-3d-integration-workflow-test.cjs
   Final 20 PASS, 0 FAIL, 2151ms; runtime-progression-final.log. The unchanged all45 Node presenter sweep is explicitly excluded locally; parent reports ae9 dedicated job 113792592173 SUCCESS including that prior sweep and old controls. Workflow tests retain all64 family-marker combinations plus integration selectors/aggregation, and runtime routing tests cover runtime alone and with integration/nonplayer markers.
5. git diff --check; node --check tools/character-3d/runtime-integration.cjs; node --check tools/character-3d/runtime-integration-remove-it.cjs
   All exit0.

No full npm, browser download, capture, production/runtime/model/gameplay changes, remote push, or exporter/gallery edits. Local Chromium is unavailable, so actual strict boundaries and original failing-role/call delta remain pending the parent-owned narrow [qa:runtime] CI run. Author source approval and existing images remain separate evidence.
