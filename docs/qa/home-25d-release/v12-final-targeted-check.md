# V12 targeted fixes — pending private update

Base: `14840c73c5b1fcffb19ecedfc920cf88affc876b`, Draft PR #490.

## Implemented
- Portrait camera uses the always-reserved 76px comment top, with an 8px stage margin. Comment appearance does not change the camera or actor world coordinates.
- Landscape keeps the existing outer left pane and native stage geometry, scales the entire presentation to 94% of the prior fit, and centers it. Artwork, actors, shadows and marks share the transform; pointer inversion uses the same frame origin.
- V12 ordinary speech and top notices no longer block the common walking/pointer gate. Idle speech moods bounce/settle/shy/wiggle are allowed; care reactions, group reactions, important speech deadlines, questions, life choices and special presentation moods retain locks. V11 and non-production homes retain prior behavior.
- Top notice leading symbols use the existing approved catalog. Existing egg/companion/partner portraits are allowed as exact fallbacks. No assets created or modified.

## Focused verification
38 tests passed: V7 comments, V8 viewport, V10/V11/V12 layout/routing, new V12 interaction and icon cases. Syntax checks passed for both modified runtime files.
Browser local QA: portrait 375x667 one actor and 320x568 28 actors; 9 meter fills, 9 fixed buttons, no document overflow. At 375x667 stage bottom 384, comment top 392 and height 76; lower actor paint stayed above comment. Ordinary speech drag accepted a target; question gate remained blocked. Landscape 844x280 28 actors: centered 6% zoom-out and no repeated artwork seam. No save data or navigation model changed.

## Remaining / not complete
- Reported purple line was not reproduced in tested views. Its removal is NOT verified. No unrelated parameter colors were removed.
- Full Safari/device verification and the narrower 568x320 landscape candidate remain outstanding. Do not update the private preview until the outstanding visual check is resolved.
- Generic character emoji with an ambiguous growth-stage catalog mapping are deliberately not converted to an arbitrary life stage. Candidate fallback symbols: 🐕 🐈 🐛 🪲 🐟 🐠 🦎 🐉 🐦‍🔥 🐧 🐢 🐸 🦋 🪰 🪼 🪸 🪴 🍄 🐈‍⬛. This is a catalog/source candidate list, not a claim that every symbol is currently shown in a notification. Known speaker identity still uses its exact existing portrait. For generic uses without speaker identity, approved neutral icons or an explicit intended mapping are needed; none were introduced.
- A simultaneous unrelated bounce afterglow could inherit the idle-speech exception. Distinct special presentation moods, group reactions and important-choice locks remain blocked.

## Publication status
Private V12 NOT updated. Existing trial URL: https://naotocchi-home-490-20261031.kerzion214.chatgpt.site
PR remains Draft. Main, production Pages, formal images/backgrounds, other games and save data were not changed. No old Work was opened or deleted; one sparse Site source checkout was used, with no deployment archive created.
