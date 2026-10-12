# Eagle lowered-wing correction — independent code/spec review

Reviewed clean worktree `/workspace/scratch/150320e8a2fd/nonplayer-eagle-source-fix`, exact base `d7dc8973d7acfadb9298712505bb8735ffdbf0ce` through head `a7c955a1cb6dfd38787c8cd1d458a97647a75b50`. Read the actual-image finding, complete three-file diff, implementation report, six-case baseline and four scoped control logs. Reused the unchanged original PNG inspection from Task 9. Made one read-only produced-geometry/data/budget probe; no implementation edits, screenshots or broad verification replay.

**Scoped code/spec PASS. Critical: 0. Important: 0. No actionable minors. The Eagle actual-image rejection remains OPEN until fresh capture and inspection.**

## Scope and produced source correction

Independent deep-strict comparison confirms **all 41 other rows unchanged, including signed zero**, and exact table keys/order preserved. Only the **22 existing Eagle feather paths** change: seven primaries and four brown coverts on each wing. Every feather's count, width/depth/color/tip fields and all Eagle non-wing fields remain exact. No body/head/beak/ruff/tail/talon/face/motion/placement or shared factory change occurs. Consequently the prior full affected-bird default audit remains applicable.

The actual image finding was the former shallow sideways wedge silhouette, with distal feathers terminating well above the feet. The revised paths extend the same owned geometry downward and inward; they do not add meshes to the narrow budget margin. Independent actual indexed-constituent world-space measurements confirm the physical change:

| Four pale primaries, one wing | Rejected paths | Corrected paths |
| --- | ---: | ---: |
| Minimum height above talon floor | 0.248–0.299 | 0.060–0.120 |
| Vertical extent per feather | 0.269–0.291 | 0.499–0.508 |
| Vertical/horizontal extent ratio | 0.414–0.639 | 1.369–1.803 |
| Lowest brown covert above talon floor | 0.290 | 0.203 |

The unchanged source identity and this measurable descent support the requested localized correction. They cannot establish that the rendered front/34/side/back silhouette now matches the PNG; that remains root's actual image decision.

## Regression quality and retained integrity

The replacement source test uses each actual constituent's triangle indices, transformed through its produced mesh matrix. It no longer treats a merged local AABB or a source coordinate declaration as evidence of descent. It checks all four pale primaries' near-talon clearance, vertical drop and aspect, the lower covert's descent and whole-wing width/height. Distal dark color is independently required on every pale primary, eliminating the former horizontal-position shortcut that could count brown geometry instead.

The all-32-state branch verifies distal ground clearance while preserving the existing legitimate upward wantsPlay flap. Rest source-pose constraints and animated physical constraints are appropriately distinct; animation is neither changed nor frozen for the regression. Existing actual all-constituent interior-contact graphs and nonempty eye/mouth ray checks remain unchanged and were rerun in the affected baseline. No closure/default requirement was relaxed.

Inspected `eagle-source-fix-baseline.log`: **6/6 PASS**, no skips/failures, 42.953 seconds, covering finite/closed/ground/budget, Eagle canonical face through all 32 states, resting and all-32 constituent contact, source anatomy and new world-space silhouette/animated clearance. Independently counted the actual expression meshes: maximum remains **17728**, with the existing 272-triangle margin below 18000. Shared `plumed-bird.mjs` remains byte-identical.

## Meaningful RED controls and restoration

The former exact primary centerlines are restored by `eagle former shallow primary wedges`; its supplied log records RED at the near-talon source assertion and restored selected baseline GREEN. The initial before-fix log independently shows the old first pale primary at **0.2990000093** above talons. My old/new produced-geometry comparison confirms why the same final assertion rejects the old source. The new regression therefore detects the actual lost source extent, rather than merely requiring changed candidate data.

The former short upper coverts control fails the dedicated lower-covert descent assertion. The updated detached-primary control still moves only constituent 6 away and fails actual shell-to-owner connection; dark-tip replacement fails the per-primary distal-color assertion. All **four scoped controls RED → restored GREEN** are recorded, and both production buffers restore byte-for-byte. The unaffected Task 9 defaults/Snowman evidence and thirteen unchanged controls may be reused; no full batch replay was needed.

Independent final hashes match every scoped restoration log:

- source: `6c4729072503e5b686473a8d8438118ba0a5c21c02e767b22634902332e13533`
- unchanged bird factory: `b620a99327b2352236ec21cc1adcb5a33f83b092773ca31c5ccec30cae33e0b9`

Worktree is clean and whitespace check passes. Root must preserve its newer Snowman registration expectations when integrating this older test boundary. No code correction is required before fresh Eagle capture; actual image, integration/CI and device/save gates remain separate.
