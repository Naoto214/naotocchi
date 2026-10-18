# Frog and clownfish expressions — 2026-09-16

## Scope

Added frog and clownfish, each eight stages and ten expressions: 160 new PNGs, bringing the total to eight lines,64 forms,640 variants. User authorized complete production batches without per-stage approval. Keep PR278 Draft; no main merge.

Baseline remote HEAD: d8952c54179dccf737410c489741887d81577c62. Local baseline0b02c00d500d3f5634c076085a15c403d2147842 has the same tree3fc0970e5273e517f1426011a07d9dd2dc3c2d52. Latest main observed at start:9fd2a41b8726caeaba7bf7546d9ac428cc5152b4; PR was already conflicting. No unrelated main changes were merged into this art batch. Start-time workflow/status APIs returned empty lists, not a success result.

## Artwork and placement

All160 images were independent built-in imagegen edits referenced to their original stage. The adjacent manifest records exact prompts and original/generated/final SHA256 hashes. Normalized with the existing nearest-neighbor/alpha-bounds helper to transparent128px RGBA and original opaque bounds. Originals and prior480 variants unchanged.

Reviewed all16 originals and160 marked composites. Preserve tadpole tail/developing legs, adult frog posture and elderly markings, clownfish stripes/fins/growth differences, and both small companion fish in clownfish05. Only the main clownfish receives state expressions. Minor generative shape variation remains; this is not pixel-identical body compositing.

Shared state colors/outlines/reactions remain unchanged. Frog hunger uses a yellow insect; clownfish hunger uses yellow food pellets. Face coordinates were rechecked on grids. Initial frog01/02 anchors were incorrectly below their source art and placed orange marks too low; corrected all new anchors from the actual original canvas and regenerated only the new frog entries. A metadata regression test now requires observed face centers inside original bounds. Existing48 entries, including81 previous requested corrections, are untouched.

## Verification

- All640 marks and384 sweat motion envelopes: zero reported intersections.
- Exact preservation checks: prior480 PNGs, asset routes and SVG outputs unchanged; prior48 placement entries unchanged.
- Independent final review: no critical or important findings; all160 provenance records and hashes verified;52 focused tests passed and40 representative marked composites inspected.
- Root inspected all160 marked composites, including the corrected frog sheets.
- Final full-suite result: `npm test`959 passed,0 failed,0 cancelled,0 skipped; exit code0 (279785ms).
- Gallery:8 lines,640 records,160 unique new selection IDs. Inline JavaScript parses and local script references resolve.

An initial full-suite run overlapped integration edits and therefore is not a clean-baseline result. It had expected incomplete-art/placement failures plus a pre-existing randomized quick-mode failure (dodge hazard collision). Diagnosis found the first quick-mode test assumes guaranteed success despite survival games allowing random misses; its isolated10-test rerun passed. Production quick-mode code and tests were not changed. Final verification is recorded above.

## Preview and limitations

Image version fc-d232148f. Same private no-save preview and tap-select gallery, defaulting to frog; the new-only filter selects frog/clownfish160 variants. Game numbers, romance behavior, normal sprites and save schema are unchanged.

Sheets are static production PNG/SVG/CSS composites, not device screenshots; sweat is approximated. Long tadpole tails, fish fins and the two small fish can push sweat outward or above the head. Existing cat03/dog04/turtle limitations remain unchanged. Zero intersections does not mean every distance is subjectively ideal. iPhone acceptance remains with the user, without holding further production for minor tuning.
