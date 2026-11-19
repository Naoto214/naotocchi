# VERSION 12 implementation plan

Goal: user-requested sequential number, typography and tabletop comparison; V11 E is a reference, no adoption.
Architecture: additive v12 renderer imports immutable V11/V9/V8 assets and changes only numeral groups. Existing six-hand/state logic is reused. Static SVG engineering sketches describe stands; no physical stability claim.
Spec: user's VERSION 12 brief, 2026-11-01.

- [x] Main numerals 50/52/54/56 (V9=40), exact 30° ink-centre rays. Optimize radius against the existing conservative silver/tick/bezel mask; report insufficient clearance.
- [x] Growth 15/16.5/18 and Roman 17/18.7/19.55; unchanged tick count/diameter and symmetrical growth dials.
- [x] Georgia 400/600 and Nimbus Roman 400, identical nominal sizes/coordinates; font substitution explicitly disclosed. Font geometry audited separately.
- [x] Three stand concepts: front/side/back, assumed dimensions, support polygon and operation/assembly tradeoffs; real tests outstanding.
- [x] Mobile-first staged comparisons, V11 E same state, combined candidates, six controls, raster evidence and diagnostic crops.
- [x] Numeral-stripped SVG equality, all hand states/endpoints, past v8–v11 regressions, original files byte equality. Browser viewport/interaction check if infrastructure permits.
- [x] Commit only additive v12 to existing #500, private Sites deployment, report exact HEAD/tree/CI and limits.

Review focus: 10 versus silver/ticks; wide Romans; 100 badge; six independent hands; Safari Georgia differences. No production/game/save schema changes. No main merge.

Limitations: main10 clearance unmet; Safari and physical tests remain explicitly unverified. Public CI is reported separately.
