# 2D presentation protection — 2026-10-12

The World lane had unintentionally changed default 2D discovery and map presentation. The correction gates ordinary-water discovery levels, ordinary/landmark/zone notifications, and the original 1500ms ordinary notice duration behind the existing URL/WebGL-derived `S.meguru3d` value. Map filtering checks the generated world's `world3d` marker, so explicitly requested 2D worlds retain all discovered spots. Recording and save functions are unchanged.

- `red.log`: the new behavioral suite reproduced 2 failures in default 2D (hidden discovered map spots and suppressed ordinary notices), while both opt-in 3D cases passed.
- `green.log`: 4/4 behavioral checks pass after restoration; both modes retain discovered spots and zones, map progress, and unchanged saved state when reading maps.
- `2d-world-parity.json`: deterministic full serialized worlds match origin/main `249a954f09f70f124eb5e7243283c0fd4f8a4098` in all 13 regions. The comparison loaded the main version of meguru.js in an isolated in-memory harness; no checkout mutation was needed. script.js has no diff from main.
- `ux-tests.log`: first focused run, 59/60 pass. The one failure came from the shared discovery fixture now explicitly opting into 3D, while an existing scenery test requires original 2D non-solid props. Its helper was corrected to request `{world3d:false}`.
- `ux-final.log`: final discovery and map suite rerun after that fixture correction, 45/45 pass.

World v2 discovery/foundation/prototype fixtures now explicitly enable the 3D bridge when asserting quiet notification behavior. The browser discovery runner now uses `meguru3d=1`; browser validation belongs to the integration browser lane.

A whole-file meguru.js hash from before World integration cannot remain identical: approved 13-region geometry, corridor rendering metadata, and the approved single-tree relocation all legitimately alter this source. Rebaseline that fixture only after auditing these changes; retain focused 2D behavioral protection and world parity evidence. No broader save, movement, actor, or schema changes were found in this diff review.
