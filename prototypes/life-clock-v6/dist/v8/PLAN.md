# VERSION 8 Implementation Plan

Goal: Add three metallic finishes based on V7 soft; preserve V6/V7 byte-for-byte.
Architecture: SVG material wrapper over the unchanged V7 renderer. No raster edits. Reference is V7 soft. Shared state, viewBoxes, background and narrow light for all four options.
Spec: User VERSION 8 brief, 2026-11-01. A subdued, B standard (default), C stronger depth. Red #4B2138/#75354C/#A76E7C, green #103D35/#1D695B/#579788, gold #705029/#A48243/#D2B87B.

- [x] Test geometry, labels, dial positions, viewBoxes, protected face/light and all valid values against V7 soft; test missing renderer first.
- [x] Add clock-v8.mjs with bounded dial/hand material changes; subtle radial brushing and curved, colored reflection. Keep existing shapes and silver hubs.
- [x] Add mobile comparison page with reference/A/B/C, full and hands/three dial crops, shared controls; retain old links.
- [x] Run V6/V7/V8 verification, render comparison/detail evidence, inspect browser at 320/375/390/430 widths and interactions.
- [ ] Review patch, preserve V7 rollback, recheck remote HEAD, commit/push PR branch without force, publish owner-only existing Site and verify.

Review focus: full overlap; 0 versus 100; XII; narrow-screen overflow; hue/contrast on dark dials.

Independent review: no Critical/Important findings. Unique gradient IDs and references across 20 SVGs confirmed independently. Minor: small matching-color subdial hands rely on pale outlines; retain geometry and defer final readability judgment to iPhone evaluation.
