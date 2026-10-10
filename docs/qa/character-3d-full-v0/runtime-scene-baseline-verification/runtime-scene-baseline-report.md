# Scene baseline readiness correction

Base aa03582df17b597c5fbe4fa663a0840941783880 (treea45ed53138b6e286450d746217b2942343663ab2); isolated /workspace/scratch/150320e8a2fd/rollout-runtime-scene-baseline, branch work/runtime-scene-baseline. Head c0f71010210d081344ea2f848e24bb9b31f6bd8c (clean local commit).

## Actual cause and scope

Raw main SDD/scene-aa035-failure.log records warmup off live0/holders0, then warmup on expected7 versus actual11/holders11 through240frames. All11 are player, four companions shiba/cat_friend/tanuki/penguin_friend and six forms mushroom0/1/7, butterfly1/3/7, with no fallback or failed template. City was never reached. The QA baseline was sampled before the current view had fully completed its renderer work. Initial partial template construction and prior-view sampling are both possible contributors; the available trace proves the stale/partial baseline, without distinguishing their individual contribution.

Renderer source meguru-3d.mjs uses player/party always and resident distance strictly<1500 for 3D, and the normal runtime.actorInfo resolves their production templates. Presenter buildBudget defaults to1 per frame. The old immediate p.stats().live snapshot did not establish readiness against that actor set. This patch corrects that QA contract; no production cleanup/model/gameplay change.

## Three QA files

runtime-integration.cjs: load the actual runtime.actorInfo for the existing browser callback (temporary QA reference deleted finally); hold the same QA simulation step as before, capture its current view/player pose, and resolve all eligible actors with the real production resolver. No stand-ins or overlays. Explicitly draw that held view and wait bounded240frames for exact eligible model/role composition, all attached holders and exact live count before recording baseline/fixtureCount. No fixed sleep or single-RAF assumption. All later characters-on and forest phases require this same exact role/model/stage composition. Reapply the fixture player position/yaw/party placement after normal forest reconstruction so the comparison uses the same view. The player receives a stable diagnostic identity even though its real key is absent; the actor itself is untouched. Baseline/phase snapshots retain modelId/modelStage/composition. validateRepeated independently checks exact baseline and each cycle on/forest composition alongside all original cleanup/cache/save/restoration gates.

character-3d-runtime-scene-diagnostics-test.cjs: extended the declared synthetic renderer fixture to model deferred7→11 construction. The actual QA callback observes at least four frames to finish all11; initial7 is not frozen. Added same-count wrong-template control test. Existing timeout diagnostics, restoration, failed artifact persistence and city cleanup controls remain meaningful. These verify QA logic, not browser rendering.

runtime-integration-remove-it.cjs: two new meaningful controls and --scene-baseline-only; the existing --scene-diagnostics-only selector also includes these new controls for CI without workflow changes. Reusing initial7 instead of eligible ready count fails; accepting same-count substituted composition fails. Every mutation restores exact bytes.

No workflow/gallery/exporter/model/shared runtime source edits. No forced city reset. Original whole-async scene save/storage/getter/write guard is unchanged. City cleanup, resource plateau and actual scene PASS remain OPEN pending the parent-owned narrow rerun.

## Evidence

1. Before new implementation: new targeted tests RED, including exact expected7 versus actual11 warmup timeout; runtime-scene-baseline-before.log. The second missing composition failure originally manifested as an absent error; it now has an explicit assertion.
2. node --test --test-reporter=tap tests/character-3d-runtime-scene-diagnostics-test.cjs: sixPASS; runtime-scene-baseline-focused.log.
3. node tools/character-3d/runtime-integration-remove-it.cjs --scene-baseline-only: twoRED, exact restoration, targeted restoredGREEN; runtime-scene-baseline-controls.log. Restored runtime-integration SHA2568673725a4e5bf6720ec294a2f8a965b9d063b01b9df12c9f2279f7123c6a343c.
4. Final node --test --test-reporter=tap --test-skip-pattern='every currently approved production role' tests/character-3d-runtime-scene-diagnostics-test.cjs tests/character-3d-runtime-save-boundary-test.cjs tests/character-3d-runtime-integration-test.cjs tests/character-3d-integration-workflow-test.cjs:26PASS/0FAIL/2255ms; runtime-scene-baseline-final.log. Unchanged all45 Node/browser sweep reused, not repeated.
5. Same-runtime Module/git-show audit: eleven functional/save/metrics functions byte-identical to both aa035 and6df; runtime-scene-baseline-identity.log has exact hashes. In particular functionalRun/validateFunctional unchanged, preserving actual6df45functionalPASS evidence. New temporary QA actorInfo reference affects only repeatScene.
6. node --check runtime-integration.cjs and runtime-integration-remove-it.cjs; git diff --check: exit0.

Local Chromium is unavailable; no download/fullsuite/images/remote changes. Parent owns review and actual [qa:runtime] [qa:scene] rerun. This corrects the evidenced stale QA baseline; it does not assert that later city/resource/save gates pass before actual evidence.
