# Conservative visual review: candidates 1–116

Reviewed all 116 requested cases visually, at 64/80/104 px and the four sampled phases (0, 390, 1300, 1690 ms). Decision counts: **116 acceptable; 0 candidate; 0 borderline**.

The decision rule was readability and natural overall appearance. Geometric contact alone was not treated as a bug. Local coverage of a small sparkle, lower Z, arrow segment, cloud interior, or zigzag segment was accepted when the intended symbol, sweat, and face remained recognizable. No clear wrong-symbol appearance, excessive face/effect crowding, or obviously unnatural composite met the correction threshold in this range.

The strongest contacts in dog/04, cat/03, turtle/02–03, and butterfly/01 still preserve their intended cues. Butterfly/02 happy (#85) has strong coverage of the small sparkle in some phases, but the main gold sparkle keeps the happy cue clear; this is not an automatic fix candidate.

## Evidence and limits

Every sheet listed below was opened with `view_image` and visually inspected. These are reconstructed composites using the current PNG/SVG assets and supplied CSS-equivalent sweat rendering and z-order (PNG < mark < sweat). They are not live browser screenshots. The conclusion covers these sizes and sampled phases; it does not claim continuous animation or live browser verification. No code, images, positions, or z-order were changed. No wider 2480-case audit was performed.

`affected_sizes` is empty because no actionable defect was found; `reviewed_sizes` records the actual sizes inspected. Per-case reasons are in `visual-a.json`.

## Viewed sheets

- `sheets/01.png` — cases 1–4
- `sheets/02.png` — cases 5–8
- `sheets/03.png` — cases 9–12
- `sheets/04.png` — cases 13–16
- `sheets/05.png` — cases 17–20
- `sheets/06.png` — cases 21–24
- `sheets/07.png` — cases 25–28
- `sheets/08.png` — cases 29–32
- `sheets/09.png` — cases 33–36
- `sheets/10.png` — cases 37–40
- `sheets/11.png` — cases 41–44
- `sheets/12.png` — cases 45–48
- `sheets/13.png` — cases 49–52
- `sheets/14.png` — cases 53–56
- `sheets/15.png` — cases 57–60
- `sheets/16.png` — cases 61–64
- `sheets/17.png` — cases 65–68
- `sheets/18.png` — cases 69–72
- `sheets/19.png` — cases 73–76
- `sheets/20.png` — cases 77–80
- `sheets/21.png` — cases 81–84
- `sheets/22.png` — cases 85–88
- `sheets/23.png` — cases 89–92
- `sheets/24.png` — cases 93–96
- `sheets/25.png` — cases 97–100
- `sheets/26.png` — cases 101–104
- `sheets/27.png` — cases 105–108
- `sheets/28.png` — cases 109–112
- `sheets/29.png` — cases 113–116

## Still-mode supplement

Also visually inspected the same cases 1–116 in unrotated, dy=0, opacity=0.85 reduced-motion / care-motion=still composites. Counts remain **116 acceptable; 0 candidate; 0 borderline**. These are additional views of the same cases, not new cases. Still mode did not erase an emotion cue or create sufficient crowding to change a decision. This supplemental rendering is also an offline approximation, not browser evidence.

- `still/01.png` — cases 1–12
- `still/02.png` — cases 13–24
- `still/03.png` — cases 25–36
- `still/04.png` — cases 37–48
- `still/05.png` — cases 49–60
- `still/06.png` — cases 61–72
- `still/07.png` — cases 73–84
- `still/08.png` — cases 85–96
- `still/09.png` — cases 97–108
- `still/10.png` — cases 109–116 only; cases 117–120 were outside this review
