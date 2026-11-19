# VERSION 9 implementation plan
Spec: User V9 request, 2026-11-01. V8 C finish chosen; no formal adoption.
Goal: preserve V8 C artwork and compare numeral layouts A/B/C.
Architecture: isolated v9 wrapper over unmodified v8 C; A exact V8 C; B Arabic main 1–12 and Roman end I–XII; C same layout with lower face scaled 1.12 about its unchanged center. Lower hand retains shape/length; only rotation changes for B/C. One shared state and clear A unsupported-range annotation.
- [x] Tests: A exact reference, central/side hands and dials unchanged, 12 Roman labels/angles, 30-degree end rotation, invalid values, 0/100, all crops, preserved materials.
- [x] Renderer: B lower r94, labels r70/font17. C lower r105.28 (+12%), labels effective r82.88/font20.16, all same size. Center fixed (512,688). Main 1–12 font40.
- [x] UI: B default, A/B/C full and lower crop, 12 end buttons, shared main/side values and overlap presets. A supports X–XII only; display reference X with explicit note for I–IX, never imply unsupported values.
- [x] Visual evidence, Chrome width/landscape checks, old verification, independent review.
- [ ] Commit existing PR branch, publish owner-only existing Site, verify provenance and CI; retain V8 rollback and main.

Ruling: Browser bounding boxes found VII/VIII collisions at initial radii. Final B r70/font17; C local r74/font18, transformed 1.12. All 5 widths show zero label collisions after correction. End ticks moved to r84–87 to leave numeral clearance. Hand length remains 72.

Independent review: no Critical/Important findings. Added A unsupported-range note beside hero and hand crop; browser confirmed.
