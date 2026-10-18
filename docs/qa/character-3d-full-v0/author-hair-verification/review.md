# Author hair source correction — independent code/spec review

Reviewed clean worktree `/workspace/scratch/150320e8a2fd/nonplayer-author-hair-source-fix`, exact base `5be8349be8f73401eb8c56d4f7dc27f74ab930d3` through head `711f2dcb6836f27370b8155483f466ea312458df`. Read the actual-image finding, full four-file diff, report, affected/topology/identity/control evidence and exact identity audit script. Reused the unchanged original Naoto PNG inspection. Independently compared source inputs and shared-factory bytes and checked restoration hash/whitespace/clean status. No implementation edits, broad verification replay or images.

**Scoped code/spec PASS. Critical: 0. Important: 0. No actionable minors. Author's actual-image rejection remains OPEN pending fresh capture/inspection.**

## Scope and geometry intent

The sole production edit is `author:naoto` hair. Its former broad crown becomes a smaller rear crown, and the existing eight closed locks now sweep outward and down toward temple/ear level. Their count, radius, taper, steps, radial tessellation, outward cap option, dark-brown color and head ownership remain unchanged. No new geometry constituent is added. The source-fidelity target matches the recorded e169 image rejection: existing waves were hidden beneath a smooth cap and the central forehead opening was absent.

Independent deep-strict comparison confirms **all 42 nonauthor rows unchanged, including signed zero**. Every author nonhair input is exact; only cap dimensions/position and lock centerlines change. Shared humanoid factory is byte-identical to the base. The supplied same-runtime produced-geometry audit checks all 42 other candidate rigs and author nonhead geometry/bones/transforms/face defaults exactly; its V8 normalization preserves signed zero. Prior player/default evidence is therefore reusable. There is no QA-route, alias, natural memory-lake fallback, registry, renderer, gameplay/save/World/Home/Expression/2D/workflow edit.

## Assembled visibility and physical regressions

The new visibility test casts rays against the complete produced head mesh. Nine central-forehead rays require first-visible skin rather than dark hair. Dense side rays measure first-visible lock surfaces from crown to ear level, outer side extent and at least six distinct visible lock constituents. Constituent attribution uses actual indexed shells, so buried path declarations or detached isolated lock bounds cannot satisfy the test. This directly addresses the prior false confidence from a `center` style field/eight hidden waves.

A second regression traverses actual closed-volume interior contacts from the skull to every ear/crown/lock constituent. All twelve produced shells must reach the skull; actor ownership alone is insufficient. Existing finite/closed/floor/expression-budget, rest/all-32 contact graphs, nonempty actual eye/mouth ray clearance and outward indexed cap tests remain unchanged and were rerun for the altered geometry. Fixed lock tessellation/cap resolution and unchanged constituent counts preserve the prior triangle margin.

These checks support the intended physical correction. Front-visible skin and individual swept surfaces cannot substitute for actual rendered center-part/wave likeness across front/34/side/back and all state/distance views. The image gate remains root-owned.

## Evidence and controls

Inspected `author-hair-fix-affected.log`: **six substantive existing geometry tests PASS**, covering all 32 states, in 23.280 seconds. Its TAP total of seven includes an empty name-filtered file-level PASS, correctly excluded from the asserted geometry count. `author-hair-fix-topology.log` records **two new substantive tests PASS**, 1.264 seconds. Total substantive affected assertions: **eight PASS**.

The old complete hair, old cap alone and old buried waves alone each fail their intended assembled visibility assertion, followed by the restored two-test baseline GREEN. The initial before-fix evidence likewise fails the forehead-opening test. This verifies that both the cap and lock changes are meaningful to the lost source presentation. The old-wave failure-token correction calibrates the control to its observed ear-level assertion; it does not weaken the production test.

The existing face-occlusion control updates only its stale cap-position anchor. Its original move over the face remains unchanged, produces RED at actual canonical-feature occlusion and restores the selected face baseline GREEN. All **four scoped controls RED → restored GREEN** are recorded; unrelated controls were appropriately reused. New source-hair controls are located at `tools/character-3d/author-hair-remove-it.cjs`, while the prior tool remains `tools/character-3d/author-remove-it.cjs`.

Independent current source SHA256 matches both final control logs: **`0c08eb13de00257777206d2c40f9b74d4233414ebde000d52216761eddf9d1fe`**. Worktree is clean and whitespace check passes. Supplied execution/produced-rig audit results were inspected rather than replayed broadly.

No code correction is required before narrow integration and fresh Author capture. The e169 actual-image I1 must remain rejected/open until the new source-specific image gate passes; this report grants no image approval or promotion.
