# Landscape framing correction — 2026-10-13 JST

The user rejected camera candidate `6ba125c` after physical iPhone inspection:
「だいぶ視点さがって、前より悪化した」. Its automated passes did not establish
acceptable composition. This checkpoint supersedes that camera candidate, not the
approved landscape control layout. Keep PR #379 Draft, unmerged; no deployment.

## Root cause and audit

1. Camera code in pre-default baseline `499eee66714ad7f33ba7ecd881aa757ba92d0bd7`
   equals the pre-adjustment `44a1415` camera block byte-for-byte. Default startup
   itself did not alter camera math. Original focal length F=0.95W narrows vertical
   view and lowers elevation as W/H grows. Landscape's wider two-column canvas
   exposes this existing dependency.
2. Rejected `6ba125c` raised elevation but retained the narrow frustum and pitched
   down to retain feet framing. This moved the horizon toward/out of the top of
   the canvas, increasing nominal ground coverage. The previous test asserted
   downward pitch itself rather than the user's distant-scenery requirement.
3. Candidate removes that extra pitch and uses F=0.95 min(W,1.5H). Through 3:2,
   the original projection is exact; wider canvases retain the reference vertical
   view and reveal more horizontal scenery. 3:2 is an aspect reference, not a
   phone-specific pixel size. Horizon and feet remain at approximately 30%/80%.
   The off-axis viewport provides a slightly downward center viewing ray without
   rotating the camera downward again. No new camera subsystem or preferences.
4. Camera yaw remains -simulation yaw, rotation order YXZ, with no lookAt call.
   Camera x/z, distance, terrain smoothing, near/far planes remain unchanged.
   Virtual symmetric frustum Hv=2 max(HOR,H-HOR), aspect=W/Hv, setViewOffset and
   final projection-matrix update remain intact. Report distinguishes Three's
   virtual-frustum FOV from actual visible vertical angle of the cropped viewport.
5. W/H originate from measured CSS canvas dimensions via createMgCanvas, not
   device pixels or outer screen size. Safe-area/layout alter the available W/H;
   the camera recalculates from those dimensions on draw. Renderer.resize updates
   renderer size and W/H. Existing window.resize and visualViewport.resize
   listeners debounce 150ms, remeasure layout and resize; the frame loop also
   checks layout changes. There is no separate camera orientationchange state.
   Rotation restores matrices after settling; no accumulation of camera offsets.
6. Occluder selection and ray tests consume actual camera position/elevation;
   projected labels/visibility use the same camera matrix. Collision and ground
   simulation do not depend on this projection. No changes to meguru.js,
   character-3d/, assets/, gameplay/save/schema/Expression/Motion.

## Controlled browser evidence

`tools/meguru-3d-qa/camera-framing.cjs` compares the shipped 44a1415 module, rejected
6ba125c module and working candidate, on the same current HTML/CSS. The earlier
499eee camera equivalence is established above; screenshots are not mislabeled as
full historical application runs. Same synthetic save, region entry, player/party
coordinates, yaw=0, distance=430, height=1, day/sunny and frozen simulation pose.
The runner asserts matching inputs and actual canvas dimensions across variants.
QA-only module routing/freezing/probes never ship in production code.

Portrait 393x760 and landscapes 852x320, 667x300, 852x390 use emulated CSS safe-area
47px left/right and 21px bottom. They are software-browser cases, not measured
physical iPhone performance. Forest/snow/city screenshots compare the same scene;
13-region candidate lifecycle checks cover actor cleanup and player visibility.
Nominal ground fraction is a flat-plane projection metric, not pixel segmentation
of mountains/buildings. Forward visibility samples are fixed ground points at
300/900/1800 units, not a claim that every procedural road is unobstructed.

An initial probe with a fixed 650ms sleep sampled CSS before the renderer resized.
The final probe waits for actual canvas/projection size agreement and onscreen
controls, then rendered frames. Exact portrait matrix/position restoration remains
an assertion. Do not interpret the initial probe failure as a proven persistent
production orientation bug.

## Verification and limits

- Dedicated camera/startup/cache: 18 PASS, 0 FAIL.
- Related foundation/terrain/integration/2D protection/viewport: 55 PASS, 0 FAIL.
- Isolated mutation: 3/3 detected (width-only focal length, downward pitch,
  misplaced feet). Working product files never mutated.
- Browser comparison and layout results: see saved JSON/logs and measurements.
- Runtime includes camera matrix tests; Home now runs candidate browser framing
  and mutation in addition to existing Chromium/WebKit layout checks. World CI
  retains its integration, terrain/collision/visibility/corridor coverage.
- Final commit CI must be checked separately after saving. Prior-commit successes
  do not certify this candidate. Local WebKit unavailable; no local WebKit PASS.
- Physical camera acceptance, sustained play, performance/memory measurements and
  the remaining Human QA are pending. The user has approved button layout only.
