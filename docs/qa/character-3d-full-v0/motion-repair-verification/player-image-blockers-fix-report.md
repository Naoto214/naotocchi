# Bounded player motion image blockers fix

Candidate implementation complete; independent review and replacement image verdict OPEN.

- Base: `9528525d3a83b677e92e9fde99fe59c2447f4ee7`.
- Head: `e30be553bb14225ed6f173282bcacae37ed05c0a`.
- Worktree: `/workspace/scratch/150320e8a2fd/player-motion-image-blockers`, branch `work/player-motion-image-blockers`; clean after local commit. No remote save/push/capture.

## Evidence and diagnosis

Read `player-motion-topology-review.md` and `player-motion-early-five-review.md`. Their actual-image verdicts remain REJECT until replacement captures pass. Original evidence source `ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f`, overall run `37922214774` failure; individual relevant capture jobs succeeded. This worker inspected Mushroom5/6/7 and Clownfish2 motion boards, extracted unchanged raw Mushroom5 tired, Mushroom6 sick, Mushroom7 sick and Clownfish2 dislike JPEGs, and opened the three original mushroom PNGs. The early-five reviewer separately confirmed all20 affected clownfish dislike cells.

The three mushroom cap overrides replace the whole Pilot8 cap object, dropping its backward tilt. The broad front rim then blocks projected eyes/brows/forehead marks. The five spread-fin clownfish rows select `.94*body.w` root placement: the origin sits outside the actual closed body flank, even before the dislike pose reveals the gap. Source spread angles and cap/stem dimensions remain appropriate; rebuilding either family is unnecessary.

Affected stage keys are precisely `mushroom:5`, `mushroom:6`, `mushroom:7`, `clownfish:2`, `clownfish:3`, `clownfish:5`, `clownfish:6`, `clownfish:7`. All are nonPilot. Stage5 school fish inherit the owning spec and receive the same fin-root correction.

## Implementation

Only three production files:

- `character-3d/topology-spec.js`: add backward cap tilt stage5 `-.55`, stage6 `-.32`, stage7 `-.55`. Stage5/7 need more tilt than Pilot8 to clear the complete field under tired/dislike/sick posture. Preserve cap radii/heights/profiles/spots, stem dimensions, stage7 roll/lean/spores, collar and dirt.
- `character-3d/fish-spec.js`: five bounded clownfish rows add `fins.rootFactor:.80`, preserving `.8` spread and all source dimensions/colors/face settings.
- `character-3d/archetypes.mjs`: one expression becomes `sp.fins.rootFactor ?? (sp.fins.spread ? .94 : .8)`. The existing default branches remain exact. Parent explicitly authorized this necessary narrow opt-in before edit.

Four test/control files:

- `tests/character-3d-player-image-blockers-test.cjs`.
- `tests/fixtures/character-3d-fish-before-image-blockers.mjs` (only frozen base fish factory; current unchanged geometry/rig helpers).
- `tests/fixtures/character-3d-fish-image-blocker-default-inputs.json` (three frozen Pilot clownfish inputs + one spread-fin salmon input; no mutable current candidate rows frozen).
- `tools/character-3d/player-image-blockers-remove-it.cjs`.

No Expression/animation/rig/renderer/gameplay/World/Home/2D/save/registry/promotion/workflow edits. No mesh topology or triangle count added; changed transforms remain actor-owned.

## Focused checks

All commands below ran from the worktree. Logs are in main `.superpowers/sdd/1772ca6d6997/`.

1. `node --test tests/character-3d-player-image-blockers-test.cjs` before production edits: **0PASS/8RED**, actual assertions for all eight defective stages (`player-image-blockers-before.log`).
2. Initial `-.32` mushroom tilt plus fish opt-in: **6PASS/2RED**, remaining Mushroom5 tired and Mushroom7 dislike obstruction (`player-image-blockers-first.log`). Stage5/7 then use `-.55`; same geometrical cause, no shape rebuild.
3. Final `node --test tests/character-3d-player-image-blockers-test.cjs tests/character-3d-fish-wave-test.cjs tests/character-3d-fungus-wave-test.cjs`: **25PASS/0FAIL**, exit0 (`player-image-blockers-final.log`). Nine new tests + five existing fish + eleven existing fungus. Existing vendor MODULE_TYPELESS_PACKAGE_JSON warning remains unchanged.
4. `node tools/character-3d/player-image-blockers-remove-it.cjs`: the eight former-stage controls each yielded expected **RED** and restored exact production bytes. The final legacy-default mutation also failed correctly, but the initial harness expected its diagnostic to say `exact bytes`; actual failure was the earlier `local transform` comparison. Harness label corrected; no production/test expectation weakened (`player-image-blockers-controls.log`, retained honestly).
5. `node tools/character-3d/player-image-blockers-remove-it.cjs --case='legacy spread root changed'`: **1RED**, followed by restored **9PASS/0FAIL**, exit0 (`player-image-blockers-default-control.log`). Together with the eight unchanged RED stage controls, nine distinct negative controls are established. The tool supports a full nine-case replay, which was not repeated unnecessarily.
6. `node /workspace/scratch/150320e8a2fd/character-rollout/.superpowers/sdd/1772ca6d6997/player-image-blockers-identity-audit.cjs`: exit0 (`player-image-blockers-identity.log`). Exact geometry attribute/index bytes, bone/mesh transforms, owners/meta and canonical faceSpec against the base builder on the same Node runtime. **28/28 Pilot roster** =26 player definitions + two legacy reused role inputs; **38 unique unchanged rigs** total, including all11 unaffected fish stages and all5 unaffected mushroom stages. All unaffected fish/topology stage definitions exact. Reversing the one opt-in expression makes the entire shared factory file byte-identical to base, proving all other factory functions unchanged. Temporary base module deleted in finally. Initial audit mistaken 28-player-only count was corrected to the actual26+2 roster; no missing definitions accepted.
7. `git diff --check`: exit0. Final worktree clean after commit.

Mushroom guard assembles actual hybrid canonical faces and all32 emotion/moving/reduced combinations, samples frames6/15/30 at1/30 sec, casts rays through produced cap triangles from front and both3/4 directions at actual capture elevation `.175`, covers produced front eye vertices plus forehead/brow/mouth atlas footprint, checks true cap/stem volume overlap, and asserts total actual expression triangles below18000. Clownfish guard uses the actual closed body face target, requires root penetration deeper than`.004` in both ray directions and at least three actual indexed root-fan triangle interior samples within body volume. It covers both fins, all32 states, frames6/15/30, and stage5's two child fish too. This establishes attachment beyond ownership or bounding boxes.

## Remaining gates

Root owns fresh32-state motion, four views and normal-distance captures for the eight changed stages, followed by actual-image review. Numerical clearance does not itself approve the larger backward cap tilt's source silhouette or the visible fin join. Keep original REJECT verdict until that review. Unchanged rows can reuse prior image acceptance because inputs/produced geometry are unchanged; no new Human/iPhone/runtime/continuous-animation claim.
