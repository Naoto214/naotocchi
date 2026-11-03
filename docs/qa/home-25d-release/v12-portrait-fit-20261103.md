# V12 portrait fixed-lane fit

Base: `47bfc2dc3af0949510ea347b049b7adbefde5b4b`, PR #490 (Draft).
The owner superseded the comparison request and authorized updating the existing owner-private V12 after focused verification. No comparison Site is published.

## Change

Portrait reserves the permanent band from the bottom of the 42px notice plus 2px to the top of the 76px comment minus 2px. The controller supplies an envelope covering its legal movement bounds, existing depth scale, alpha/attachment extents, every possible pet expression, and motion clearance. Current actor positions and current notification/expression visibility are not inputs to the fit. One uniform display scale is the largest that fits this reserved envelope and the available width; the same transform applies to residents, background and shadows.

The native stage remains 380px high. Cast layout reads inverse-transformed dimensions, rounded to native pixel precision, to prevent feedback and repeated crowd shrinking. World navigation, movement bounds, collision and save logic are unchanged. All existing crowd sizing runs once in native space. Input is inverse-transformed to that same space. The frame clips painting at the safe band as a final guard. Long notices/comments scroll inside their own fixed lanes without changing fonts or central choices.

The full-landscape overview and requested jellyfish image from the base are retained. Existing portrait chrome, 9 meters and 5+4 controls are retained. No existing formal art, background files, other games, main or production Pages are modified.

## Focused validation

- 44 focused Node tests passed. The new maximum-fit test first failed with missing `portraitFit`, then passed, including pointer inversion and idempotent calculation. Existing V7–V12 notice/interaction/layout tests were reused.
- Chromium iframe viewport: 375×667 single resident, 375×667 28 residents, 320×568 single/6/28 residents; native height 380, all 9 meters and 9 controls, no document overflow.
- 375×667: notice ends at134, comment begins392; permanent painting pane136–390 (254px). Single-resident example scale60.77%; 28-resident example63.66%. Observed 28 wrapper vertical range approximately192–371, inside the band.
- 320×568: notice ends134, comment begins293; painting pane136–291 (155px). Six-resident example38.37%; 28-resident38.85%. Observed 28 wrapper range approximately175–280. Smallest wrapper about11.6px high: this remains a severe readability constraint on this viewport, not a claim of a comfortable UI.
- Hungry expression actual SVG ink at320×568 measured approximately198–214, inside134–293. All expression kinds are reserved before display, not measured only when visible.
- Real pointer drag during ordinary comment returned `select=true` and `move(..., drag)=true`, with `blocked=false`, scale60.77% and the same136–390 frame before/after.
- New jellyfish image loaded completely at1254px native width.
- Ordinary comment leaves `blocked=false`; walking and pointer processing continue. The selected central question leaves `blocked=true`, with the same frame/scale retained.
- Rotation to844×280 with28 residents: left pane384×272, native height380, all28 resident wrappers within the pane, 9 meters/9 controls and no document overflow. Return to portrait restores the same fit.
- A deliberately long story notification initially painted125.58px into the game band. After the fixed-lane overflow rule it measures42px with126px scrollable content, preserving its full text.
- Independent narrow review found no actionable blocker in projection/inversion/resize handling.

## Limits

These are Chromium checks, not a new iPhone Safari physical-device pass. Exhaustive species/state/browser coverage was not run. Very small screens with28 residents necessarily have tiny residents, as quantified above. The previously reported purple line was not reproduced; no parameter styling was removed speculatively.
