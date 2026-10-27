# Home v19 validation

Candidate based on PR426 `61aeee693e4ba94998ff39497de31e4eab63db2e` (open draft); current main at start `9e3929da9e53fc94edfce85c2a3fc5ff8d596fe7`. No merge or production Pages action.

## Implementation
See [thirteen-region design](../../design/home-v19-regions.md). Three home-only compositions clone formal Meguru assets, share camera configuration with navigation, and retain existing gameplay/save/art/UI. Forest uses a smoothly sampled winding trail and asymmetric tree layers; river adds a spanning wooden bridge, reeds and a rotating formal waterwheel; city adds a distant street, crosswalk, varying buildings, pocket park and night-lit glass. Observation/rest uses existing idle motions with private presentation RNG and cooldown, not new conversation rules.

## Evidence
- New failing-first tests: region configuration/landmarks, safe projection, environmental gaze, wheel radius/glass selection.
- Focused final home/navigation/adapter/v8/v17/v19: **49 passed, 0 failed**.
- Complete shared geometry/terrain test file: **13 passed, 0 failed**.
- Independent read-only review: corrected unreachable bridge rest point; cleared stale gaze; strengthened movement, live and post-rotation browser checks. Two reproduction tests RED → GREEN.
- Initial cloud Chromium matrix: **24 combinations (4 widths × 3 regions × 1/28 actors), 0 scenery/glyph/slot errors**. Both owner-reported phrases checked through final glyph rectangles. This initial run predates the review fixes and is retained as such.
- Local full `npm test` was interrupted after finding the old GT-3 thin-panel source guard failure; fixed without modifying the test and reran the full 13-test geometry file successfully. **Do not call the interrupted full run a pass.** Full fresh suite delegated to GitHub CI on the pushed code.
- CI browser runner uses Chromium and WebKit, records 24 combinations, saves 6/28 comparison images. Existing strict v18 check is retained afterward.

## Known baseline / device limit
The diagnostic artifact from v18 CI run40268612760 proves **both frozen v17 and v18** change `.device-header` from40px to34px on WebKit rotation, while its buttons remain40px. Notice42/speech76 remain fixed. The initial cloud Chromium v19 run also reports occasional6px shifts on repeated viewport/cast changes. No CSS was changed in v19. This discrepancy remains unresolved and is not counted as a successful strict layout check. v19 separately rejects displacement larger than6px; v18's unchanged strict check remains a failure gate.

Cloud preview uses `canvas-3d` software fallback, so its FPS is **not an iPhone GPU measurement**. Actual Safari touch drag/scroll, memory/heat, background return, long sessions, fonts and formal v18/v19 adoption still require owner device QA. Main merge and production publishing remain prohibited.

Owner-private deployment retains one allowed owner, no groups/external viewers; save key `naotocchi-home-diorama-preview-v1`. Comparison QA uses synthetic `naotocchi-home-v19-qa-v1`; never reads or resets production saves.
