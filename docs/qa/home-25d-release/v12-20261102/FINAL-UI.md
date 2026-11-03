# V12 final UI adjustment — 2026-11-02

Supersedes the dynamic lane sizing and resident paging described in RESULT.md.

- Portrait information → 3px → top notice. Empty title row no longer reserves height. The lower comment is fixed at 76px, with 4px to the meters and 4px from meters to controls. Natural content width and wrapping remain.
- Notice/comment content changes do not rebuild the viewport. Actor following is disabled for V12. A single initial/rotation framing is retained; actor motion does not scroll the camera. Background coverage uses the stable screen box rather than overflowing actors.
- V12 landscape uniformly scales the complete world display (background, actors, shadows and marks) into the left area; the right rail retains 9 meters and 5+4 controls. Display-boundary inverse coordinates keep simulation and pointer units unscaled. No world-model, collision, walking or save changes.
- V12 no longer creates resident previous/next navigation. Actor tap selection remains; older version behavior is retained behind its version gate.
- Foreground masks apply to official body images instead of their overflowing expression ancestor. Original image files, SVG mark paths and animations are unchanged. Mask cleanup is included on leaving the scene.
- The V12 builder emits a versioned world adapter, so the older preview routes retain their shared original adapter.

## Verification

72 related Node tests passed (including fixed-lane and inverse-pointer tests). After the final stable-background adjustment, the 14 relevant viewport/scroll tests passed again. Pages package guards: 11 passed.

Managed Chromium: portrait 375×667 and 320×568; landscape 844×280. At 375px: information y49/h40, notice y92, comment y392/h76, meters y472/h80, controls y556/h103; 4px gaps. At 320px the actual 29-character speech occupied 74.78px in the 76px lane. Page extent equals each viewport. At 844×280: notice y49/h34, comment y86/h46, meters y135/h62, controls y200/h72. All 9 buttons and 9 meter values remain. Previous/next navigation absent. Background right edge is left of the rail. Blue/yellow marks shown whole in Chromium. Notice clear/change retained frame scroll 212 and background y−212/h1095 in the observed portrait case.

## Limits

The supplied IMG_7457/7458 show the original iPhone Safari clipping. This environment has not independently rerun physical iPhone Safari; Chromium success is not an iPhone success claim. The ancestor mask clipping risk is removed, but the exact device reproduction remains to be confirmed.

Landscape is intentionally tiny per user instruction. Arbitrarily long authored content is not guaranteed to fit fixed lanes. Existing unresolved notification animal/egg symbols remain as recorded in RESULT.md; no new artwork or additional icon substitution was undertaken in this narrowly scoped final pass. Existing save tests are reused; no user save was edited. No all-region or full-repository audit was repeated.

Draft PR #490 only. No main merge or production GitHub Pages publication.
