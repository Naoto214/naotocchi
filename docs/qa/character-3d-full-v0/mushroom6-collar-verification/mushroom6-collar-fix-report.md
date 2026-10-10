# Mushroom6 remaining forehead blocker

Candidate correction committed; actual replacement image approval OPEN.

- Base `f07fef280059b41e6ab22c2475b0cc5fd3c7c9ca`.
- Head `64f72fb54dabce939e2615020f979640c3fadade`.
- Isolated worktree `/workspace/scratch/150320e8a2fd/mushroom6-collar-face-clearance`, branch `work/mushroom6-collar-face-clearance`; clean.

## Actual diagnosis

Inspected ddaf Mushroom6 original-detail motion board and all four unchanged raw sick JPEGs (idle/walk × normal/reduced), extracted from `docs/qa/character-3d-full-v0/export/ddaf1edf5c4d13254151308996a1727bc705829b/motion-repair-mushroom/raw-evidence.zip`, members `repair-motion/mushroom-6-sick-{idle,walk}-{normal,reduced}.jpg`. Also opened original `assets/characters/mushroom/06.png`. All four sick frames hide the forehead marks behind the white neck collar; the original has this collar directly under the cap, above the face.

The previous guard intersected only the cap, so it missed `collar:opaque`. The expanded assembled-part ray test now reproduces a real collar hit before editing, first in dislike (actual sick rejection remains the image evidence). No Pilot stage is affected.

## Minimal fix and tests

Only production change: stage `mushroom:6` in `character-3d/topology-spec.js`, `collar.at:.50` → `.61`. Preserve collar radius `.30`, height `.12`, scalloped geometry/color, cap tilt/profile/dimensions/crown, stem and entire faceSpec. No factory/default/runtime/Expression/animation/World/gameplay/registry/workflow/2D change. No other stage changed.

`tests/character-3d-player-image-blockers-test.cjs` now checks every non-support assembled part, including collar/cap/dirt/spores. The only exempt mesh is the stem carrying the face; exact position/index equality with the canonical face target is required before exemption, preventing extra occluding geometry from being hidden by that exclusion. The test requires stage6's source collar to exist and actual collar/stem interior overlap, retains cap/stem overlap, complete canonical eye/brow/forehead/mouth ray samples, all32 states with frames6/15/30 and actual expression triangle budget <18000. Stage5/7 strengthened guard also remains GREEN.

`tools/character-3d/player-image-blockers-remove-it.cjs` adds former-low-collar and removed-source-collar controls, updates existing cap error labels to the actual mesh name, and limits --case baseline/restoration runs to that case's stage test. Ordinary full-control behavior remains.

## Evidence

Commands from this worktree; logs main `.superpowers/sdd/1772ca6d6997/`.

- `node --test --test-name-pattern='mushroom 6:' tests/character-3d-player-image-blockers-test.cjs` before production edit: **1RED**, `collar:opaque covers canonical feature` (`mushroom6-collar-before.log`); after single row change: **1PASS**, exit0 (`mushroom6-collar-first.log`).
- Final `node --test --test-name-pattern='^(?!clownfish|fish optional)' tests/character-3d-player-image-blockers-test.cjs tests/character-3d-fungus-wave-test.cjs`: actual Node runner selected **20PASS/0FAIL**, exit0 (`mushroom6-collar-final.log`). The negative filter did not exclude the fish tests; all nine blocker tests plus eleven existing fungus tests ran. No broad suite or browser sweep.
- `node tools/character-3d/player-image-blockers-remove-it.cjs --case='former mushroom6 low collar'`: **1RED**, restored GREEN and exact production bytes (`mushroom6-collar-control.log`).
- `node tools/character-3d/player-image-blockers-remove-it.cjs --case='mushroom6 source collar omitted'`: **1RED**, restored GREEN/exact bytes (`mushroom6-collar-preserve-control.log`).
- `node tools/character-3d/player-image-blockers-remove-it.cjs --case='former mushroom6 cap'`: **1RED**, verifies expanded guard still detects cap clipping with raised collar; restored **1PASS** and exact bytes (`mushroom6-collar-cap-control.log`). Other unchanged RED controls reused.
- Same-runtime base/current identity audit (`mushroom6-collar-identity.log`): **47 other topology stage definitions exact**; all Mushroom6 mesh attributes/indices/colors/meta/canonical faceSpec and all other bone transforms exact, with only collar local/rest y changing. Shared factory, Pilot/registry, fish, rig/animation/runtime and protected Meguru/script files byte-identical to base. Initial script.js read hit Node exec buffer limit; reran with8MB buffer and full audit exited0. No production/test change for that harness issue.
- `git diff --check f07fef28 HEAD`: exit0; clean worktree after commit. Only three scoped files.

Root owns fresh stage6 actual motion/four-view/distance recapture and review after independent code review. Current ddaf stage6 image verdict remains REJECT. Collar translation may change its visible source silhouette; geometry clearance and preserved mesh bytes do not substitute for actual image judgment. No new approval for Human/iPhone/runtime or continuous animation.
