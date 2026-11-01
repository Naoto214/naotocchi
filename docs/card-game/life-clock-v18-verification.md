# 人生の時計 VERSION 18 — implementation and QA

## Scope
PR #501, branch feat/cardgame-life-clock-v17a-20261101. Starting head d31b3111b9ec8161c521d3b5f028e4e915ef7b01; base main aec03c20ae8b064c6c2f8aca5537f1938df6439f. Preserve Draft; no merge, Pages, rules, catalog, engine, state adapter or save format changes.

## Result
- Immutable V17 A source and original raster assets retained. Clip only plate image layers at (512,495), radius 493, beneath existing opaque bezel (473..503). No color keying; leaf/sprout pixels remain intact. Original white-matted shadow cannot be retained verbatim, so a separate transparent SVG shadow preserves its placement and softness without white background contamination.
- Small hands 3/4/5 use silver facets and a dark contour. Central gold/red/green hand geometry/materials unchanged; wine/emerald/antique-gold dials unchanged.
- Reversible 180-degree CSS 3D inspection using horizontal single-pointer gestures or an accessible flip button; reduced-motion disables animation. Zoomed view pans; flip remains available through toolbar. View-only state, no persistence.
- Silver brushed back, NAOTOCCHI / LIFE CLOCK / small sprout engraving.

## Automated evidence
- Baseline clock suite: 8/8 passed before edits.
- V18 renderer suite: 10/10 passed. 324 states retain protected V17 A groups, six angles, 0/100 distinction, original asset provenance hashes.
- Full CARD GAME Node suite: 558/558 passed, 0 skipped/fail/cancelled. Command: node --test prototypes/card-game/tests/*.test.mjs.
- Dedicated gesture DOM passed: both directions, small movement, vertical movement, cancel, same-scene and outside-scene multitouch, zoom conflict, reduced motion, transition lock, reset/destroy, deliberate 9-second drag.
- Clock lifecycle DOM passed: queued close/reopen, stale loading result, offline failure/retry.
- Actual application clock DOM passed: both human CPU seats; save bytes unchanged while viewing/rotating/zooming/resizing; correct six angles retained; close resumes CPU; save restore; focus; Escape; hotseat; blur.
- Pages package unit tests: 16/16 passed. New runtime modules explicitly reviewed into allowlist; no development QA HTML is published.

## Browser evidence and limits
Managed Chrome, exact runtime modules in a local iframe, sizes 320×568, 375×667, 390×844, 430×932, 568×320, 667×375, 844×390, 932×430. All toolbar controls remain in bounds and at least 44px high. Six angles retained through all sizes. Inspected front at 390px and 320px: white square absent, silver leaves, sprout, ring/bezel preserved. Inspected back: no white filter rectangle, restrained silver engraving. Real browser pointer drags turn front→back and back→front; 720×720 zoom and flip button verified. Saved game restored through actual app UI and reopened clock.

The local HTTP preview lacks crypto.randomUUID used by existing records code. Only temporary unshipped QA HTML adds that API for the actual-game test. All production modules remain unchanged for this workaround. A separate temporary clock fixture supplies public read-only values for responsive visual checks. Both fixtures are removed before source synchronization.

Not a physical iPhone Safari/WebKit or actual touch-device test: Safari safe areas, dynamic browser bars, native pinch behavior and appearance still require owner evaluation. Browser-visible drags use mouse pointer input. No claim of authenticated public HTTP end-to-end QA.

## Review and fixes
Independent reviewer found one important case: second finger outside clock did not cancel a gesture. Reproduced failing test, moved additional-pointer tracking to document capture, test passed. Browser QA found an engraving filter flood rectangle: reproduced, replaced flood/out composite with feDropShadow, retested and visually confirmed. Browser input showed 8-second deliberate drag was rejected by 1.2-second timeout: reproduced 9-second test, removed speed cutoff while retaining distance/direction/cancel/multitouch gates, browser drag then passed. No deferred review findings.

## Release target
Existing owner-only Site appgprj_6ae71faa85448191977d6f89971d5d0b, same origin https://naotocchi-card-clock-v17a-20261101.kerzion214.chatgpt.site . Owner 1, external viewers 0, groups 0 verified before work. Publication identifiers and final remote commit are recorded in PR #501 after deployment succeeds.
