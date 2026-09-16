# Penguin and turtle expressions — 2026-09-16

## Scope

User requested production-first continuation instead of repeated per-stage visual approval. Added penguin and turtle, each eight growth stages and ten expressions (160 PNGs). Together with cat, dog, man and woman, 48 forms now have 480 expression variants. Original normal sprites, existing 320 expressions and their adjusted marks remain unchanged. Keep PR #278 Draft; do not merge main.

Baseline PR head: `68f368424811460cf18751b6dbdbcccd5d1ed60d`; baseline tree: `512461f7e519af3b2d649d6e931df0ce38333962`. Both baseline GitHub workflows succeeded. Canonical spec and batch plan are updated in `docs/superpowers/`.

## Artwork and placement

- All 160 edits used built-in imagegen with the corresponding original stage as the reference. The adjacent manifest records prompts and hashes of original, generated source and normalized final PNG.
- Reviewed all sixteen original sprites and all 160 expressions, then all 160 mark composites. Penguin flippers, beaks and elder cane; turtle shells, legs, moss and age differences were checked.
- PNGs are transparent RGBA8, 128×128, with binary alpha and exact original opaque bounds. Nearest-neighbor normalization initially lost a one-pixel extremity on penguin/04; the helper now refits the resulting opaque crop before padding. Earlier outputs were re-normalized from their generated sources and the complete asset suite passed.
- Retain shared mark colors, outlines, state priorities and care reactions. Penguin hunger uses the yellow fish; turtle hunger uses the yellow food bowl. New face anchors and silhouette clearance place silver upper-left, orange above the face, and other marks upper-right.
- The offline placement generator retains existing entries and accepts an optional species argument for batch extension. Shared stage names come from the canonical character master.

## Verification

- New resolver tests failed before implementation. Focused preview: 28 passed. Focused runtime integration: 67 passed.
- Complete PNG suite: 50 passed, 0 failed. All new stages have ten distinct variants with correct format, bounds and alpha.
- Full placement check: 480 marks, 288 sweat motion envelopes, zero reported intersections.
- Exact baseline comparison: all 32 prior placement entries and 320 asset references/SVG strings unchanged; no prior expression PNG changed.
- Read-only code review reported no actionable findings. Its remaining asset/composite and preservation checks were completed after generation.
- Final `npm test`: 891 passed, 0 failed, 0 skipped; exit code 0.
- Gallery validation: 48 stage sheets, 480 records, 160 unique new selection IDs; new PNGs and runtime match the repository byte-for-byte. Prior 32 sheets unchanged. JavaScript syntax and diff whitespace checks pass.

## Preview and limitations

The same private preview adds all sixteen forms with disposable state. The tap-select gallery defaults to penguin and can filter the 160 additions; image version is `pt-1902d230`. Prior feedback remains separately versioned.

Contact sheets use production PNG/SVG/CSS data and are static composites, not iPhone screenshots; sweat is a static approximation. Collision checks do not establish subjective ideal placement. Turtle shells can force right-side marks above the shell and push sweat outside the body or above the head. The previously disclosed cat03/dog04 sweat constraint remains unchanged. User device appearance has not been independently verified. No game numbers, save format or main-branch integration changed.
