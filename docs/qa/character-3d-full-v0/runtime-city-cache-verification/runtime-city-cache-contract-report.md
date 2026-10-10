# Natural city cache QA contract correction

Base c0f71010210d081344ea2f848e24bb9b31f6bd8c; branch work/runtime-city-cache-contract in /workspace/scratch/150320e8a2fd/rollout-runtime-scene-baseline. Head23b351b61291ff309fceda6cf1af1e6de3e7975d (clean local commit). Root explicitly authorized this QA correction after the read-only immutable-Pilot audit; no production lifecycle change.

## Why the prior city-zero assertion was wrong

See runtime-city-cache-scope-audit.md. Whole meguru-3d.mjs and character-3d/runtime.mjs match immutable Pilot d12ad705 exactly (Git blobs31bc67d0270d7355de37ccd3af950fc18ffece94 and272821c0a515e471e09385fe6f197b6d5875d9b4). Natural city dispatch goes through setActive(false)→show(false), whose actual preserved body only sets GL canvas display='none'. It retains the latest hidden forest scene until a new3Dscene draw or destroy. Character flag setChar3D(false) separately resets presenter and must have live0/holders0.

Therefore insisting natural city has zero cached instances was QA overreach against protected original behavior, not evidence of a newly introduced production leak. Previous standalone city test ran immediately after char3dHooks({}) reset, which could mask the policy mismatch. No actual repeated city had been reached in the prior failing runs; this patch does not claim city PASS from source alone.

## Five QA files

- runtime-integration.cjs: validateCityCache requires natural is3D=false, actual computed GL display='none', same GL canvas/scene/holder object identities, exact retained live/holder/canvas bounds, and unchanged templates/materials/atlases/eye geometry/textures/geometries/created/removed counts versus pre-city. Repeated callback captures reference identities read-only and retains cacheProof even if later forest readiness times out. Explicit character-off still requires live0/holders0. Ready baseline and all on/forest exact model/role/stage composition, resource plateau, save/getter/storage/write counters and restoration requirements remain unchanged.
- meguru-qa.cjs: the older standalone natural-city assertion uses the same cache validator with pre-city reference/resource capture and actual DOM visibility proof. It preserves natural dispatch; no forcedreset. Forest holder/live check remains.
- character-3d-runtime-scene-diagnostics-test.cjs: the declared VM scene now executes the actual show(on) body extracted from preserved meguru-3d source instead of simulating zero-live city cleanup. Same hidden cached identities pass; visible GL, substituted holder, extra live count and material growth fail. Existing six diagnostics/baseline tests including deferred7→11 and same-count wrong-template remain PASS.
- character-3d-runtime-integration-test.cjs: pure repeated result fixture declares hidden retained cache rather than cityzero; existing negative checks extended for visibility/identity/resource growth, without freezing current candidate rows.
- runtime-integration-remove-it.cjs: migrated stale cityzero anchor to retained-live-bound guard and added three new scoped controls (visible GL, new holder identity, growth), --city-cache-only. Existing --scene-diagnostics-only includes all affected city controls for CI without workflow edits.

No renderer/runtime production source, world/home, gameplay, models, registry, screenshots, workflows, exporter or gallery edits. No suppression of saved-state writes or getters; original whole-async scene no-save-mutation guard remains strict.

## Focused evidence

1. Before correction, targeted source-show contract test RED: legacy cached live2 was rejected by old cityzero; runtime-city-before.log.
2. Focused scene suite:7PASS, including both standalone baseline tests; runtime-city-focused.log.
3. node tools/character-3d/runtime-integration-remove-it.cjs --city-cache-only:4RED (migrated live-bound +3newcontrols), exact restore and restored focusedGREEN; runtime-city-controls.log. Runtime-integration restored SHA256ec2a8a81b43778305b61d9f4ffe98b508024035746ad93801f01f77c436cf1d9.
4. Final node --test --test-reporter=tap --test-skip-pattern='every currently approved production role' tests/character-3d-runtime-scene-diagnostics-test.cjs tests/character-3d-runtime-save-boundary-test.cjs tests/character-3d-runtime-integration-test.cjs tests/character-3d-integration-workflow-test.cjs:27PASS/0FAIL/2417ms; runtime-city-final.log. Unchanged all45 actor sweep intentionally not repeated.
5. Same-runtime source identity audit: eleven functional/save/metrics functions exact to c0f71010 AND6df4db58; whole production renderer/runtime exact to Pilot; SHA256 values in runtime-city-identity.log. Actual6df45functionalPASS remains source-qualified and reusable; no new45 capture.
6. node --check runtime-integration.cjs, meguru-qa.cjs, runtime-integration-remove-it.cjs and git diff --check:exit0.

Actual browser natural-city visibility/retention/bounds, forest reentry, repeated resource plateau, saved-state proof and metrics remain OPEN until parent-owned [qa:runtime] [qa:scene] CI reaches and validates them. Local Chromium unavailable; no download, fullsuite, remote push or image recapture. Retained hidden cache acceptance is bounded by the original contract and newly explicit defects; this report is not actual browser PASS.
