# Home v13 design

User-approved scope: PR #426 only, owner-private preview, no main merge/Pages deployment or gameplay/save changes. Keep all 28 residents, art, expressions, Motion, conversations, love behavior and 5+4 controls.

## Evidence
Base 1619872d; main 92ac6546 already contained. V12 CI 7/8 green; runtime smoke fails quick-mode-test “nearly perfect from the hints: 17/20”. Baseline targeted 52/52 green.
The layout explicitly sorts foreground-center first and uses an upper arc for small casts. Movement stops 54px above the stage bottom. CSS puts poop in a bottom row and reserves a separate speech slot even when empty. Zzz SVG is a descendant of .character-visual, whose CSS scale mirrors both image and marks; v12 only fixed #sleepBtn.

## Approaches
- Half-circle: readable, but keeps the unwanted front/back hierarchy.
- Exact ring: surrounds the main but looks staged and wastes space at high counts.
- Selected: central depth-distributed seating with gentle staggering, same v12 body-size budget. Small groups use nearby alternating sides; large groups fill the safe rectangle. Terrain and occlusion solver have final authority. Initial seating is separate from the common movement bounds.

## Changes
Keep legacy arc/distributed modes available only for comparison. Default natural layout assigns central slot to pet, a nearby slot to partner, then spreads companions. Bounds use 12px bottom clearance (plus actual attachments), no role limits. Speech becomes an overlay above/below the current speaker, clamped to the stage. Poop uses safe unoccupied terrain near the pet, with no persistent position added to saves. Image/fallback child owns reflection; expression wrapper, SVG, hearts, ring and markers remain unmirrored. Existing motion owns its animation as before.

## Acceptance
Counts 1/2 (partner and companion)/3/6/13/20/28, widths 320/375/390/430 and 320x568, forest/river_lake/city. Model paths, terrain safety, crowd limits, no save mutation. Browser screenshots and continuous sleep-facing frames; automated matrix results distinguished from real iPhone verification.
