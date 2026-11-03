# VERSION 10 — portrait UI adjustment

Base: PR #490 e5123ff94c4bb75031e58b18b4063904eaf45328 (V9). Owner-private Site only. Draft stays open; no main merge or Pages deployment.

## Changes
- V10 opt-in entry only. Portrait reserves comment76 → all nine existing meters80 → original5+4 controls. Information uses40px; duplicate main-name text is suppressed only while this viewport is active. Selected label appears only for multiple actors and follows actual selection.
- Reparent fixed information/meters/speech out of the scroll pane, retaining original flow reservations. Reversible restoration tested on menu entry/exit and rotation. Central clip prevents actors painting over UI; camera scroll follows the selected actor in portrait without changing its position, scale or model.
- Existing action and choice-result nodes now appear in the upper notice lane, using existing lifetimes. Only character speech/narration stays below; active questions take precedence. Native wrapping and official portrait/name plus body retained. Short notice and comment use intrinsic width.
- Transparent empty comment/information lanes; hidden scrollbars remove white tracks. Region artwork unchanged. Landscape geometry still delegates directly to V9; right information panel remains internally scrollable.
- No change to script.js, world, navigation, walk, collision, grounding, save, or dependencies.

## Verification
- Focused runtime/layout/cache tests:25 passed. Existing V6/V7/V8/V9 results reused, no unrelated full rerun.
- Package guards:16 passed. Static package4156 files.
- Managed Chromium, CSS viewports375×667 and844×280, rotate both ways: all9 meters, buttons, upper action/result, lower single speech/story, question+action, menu restoration, actual6-actor selection label. One actor hides selection label. Short upper result measured150px versus343px lane; action114px. Central frame at375×667:251px (top137,bottom388); comment392–468, meters472–552, buttons556–659. Region background reaches edges.
- Reviewer found name suppression scope leak; fixed. Meter palette confirmed via computed styles and existing home-care-colors.css important/forced-colors overrides. Retained existing high-decline shadow after relocation.
- V10 browser CI matrix added by reusing V9 driver, with per-meter visibility hit tests and upper-routing assertions. Chromium/WebKit CI and actual iPhone Safari remain unverified at publication.

## Honest fit limit
At visual viewport320×480 with header46 and original103px buttons, fixed lanes leave64px central height. A native full-height adult sprite cannot fit there. No character shrinking, deleting or model adjustment was introduced; this is NOT a full-fit pass. The central pane remains a camera window, so an actor larger than it cannot be shown whole simultaneously. The owner must be told this constraint; normal375×667 has251px central space. Text/choice content exceeding76px scrolls inside its own lane, never the page. Landscape information scrolls inside the existing right rail.
