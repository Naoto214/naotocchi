# Dragon original-art independent review — 2026-09-22

Reviewer: independent agent, Astra medium as requested. Scope: original art, identity classification, proposed face anchors only. No repo files edited; no expression generation or review of previously completed expressions.

## Evidence inspected

All eight `assets/characters/dragon/01.png` through `08.png` in `/workspace/scratch/d2a935d02daf/expression-code` were opened individually at native 128px, together with each corresponding `-6x.png` and `-grid.png` in `/workspace/scratch/d2a935d02daf/dragon-inspect`. This is 24 individually inspected images, not a contact-sheet-only inference.

Stage names and growth progression agree between `script.js:239–249` and `character-world-master.v1.js:46`. Native face-anchor format and downstream use were checked in `tools/expression-face-anchors.json` and `tools/place-expression-marks.cjs`.

## Classification and proposed anchors

Coordinates are original 128×128 image coordinates. `[x,y,left,right]` gives perceived facial center and approximate lateral head extent, excluding large wing surfaces and fire. These are observed starting anchors, not claims that generated mark placement has been verified.

| Stage | Original stage | Classification | Proposed [x,y,left,right] | Distinctive preservation points |
|---|---|---|---|---|
|01|ちびりゅう|One individual, one head/face|[83,84,58,96]|Very small seated orange baby low in frame; tiny horns, large eyes, cream muzzle/chest, short curling tail. Do not enlarge body to fill empty upper canvas.|
|02|子りゅう|One individual, one head/face|[92,61,64,105]|Taller quadrupedal child, small horns, long upright neck, high curled tail, open smile.|
|03|つのの生えたりゅう|One individual, one head/face|[96,55,70,113]|Long paired horns, right-facing muzzle, raised right-side foreleg, curled tail. Visible profile eye does not imply a missing second face.|
|04|小さなつばさのりゅう|One individual, one head/face|[88,45,64,103]|Small paired wings, upright biped stance, long cream horns, slightly worried original expression, cream segmented belly.|
|05|つばさの育ったりゅう|One individual, one head/face|[85,53,66,96]|Large spread wings, original wink, curved tail, raised claw. Wing creases are structural artwork, not secondary faces.|
|06|火をふくりゅう|One individual, one head/face; fire is a design element|[83,49,64,97]|Large wings, horned side-facing head, open mouth emitting connected yellow/orange fire, glowing fire sparks. Fire has no eye/mouth configuration and is not a separate living character.|
|07|大きなりゅう|One individual, one head/face|[77,31,57,90]|Large broad adult, head high in frame, broad pale plated chest/belly, paired wings, coiled tail.|
|08|いにしえのりゅう|One individual, one head/face|[85,43,63,100]|Brown/golden aged scales, many long branched horns, heavy pale muzzle/chin, seated broad body, spread wings, thick coiled tail. Horn branches are not extra heads.|

Suggested array:

```json
[[83,84,58,96],[92,61,64,105],[96,55,70,113],[88,45,64,103],[85,53,66,96],[83,49,64,97],[77,31,57,90],[85,43,63,100]]
```

## Findings

All eight stages have exactly one living individual and one face. No stage warrants ambiguous-classification escalation under rule C. In particular, stage06 fire is visually continuous from the mouth and is corroborated by the stage label 火をふくりゅう (`script.js:246`; `character-world-master.v1.js:46`). No separate face is present in the flame.

The earlier mushroom ambiguity does not transfer to dragon. For dragon the classification follows the visible anatomy and the consistent growth labels.

Anchor cautions: stage01 is intentionally low and small; stages05–08 have wings/horns that can force marks farther from the facial center. Stage06 flame is part of the original silhouette and must be considered by the existing union-of-alpha placement/collision checks, even though it is excluded from the facial lateral span. Stage08 original eye is narrow/partly shaded; retain the recognizable aged face and horn structure while making the requested states readable. Preserve original flame shape as far as expression anatomy permits; do not create a new face in it.

This review establishes source classification and reasonable initial anchors only. The 80 expression edits, composited mark review, collision checks, runtime tests, and device acceptance remain separate work.
