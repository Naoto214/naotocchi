# Live versus saved scene diagnostic delta fix

Original base `172bc67e123727705bf2f5f1e4f1569f7de0292a`; immediate parent `577c2177c30d948605362e1cd1687867d4faa00e` (separate one-line asset-buffer fix); this commit `6347908322ed048cf55c972123b878220458dc11`. Worktree `/workspace/scratch/150320e8a2fd/asset-integrity-buffer`.

Root actual172 scene job113841589545 failed `setup exact state delta`: live Playwright delta entries preserved own `before: undefined` on absent city map fields, while the derived expected entries had passed JSON serialization and omitted that property. Actual substantive fields match the known one-time seed. The prior serialized-only fixture and rawJSON replay missed this live transport representation. Reproduced the exact same assertion/diff in a live-preserving callback fixture before changing implementation.

QA-only changes in three files:
- `tools/character-3d/runtime-integration.cjs`: local diagnostic endpoint comparison removes only own optional `before`/`after` properties whose value is undefined from both computed and supplied diagnostic entries. Apply equally to setup and warmup/city state/storage delta comparisons. Unknown paths, values and extra metadata stay exact. Raw state/storage, initial/strict snapshots, save calls/provenance, counts and validation gates are untouched.
- `tests/character-3d-runtime-scene-diagnostics-test.cjs`: explicit live-preserving structured clone transport and existing JSON transport; paired regression confirms three absent-field entries retain `before` in live form and omit it in saved form, both validate, raw whole-span evidence remains byte-equivalent, and an unknown path fails in both.
- `tools/character-3d/runtime-integration-remove-it.cjs`: one new scoped helper-identity negative control; included in existing diagnostics scope, no new workflow/job/framework.

Focused evidence under `/workspace/scratch/150320e8a2fd/`:
- `runtime-live-delta-before.log`: new paired regression RED with the exact `setup exact state delta`/`before: undefined` difference.
- `node --test tests/character-3d-runtime-scene-diagnostics-test.cjs`:15PASS0FAIL, `runtime-live-delta-after.log`. Includes preserved known setup, unknown fields/storage/provenance, recurring cycles, dirty-restored boundaries, restoration, roster/resources/city cache checks.
- `node tools/character-3d/runtime-integration-remove-it.cjs --scene-live-delta-only`:1/1 meaningful assertion RED when endpoint comparator is identity; exact bytes restored and focused GREEN. `runtime-live-delta-control.log`. Final runtime script SHA256 `5a6358976385f279e39ac950f6af7585613d127dc770dbdb0b42cf80aa536b05`.
- `runtime-live-delta-identity.log`:16 old exported function bodies are exact versus172, including validateRepeated, repeatSceneInBrowser, production45, raw saveDelta/saveSnapshot, save observer/counter, metrics and city/resource validators. Only validateSceneSetup changed. Reuse prior9 guarded controls because their functions/guards are unchanged; no full replay, production45 or images rerun.
- `git diff --check 172bc67e123727705bf2f5f1e4f1569f7de0292a HEAD`:exit0; clean worktree. All four total files versus172 are QA test/tools (one separate asset-buffer line plus this three-file commit). Production/Pilot/World/Home/save/model bytes unchanged.

Independent review and fresh actual scene CI remain required. Source172 actual FAIL and f07 old whole-span FAIL remain honest; no fresh scene PASS is claimed locally. No saves/getters were normalized, reset, suppressed or substituted.
