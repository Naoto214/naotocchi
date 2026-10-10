# Read-only natural city cache scope audit

Observed main source HEAD 9528525d3a83b677e92e9fde99fe59c2447f4ee7. No production or QA edits, tests, browser run, or commit in this audit. Actual repeated CI had not reached city when the audit was requested.

## Concrete original behavior

Both whole source blobs equal immutable Pilot d12ad70550b29c125f44ac2b32d7195905fb15f0:

- meguru-3d.mjs: Git blob31bc67d0270d7355de37ccd3af950fc18ffece94 (Pilot and current).
- character-3d/runtime.mjs: Git blob272821c0a515e471e09385fe6f197b6d5875d9b4 (Pilot and current).

Verified with git rev-parse <Pilot>:<file> HEAD:<file>; git diff <Pilot> -- meguru-3d.mjs is empty. Therefore the rollout does not introduce a new lifecycle implementation in these files.

meguru-3d.mjs createHybridRenderer retains one `r3d` object. `want(view)` excludes non-WORLD3D_REGIONS and corridor/force2d/failure. Natural city draw takes the non-want branch, calls setActive(false), and draws r2d. setActive only calls r3d.show(on) and sets 2D canvas background. At line659, show(false) assigns gl.style.display='none'; it does not dispose/reset/endFrame. The GL canvas is `.meguru-3d-canvas` (line116). While city frames use r2d, the prior forest renderer.scene and its presenter instances remain reachable but hidden and are not submitted for3D draws.

On the next eligible3D draw, create3DRenderer.draw checks sceneOf!==view.world (line488), disposes the prior scene and builds the new scene. disposeScene resets presenter (line649) and disposes world actor materials, mesh/board/shadow/sky resources. Presenter.setScene also resets on changed scene; endFrame drops actors not seen in a3Dframe. Hybrid destroy calls r3d.destroy; meguru.stop calls renderer.destroy (meguru.js9204). Module-global finite lazy template geometry/materials remain cached intentionally; instance disposal removes holders without destroying shared resources.

`setChar3D(false)` is a different operation: char3dChanged immediately resets presenter (line667). It does prove live0/holders0 for character-flag2D. Natural world2D does not call it. No new3Dworld is built in city, so disposeScene is deferred until forest reentry or destroy.

## Existing contracts and evidence boundaries

Full rollout design Runtime validation requires repeated region/2D switching, cleanup/cache growth and no saved-state mutation; plan Task3 calls for finite lazy cache/presenter behavior and says to add unused-template policy only if repeat-travel evidence requires it. User boundaries preserve World/Home and Pilot semantics. Neither design nor plan explicitly mandates that an inactive, hidden3Drenderer must have zero cached instances on every natural2Dworld frame.

architecture.md line178 says region switching '(scene reconstruction)' resets and2D↔3D resets. Permanent character-3d-test.cjs test23 verifies presenter.setScene(new THREE.Scene()) and disposeScene source. Test24 explicitly p.reset() '=setChar3D(false)' rather than natural city. Thus those tested contracts do not establish natural-city live0.

The original immutable Pilot meguru-qa script does assert inCity.live===0. However its regionSwitch occurs immediately after renderer.char3dHooks({}), whose char3dChanged resets presenter; then city is entered before a required fully-populated forest draw. Therefore an old PASS can reflect this preceding QA reset and does not prove the independent natural forest→city path clears instances. This is a code-order explanation, not a measured reconstruction of historical timing.

## Finding

Existing natural2D semantics retain one hidden most-recent3Dscene until the next3Dscene or destroy. Retained city live/holders alone is consistent with that original implementation and is not by itself evidence of unbounded growth, visible ghosts, or a new rollout leak. It also is not a proof of acceptable bounded behavior in the actual new run: visibility, scene identity and repeated plateau still need actual evidence. A cache-growth/resource-disposal failure on reentry remains a genuine gate failure.

The current strict `city live0/holders0` assertion is stronger than this unmodified natural2D path. This audit does not weaken it, add a forced reset, or mark a failure PASS. Documentation has an ambiguity between character-flag2D cleanup and inactive-world3D-cache retention; any acceptance-protocol change requires explicit controller/reviewer contract resolution before final QA can claim completion.

## Minimal permissible next action if CI reaches city and reports retained instances

Keep the failed JSON/verdict. Add only read-only QA observations to the existing city snapshot: computed `.meguru-3d-canvas` display/visibility, number of GL canvases, exact retained scene identity relative to pre-city, holder/model keys, before/after created/removed/template/material/texture/geometry counts over bounded cityframes. On forest return, capture both old and new scene identities, verify old scene holders are removed by normal reconstruction, exact new eligible roster/holder balance, and three-cycle resource plateau. Compare with the already byte-identical Pilot behavior; do not recapture models or alter production World code.

If those observations prove hidden single-scene retention and disposal on reentry with no growth, report it as preserved legacy caching plus the stronger QA-policy mismatch for review; resolve the intended acceptance criterion rather than introducing a hidden reset or changing production to make the assertion pass. If they show visible GL, extra scenes/holders or continuing resource growth, retain the failure and investigate that concrete leak within authorized scope. Actual natural city evidence remains OPEN until reached.
