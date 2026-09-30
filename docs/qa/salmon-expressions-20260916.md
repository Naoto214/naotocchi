# Salmon expressions — 2026-09-16

## Scope and baseline

Added salmon (さけ), eight stages × ten independent expressions = 80 new PNGs. Total: nine lines, 72 stages, 720 expressions. The user authorized production-first complete batches without stage-by-stage approval. Keep PR278 Draft; do not merge main.

Baseline GitHub HEAD: adbb5fc0ec262184694fa3c1212b867c3f4d2a86; tree: 64ec3a31414e662fbdb2fc5e3438cc7509cc6245. Latest main observed at start: bcdd6a6811ce8255ef16895ffff26f53b89d1478. The PR was already conflicting before this batch. Baseline workflow runs, statuses and check-runs were all empty; this is not successful CI.

The prior checkout was absent. Recovered runtime/assets from the existing Site source and remaining implementation from GitHub; 1,344 local baseline files matched GitHub blobs byte-for-byte. The remaining 241 historical documentation/artifact entries were retained unchanged in the sparse index and base tree, not deleted. The complete reconstructed baseline tree matched the remote tree above.

## Artwork and placement

All 80 images were separate built-in imagegen edits referencing their corresponding original stage. The adjacent manifest records exact prompts and SHA256 hashes of originals, generated sources and final images. Existing normalization produces transparent 128×128 RGBA sprites within each original's opaque bounds. Normal sprites are unchanged.

Observed all eight original images and their coordinate grid before setting face anchors. Preserve the newborn yolk sac, juvenile fins and parr stripes, silver adolescent/adult stages, red mature body, green/gold head, brown elder and older hooked jaw. Generative shape variations remain; these are not pixel-identical body composites.

Generated only salmon placement entries with `node tools/place-expression-marks.cjs salmon`. Existing 64 placement entries, including the prior 81 requested adjustments, remain identical. Shared colors, outlines and reactions are unchanged. Hunger uses the existing yellow fish food symbol and small circles. Orange stays above the face center; silver is upper-left; other marks are upper-right of the face.

Root inspected all 80 marked composites. No obvious malformed sprite or overlapping mark required another art pass. The initial gallery render had missing Japanese glyphs because the fresh environment lacked a Japanese font. Converted the repository's existing WOFF2 to a local TrueType font and rerendered; labels now display correctly. This changed neither game files nor sprite/placement data.

## Verification

- Final `npm test`: 1001 passed, 0 failed, 0 cancelled, 0 skipped; exit 0; 74017 ms.
- Placement checker: 720 marks and 432 sweat motion envelopes, zero reported intersections.
- Preservation: prior 640 asset routes and SVG strings identical; all 64 old placement records identical; no existing character PNG changed.
- Independent final review: no critical or important findings. All 80 manifest records and 240 hashes independently verified; 24 salmon focused tests passed; all 80 marked composites inspected.
- The intermediate reviewer run had eight expected directional failures before salmon placement existed. They passed after placement generation. The final full suite above is the completed-art result.
- Gallery: nine lines, 720 records, 72 sheets; 80 unique current-batch selection IDs; starts at salmon. Local script references resolve, inline JavaScript parses, and deployed-source pet-expression.js matches tested code.
- `npm run bump`: only the pet-expression.js cache token changed. `git diff --check` passed.

## Same private preview

Site project: appgprj_6aa908e9357c8191abb0f486be58697c.

Source commit: baafd5931392fe895f2f991def21f6746652e415. Private Site version46, image version sa-df920d95. Packaging exited 0, gzip integrity and all 80 sprites/eight sheets were checked before upload. Deployment appgdep_6aab119dd43881918f547fe1510a8ed8 reached succeeded.

- Game preview: https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/
- Tap-select gallery: https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/mark-review/

The game preview uses disposable state and initially shows salmon01 hungry. Selection/memo/copy behavior is retained; the new-only checkbox selects this batch's 80 expressions. This gallery is a PNG/SVG/CSS static composite, not a device screenshot; sweat is approximate. The user will assess real-device appearance.

Fish fins and long bodies can push sweat outside the body rather than tightly around the face. Existing cat03/dog04, turtle, tadpole and clownfish sweat limitations remain. Zero detected overlap is not a claim of ideal appearance. Game numbers, romance conditions, normal sprites and save format are unchanged.

## GitHub delivery gate

Save only the reviewed additions on the existing branch, retain Draft and the pre-existing main conflict, and require the new remote tree to equal the verified local tree. Recheck latest HEAD/main and CI after saving; report absent CI results separately from local tests. The resulting GitHub SHA/tree and final CI observation are recorded in the PR update and handoff.
