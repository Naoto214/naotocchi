# VERSION 13 implementation plan
Goal: preserve +30% Georgia and V8 C, repair clearances, retain V8–12.
Spec: user's VERSION 13 instructions, 2026-11-01.
Architecture: new v13 renderer wraps immutable v12 with growth=roman=1. Local SVG displacement only if radial positioning cannot fit. Old image bytes remain unchanged. A is exact V12 S1; B follows explicit V13 sizes.
- [ ] Reproduce 10 contact using the inherited conservative mask and actual glyphs.
- [ ] Implement minimal numeral radius / local decoration adjustment, measure all 12.
- [ ] Add light single-clock A/B viewer, ten crop, stand A three views, six independent controls.
- [ ] Run V8–12 suites and V13 preservation/clearance tests; responsive browser QA.
- [ ] Save new v13 files and entrypoint to existing PR branch; deploy same owner-private Site.
Review focus: actual Safari Georgia differs from Linux fallback; art deformation must stay local; no hidden eager 31-clock rendering; S1 subdial enlargement is NOT V13; no physical stability claims.
Ruling: user explicitly authorized implementation, PR save, private comparison; execute without extra design approval. Main and public Pages prohibited.
