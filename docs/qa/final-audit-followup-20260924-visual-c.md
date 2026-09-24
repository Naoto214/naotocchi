# Visual review C: existing sweat/mark cases 233–346

Reviewed all **114** assigned cases conservatively. **0 clear candidates, 112 acceptable, 2 borderline**. Borderline entries are not automatic defects and do not recommend production changes. Reduced-motion still review: **114 acceptable, 0 candidates, 0 borderline**.

Only existing cases from `visual-review/sweat-all346.csv` were considered. No production changes were made and the review was not expanded to the broader asset set.

## Evidence and limitation

Every animated contact sheet 59–87 was actually opened with `view_image`, covering sizes 64, 80, and 104px at 0, 390, 1300, and 1690ms. Cases 318 and 336 were additionally opened individually. Every reduced-motion sheet 20–29 was opened; only assigned cases 233–346 were judged (cases 229–232 on sheet 20 were outside this reviewer’s scope).

The evidence is an offline reconstruction using the actual current PNG and SVG assets and reconstructed CSS sweat color, border, opacity, shadow, radii, 1.3s time offset, and PNG < mark < sweat stacking. Still images use animation:none behavior: unrotated sweat, dy=0, opacity=0.85. These are **not live browser screenshots**; the review establishes appearance in these reconstructions and sampled phases, not continuous live-browser animation behavior.

The criterion was visible failure: an unreadable mark or sweat, a wrong-symbol appearance, excessive crowding of face and effects, or an obvious unnatural composite. Geometric contact and partial overlap that remained readable were accepted.

## Borderline observations

| Number | Key | State | Size / phase | Observation | Still result |
|---|---|---|---|---|---|
| 318 | god/05 | strained | 64px, 0–390ms | Sweat overlays the gray zigzag center; tiny gray ends make early-phase recognition marginal. Larger sizes and later phase remain legible. | Acceptable |
| 336 | star/05 | strained | 64px, 0–390ms | Central sweat overlap leaves very small gray zigzag ends in the early phase. Later phase and larger sizes remain legible. | Acceptable |

No clear face crowding, unreadable sweat, or wrong-symbol composite was identified. Sparkles, down arrows, Z sequences, and cloud marks remain recognizable despite their partial contacts.

## Viewed-sheet ledger

Animated: 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87.

Additional individual images: cases/318.png, cases/336.png.

Reduced motion: 20, 21, 22, 23, 24, 25, 26, 27, 28, 29.

The JSON ledger contains one decision, reason, affected sizes, element, and representative phase for every assigned case, plus the reduced-motion decision and source sheet numbers.
