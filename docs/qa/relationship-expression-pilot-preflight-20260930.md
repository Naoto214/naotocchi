# Relationship Expression pilot — normal preflight (blocked)

Date: 2026-09-30
Status: INCOMPLETE / blocked before image generation. Not image GREEN, not runtime GREEN, not Home GREEN.

## Canonical baseline
- Pilot: feat/relationship-expression-pilot-20260930, 24d1aa29f23110bfb53122ad0d7ba0fa7da44a6b.
- Pilot tree: 6a7040582fc04e45b7d2fcdf8b897a1b5c327d2a.
- Design branch: design/relationship-expression-20260930, a9cc8bde7480060878b7ba5f4bc3657e0a6004a4.
- Fresh main: 6b67591967645e7b022fbe6df65ac9c60dc9f1c8.
- Pilot versus main: ahead 2 / behind 0 before this report.
- Read both canonical documents: relationship-expression-design-20260930.md and relationship-expression-pilot-plan-20260930.md.
- Local snapshot reconstructed from fresh remote tree, with every one of 4,460 blobs verified. Local git tree exactly matches remote pilot tree above. Cached files were accepted only after remote Git blob hash verification.

## Existing normal inspection
All four are 128 x 128 RGBA transparent PNGs. There is no painted background. Bounding boxes below are alpha extents (left, top, exclusive right, exclusive bottom). Face-size descriptions are visual estimates, not segmentation measurements.

| ID | Asset | Alpha bounds | Body / face / appendages |
|---|---|---|---|
| otter | assets/characters/companions/otter.png | 9,14,119,120 | Reclining brown otter, pale muzzle and belly, head upper left (roughly 50 px wide), dark open eyes and small smiling mouth. Two forepaws held near torso, two hind paws with pads, long tail curving lower right; whiskers and ears retained. |
| clock | assets/characters/companions/clock.png | 12,12,115,120 | Blue alarm clock with gold bells, top handle, pale tilted dial, hour/minute hands, ticks, side winding key, two gloved hands and two feet. Eyes/mouth occupy the lower dial (roughly 40 px wide), distinct from the clock hands. Do not redraw it as an animal head. |
| forest_bear | assets/characters/partners/forest_bear.png | 11,12,116,120 | Seated brown bear, tan belly/muzzle, two ears, two extended forelimbs, two padded hind feet. Face at upper centre/right is small relative to body (roughly 30 px wide): small eyes, dark nose, smiling open mouth. No detachable accessory. |
| rock_octopus | assets/characters/partners/rock_octopus.png | 8,18,120,120 | Red/orange octopus, spotted mantle, eyes and mouth low on mantle (roughly 35 px wide), eight-arm intended structure with overlapping roots, curled tips and visible suckers. Existing pose/visible connection paths must be the generation reference; do not infer a replacement limb arrangement from a count alone. |

Multiplicity: all four are single body / single face / single individual. No separate secondary individual or group and no multi-face synchronization case. Preserve the established A/B/C principles; do not introduce a new classification or relabel historic examples.

## Normal scale inspection
Inspected original normals and temporary 128/104/80/64 px comparison at actual rendered image sizes.
- 128: individual identity and primary face features clear for all four.
- 104/80: otter and clock face direction remains readable; bear eyes become small, muzzle/open mouth carry more of the signal; octopus eyes and mouth remain distinguishable.
- 64: coherent silhouettes, no fatal breakup. Bear fine eye detail is limited; small clock ticks and octopus suckers are not expected to remain fully readable.
- These are NORMAL-only checks, not evidence for future positive/lonely images.

## Home prerequisite — NOT verified
Read production renderHomeCast and cast-layout.js. Home size is responsive and affected by available stage area, main asset, cast count and other cast elements. A fixed 64/80/104 px claim would be incorrect.
As code-only illustrations, layoutHomeCast with woman/06 main, bear partner, otter+clock, no accessory/ring, motionRadius 3 and conversationHeight 44 returns:
- synthetic stage 358 x 220: main 81, partner 40.5, companions 72 px.
- synthetic stage 270 x 152: main 36, partner 18, companions 63 px.
These are synthetic solver outputs, NOT measured browser Home sizes.

A read-only real-Home browser check was attempted with existing save fixtures at 390 x 844 and 320 x 568. The installed Playwright version initially requested a missing browser revision; selecting the already-installed Chromium resolved that executable path issue. Chromium then failed before loading the page:

socket() failed: Operation not permitted (1)

Requesting escalated execution was rejected by the environment approval policy: sandbox_approval=false. No browser restrictions were bypassed. No actual Home screenshot or DOM measurement was obtained.

The user explicitly requires existing Home display inspection before image generation. Therefore do not treat this prerequisite as GREEN. Continue here in a browser-capable authorized environment; no new design ruling is needed.

## Tests / protection
- npm test was started against the exact unchanged snapshot. It was stopped after the prerequisite blocker was established; no full-suite PASS claim. Partial passing output is not completion evidence.
- All 3,342 pre-existing image files (PNG/JPG/JPEG/WebP/GIF/SVG/ICO) match fresh baseline blob hashes. Includes normal 31-series, Naoto, companion/partner normals and other nonpilot images.
- New production images: 0. Existing image changes: 0. Runtime changes: 0. Save/schema/migration changes: 0.
- No 25/30/35-year decay or marriage progression implementation.
- No main merge; no design branch or PR #278 changes.

## Resume order
1. Measure and inspect actual Home normals, especially bear face at real small sizes and clock/octopus structures.
2. Report completion of that prerequisite, then produce only positive/lonely for otter, clock, forest_bear, rock_octopus (8 images).
3. Finish image-only QA before any runtime edits; targeted minimum correction only if needed.
4. Implement a thin Relationship resolver and pilot hooks; positive > lonely > normal, rescue all threshold-crossing companions, normal success representative, reload re-resolution, no Expression save fields.
5. Home QA, regression, protected asset hashes, pilot-branch save, then stop for human visual approval. No remaining 80 images.
