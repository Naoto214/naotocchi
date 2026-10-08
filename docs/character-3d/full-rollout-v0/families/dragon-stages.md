# Dragon all-eight candidate expansion

Base: e45910d. Existing full-rollout design/visual-translation rules govern this bounded family expansion. Original assets/characters/dragon/01..08.png inspected.03/07 definitions remain byte-equivalent under JSON serialization.

| Stage | Original identity | Existing-builder interpretation |
|---|---|---|
| 01 | Seated hatchling, large round head, tiny horns, low tail, no wings | Low trunk, short neck, large head/body ratio; four supporting paws |
| 02 | Walking long-neck juvenile, raised curled tail, short horns | Distinct longer neck and foreleg support, six belly bands; no wings |
| 03 | Upright horned juvenile | Accepted representative unchanged |
| 04 | Young upright body with small newly formed wings | Short wing outline, fuller head, tapered raised tail |
| 05 | Slender smiling winged adult | Narrower chest, longer wings, happy canonical eyes |
| 06 | Strong adult breathing flame | Fuller muzzle/body and three closed colored flame volumes owned by head; eyes unobstructed |
| 07 | Broad mature winged adult | Accepted representative unchanged |
| 08 | Brown/gold seated elder, folded/drooping wings, wraparound tail | Low broad trunk, supported long arms, authored drooping membrane contour and curled tail; sleepy eyes |

Ruling: reuse the existing winged-reptile builder with authored per-stage anatomy; flame is optional head-owned geometry. This preserves rig/face/material contracts. Visual risk: new low juvenile supports and elder wing contour need all8 source-matched captures before runtime promotion. No scale-only family filling or new generic dragon architecture.

Representative gate e45910d:8fourviews+64states+4normal-distance PASS. All8 gate remains pending. Runtime remains204/293.
