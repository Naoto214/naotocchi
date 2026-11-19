# VERSION 6 implementation plan

Goal: implement the user's approved V6 comparison brief, reusing PR #499 unchanged.
Architecture: immutable V4 renderer and artwork, V5 reference renderer, SVG-only V6 finish layers; all six values share one state. No gameplay or storage access.
Base: main aec03c20ae8b064c6c2f8aca5537f1938df6439f. Source: PR #499 121fad9fa947178a6801c76cf8bb872bae17d7e8.

- [ ] Preserve original engine/assets and add tests for exact hand geometry, labels, 0/100 and all valid values.
- [ ] Add blue-selective color matrix, weak/medium vertical light, circular metallic A/B and external silver bezels at 1/1.5/2 widths.
- [ ] Build responsive synchronized comparison with full-size toggle, side-by-side, detail enlargement and six controls.
- [ ] Measure rendered color at center/top/bottom/left/right and compare to official card; inspect browser at 320/375/390/430/844.
- [ ] Review, save independent Draft PR, publish new owner-only Site, record HEAD/tree/CI and limitations.

Constraints: no change to original hands/positions/logic, silver leaves/sprout remain in original raster; no tachymeter; V5 C is the original V5 A pale-three-color finish. Preserve PR #499, main, production and card game.
Ruling: use the explicit user brief as the approved design and proceed without a redundant approval step. Use SVG finishes, not image regeneration, to preserve geometry exactly. Bezel expands outwards; same inner-dial scale comparison is separate from fit-to-screen.
