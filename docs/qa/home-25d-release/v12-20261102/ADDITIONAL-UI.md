# V12 additional UI correction — 2026-11-02

Scope: PR #490 owner-private preview only. Supersedes the tiny landscape/fixed frame presentation in FINAL-UI.md; model/world coordinates, navigation, collision, save and formal assets are unchanged.

- Portrait notices use the season row bottom + 3px; content-sized centered wrapping and fixed slots remain. Solid #f4f8ed backgrounds replace the night haze pseudo-layer.
- Portrait stage is aligned to the fixed meter boundary. Its viewport frame no longer clips bodies at the former comment boundary. Background receives the same fixed offset; no actor-follow camera.
- Selected visual cyan drop-shadow is removed; a subtle ground ring remains. Expression SVG transparent canvas expands from 104 to 208 units with compensating size/position, preserving glyph scale and paths/animation.
- Landscape uses available left width and crops the empty reserved vertical flow. Scene, actor, shadow and effects share the presentation scale. Right rail retains all nine meters and 5+4 buttons, with no resident paging.

Validation: 73 related Node tests and 11 Pages guard tests passed. Cloud Chromium viewport checks at 375x667, 320x568, 844x280 and 568x320 confirmed no document overflow, complete right controls, enlarged landscape scene and portrait rotation return. Portrait notice top 92px vs season bottom 89px; computed background rgb(244,248,237), haze pseudo display none. Adult woman fixture (age 16), yellow/blue marks and no cyan filter inspected. Successful bottom-bound movement y=368 showed the full body and mark without the previous horizontal cut. Navigation rejects a direct upper-bound target in this scene; ordinary upper-area movement/marks were visually checked, not an exhaustive path sweep. SVG expanded viewBox regression test added.

Limits: physical iPhone Safari/WebKit rendering has not been rerun here; supplied IMG_7471–7478 screenshots were used as references. No claim of an actual-device pass. Very low landscape remains deliberately compact. The fixed comment overlay may cover part of an actor behind it while speaking, but no longer clips the character drawing at the frame edge.
