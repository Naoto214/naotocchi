# Independent natural city cache contract review

Reviewed clean head `23b351b61291ff309fceda6cf1af1e6de3e7975d` against `c0f71010210d081344ea2f848e24bb9b31f6bd8c` in `/workspace/scratch/150320e8a2fd/rollout-runtime-scene-baseline`. Read exact five-file QA diff, read-only scope audit, candidate report, tests/controls and identity/restore logs. No implementation edits, broad reruns or captures.

**Code/spec result: C0 / I0.** The controller-authorized QA contract correction matches protected Pilot behavior. It is not actual browser city acceptance.

## Independent semantics check

Independently queried immutable Pilot `d12ad70550b29c125f44ac2b32d7195905fb15f0` and candidate HEAD Git objects:

| Production file | Pilot and candidate identical blob |
| --- | --- |
| `meguru-3d.mjs` | `31bc67d0270d7355de37ccd3af950fc18ffece94` |
| `character-3d/runtime.mjs` | `272821c0a515e471e09385fe6f197b6d5875d9b4` |

Read the natural draw path: city is outside the eligible3D world set; the hybrid renderer calls `setActive(false)` and draws its2D renderer. `setActive` calls `r3d.show(false)`, whose preserved body assigns GL display none. It does not reset the presenter or dispose its forest scene. A later eligible3D draw detects a new world object, disposes the old world scene and resets the presenter; explicit `setChar3D(false)` independently invokes `char3dChanged`, which resets instances immediately. Destroy also releases the renderer. These are distinct existing operations; natural city live0 was stronger than the protected implementation.

The former standalone QA entered city immediately after clearing fallback hooks, which itself resets the presenter. Its old zero count therefore did not independently prove natural forest-to-city disposal. This is source-order evidence, not a historical timing reconstruction. Parent explicitly authorized the correction after resolving that mismatch; no production World/Pilot alteration is involved.

## Spec and quality

- Natural city still must be2D with every actual GL canvas computed display none. Reference comparisons require identical scene, exact holder objects and exact GL canvas objects before/after city. Live, holder and canvas counts must equal pre-city values, as must all six template/material/atlas/eye/GPU resource counts and created/removed counters. This permits the preserved hidden cache while rejecting changed identities, extra retained instances/canvases and resource growth.
- The repeated callback takes these observations read-only, retains the city cache proof in phase diagnostics even if forest readiness later fails, and continues through normal forest reconstruction. The standalone natural-city QA uses the same validator and a ten-frame city observation. Neither path calls a reset to manufacture success.
- Explicit character-off still requires live0 and holders0. Ready baseline and each on/forest phase still require exact production role/model/stage composition with matching attached holders. Forest live/holder balance, actor count, fallback/template failures, three-cycle warm resource plateau, created-minus-removed balance, whole-interval save/storage/getter/write checks, restoration and retained failure verdict are unchanged.
- Updated pure fixtures declare the now-explicit hidden cache semantics instead of assuming cityzero. The callback fixture executes the actual preserved show implementation extracted from renderer source. It adds meaningful visible-GL, replacement-holder, extra-live and material-growth negatives; it retains the baseline7→11, wrong-template, timeout, restoration and failed artifact tests.
- The migrated old city-zero control checks the exact retained-live bound; three additional scoped controls remove visibility, holder identity or resource growth checking. Each must fail an assertion and restore exact helper bytes. Existing scene-controls selection includes the affected city controls for CI.
- Functional/save/animation/appearance implementations remain unchanged according to exact diff and eleven-function identity audit. No production file, model/registration, World/Home/gameplay/save/Expression/2D, workflow, image/exporter/gallery path is edited. Ordinary capture requests remain separate; this patch creates no source image evidence.

## Verification

Independent narrow command:

```sh
node --test --test-reporter=tap tests/character-3d-runtime-scene-diagnostics-test.cjs
```

**7/7 PASS, 231.706097 ms.** This verifies actual extracted QA callback behavior with declared synthetic renderer state, including preserved hidden cache and rejection of the new defects. It does not run actual browser/WebGL city travel.

Reused worker27/27 PASS and four meaningful assertion RED controls with exact restore. Independently checked `git diff --check` and restored helper SHA256 `ec2a8a81b43778305b61d9f4ffe98b508024035746ad93801f01f77c436cf1d9`, matching the log. No all45 sweep or mutation replay was necessary.

## Open evidence

No actionable minor. Actual browser city had not been reached in the preceding failures. Pilot byte identity explains intended semantics; it does not certify the new runtime observations. The parent-owned narrow CI must still prove actual hidden cache identities/bounds, return-to-forest exact roster, warm resource plateau, whole-interval save invariance, lifecycle and metrics. An actual visible ghost, changed retained identities, growth, failed reentry or dirty save remains a failure. Existing6df45 functional evidence and independent source-image decisions retain their separate provenance.
