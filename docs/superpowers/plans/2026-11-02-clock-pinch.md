# V22 clock pinch implementation plan

Goal: clock pinch-out/in in portrait and landscape, preserving V21 positioning and V20 art/game behavior.
Architecture: retain card pinch unchanged; clock pointer gestures adjust scene scale and scroll around the two-finger midpoint. Disable native touch gestures only on the clock scene and implement one-finger pan there while enlarged; normal one-finger swipe remains the existing rotation controller. Buttons/double taps share the zoom state.
Constraints: no main merge/Pages; owner-only trial; retain V21 restore commit 699bc1a4320de66657a1bd082df696812c7e438c.

- [x] Add failing DOM behavior coverage for pinch-in/out in seven portrait/landscape shapes, repeated gestures, third finger/cancel, resize, close/reopen, pan and button/double-tap sync.
- [x] Implement clock pointer handling and minimum/maximum scale; preserve renderer and game code.
- [x] Run clock/common/card regressions and package checks. Attempt managed browser QA; report real-device limitations.
- [x] Save V22 in PR #501 and update same owner-only trial; retain preceding versions.
