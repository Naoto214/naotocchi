# V12 full background restoration — 2026-11-03

Base: 8606aa641862623e7feab13ef397be08cc092cf0 (Draft PR #490).

The resident-fit transform and clipping had also been applied to the background host. At 375×667 the background host was only 208.43×430.83, with its visible artwork further clipped to the resident pane. Restore the existing `backdropComposition().cover` painting across the viewport (portrait) or left game region (landscape). Keep its original image, aspect ratio and permitted cropping. No new image or renderer is introduced.

Keep the previous native world rectangle separately in `presentationRect` for navigation, occlusion and input. Only drawing uses the full background host rectangle. Resident fit, safe envelope, world model, actions, motion, UI, font sizes and save paths are unchanged. The background no longer inherits resident scaling or clipping, and does not move when notifications or actors move.

## Focused verification

- Existing 44 focused tests passed (V12 portrait, overview, interaction, notice text, icons and layout; V11/V10/V8/V7 regressions).
- Cloud Chromium: 375×667 and 320×568 background exactly covers 0,0 through viewport width/height. No game page scroll; 9 meters and 9 fixed buttons retained.
- 375×667, 28 actors: notice ends at y=134, comment starts at y=392; observed actor wrappers y=183.71..371.27, shadows through y=373.66. Resident frame remains y=136..390.
- 320×568, 28 actors: notice ends at y=134, comment starts at y=293; observed wrappers y=178.24..280.23; resident frame y=136..291. Ordinary notice/comment and upper/lower edge fixtures checked.
- 375×667, single actor hungry expression: mark ink y=228.38..256.51; shadow y=311.54..317.17, inside the same safe interval.
- 844×280, 28 actors: background fills left x=0..410 and y=0..280; resident pane x=26..410, y=0..272. Right UI rail and all controls retained. Screenshot inspected; no small background rectangle.
- Background code changes are V12-only. Native-world/input geometry remains the same as the prior fit implementation. Existing jellyfish image is unchanged.

Limitations: no new iPhone Safari hardware run. Small-screen 28-actor sizing is inherited from the previous V12, not redesigned here. This record does not claim full-repository or all-region re-auditing.

Deployment target: existing owner-private V12 only. Keep PR #490 Draft; no main merge, production Pages, formal asset, other-game or user-save changes.
