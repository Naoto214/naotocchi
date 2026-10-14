# Matched camera measurements

All values are software-browser measurements. Position/elevation use world units.
Ground share is projected flat ground clipped to the viewport, not image pixel area.
The raw JSON retains the unclipped 1−horizon value; >100% means horizon above the viewport.

| Variant / viewport | Canvas | Elevation | Physical pitch ° | Center ray down ° | Visible vertical FOV ° | Three FOV ° | Horizontal FOV ° | Horizon from top % | Feet from top % | Ground in viewport % |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| legacy / 393×760 | 279×432 | 349.78 | 0.00 | 17.98 | 74.85 | 97.46 | 53.19 | 30.09 | 80.00 | 69.91 |
| legacy / 852×320 | 558×220 | 89.23 | 0.00 | 4.74 | 23.30 | 32.40 | 55.36 | 30.00 | 80.00 | 70.00 |
| legacy / 667×300 | 373×220 | 133.48 | 0.00 | 7.08 | 34.04 | 46.98 | 55.16 | 30.00 | 80.00 | 70.00 |
| legacy / 852×390 | 558×220 | 89.23 | 0.00 | 4.74 | 23.30 | 32.40 | 55.36 | 30.00 | 80.00 | 70.00 |
| rejected / 393×760 | 279×432 | 349.78 | 0.00 | 17.98 | 74.85 | 97.46 | 53.19 | 30.09 | 80.00 | 69.91 |
| rejected / 852×320 | 558×220 | 150.88 | -7.61 | 12.36 | 23.30 | 32.40 | 55.36 | -2.20 | 80.00 | 100.00 |
| rejected / 667×300 | 373×220 | 150.88 | -2.09 | 9.17 | 34.04 | 46.98 | 55.16 | 24.12 | 80.00 | 75.88 |
| rejected / 852×390 | 558×220 | 150.88 | -7.61 | 12.36 | 23.30 | 32.40 | 55.36 | -2.20 | 80.00 | 100.00 |
| candidate / 393×760 | 279×432 | 349.78 | 0.00 | 17.98 | 74.85 | 97.46 | 53.19 | 30.09 | 80.00 | 69.91 |
| candidate / 852×320 | 558×220 | 150.88 | 0.00 | 7.99 | 38.05 | 52.32 | 82.78 | 30.00 | 80.00 | 70.00 |
| candidate / 667×300 | 373×220 | 150.88 | 0.00 | 7.99 | 38.05 | 52.32 | 61.01 | 30.00 | 80.00 | 70.00 |
| candidate / 852×390 | 558×220 | 150.88 | 0.00 | 7.99 | 38.05 | 52.32 | 82.78 | 30.00 | 80.00 | 70.00 |

## Screenshots

All 36 screenshots are saved. Representative matched comparisons:

| Region / orientation | Original camera | Rejected pitch | Candidate |
|---|---|---|---|
| forest 393x760 | [legacy](legacy-forest-393x760.png) | [rejected](rejected-forest-393x760.png) | [candidate](candidate-forest-393x760.png) |
| forest 852x320 | [legacy](legacy-forest-852x320.png) | [rejected](rejected-forest-852x320.png) | [candidate](candidate-forest-852x320.png) |
| snow 393x760 | [legacy](legacy-snow-393x760.png) | [rejected](rejected-snow-393x760.png) | [candidate](candidate-snow-393x760.png) |
| snow 852x320 | [legacy](legacy-snow-852x320.png) | [rejected](rejected-snow-852x320.png) | [candidate](candidate-snow-852x320.png) |
| city 393x760 | [legacy](legacy-city-393x760.png) | [rejected](rejected-city-393x760.png) | [candidate](candidate-city-393x760.png) |
| city 852x320 | [legacy](legacy-city-852x320.png) | [rejected](rejected-city-852x320.png) | [candidate](candidate-city-852x320.png) |

## Outcome

- Browser: 45 matched pose/viewport samples (including 9 exact portrait restorations), plus 13 regional lifecycle checks: 58 PASS.
- Separate real-input/layout checks: 28 PASS, default/billboard 3D and both Canvas modes.
- Forest and city landscape before/after visually inspected: more upper scenery/buildings visible, retained player/party and feet; no image stretching observed.
- Portrait matrix/position identical across variants; no claim of pixel-identical animated frames.
- Forward ground samples at 300/900/1800 units remain in-frame in candidate captures.
- New candidate requires physical iPhone acceptance; this is not a performance result.
