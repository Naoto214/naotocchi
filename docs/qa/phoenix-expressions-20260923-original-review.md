# Phoenix original images — independent review

Reviewer: phoenix_review subagent. Date: 2026-09-22.

## Evidence actually inspected

Read the current three-class section at docs/superpowers/specs/2026-09-15-cat-expression-pilot-design.md:153–164, including the priority of current rules, A/B/C definitions, and the prohibition on mistaking objects or flames for separate living individuals. Cross-checked phoenix stages in script.js and character-world-master.v1.js and the eight phoenix growth descriptions in script.js.

Opened all eight assets/characters/phoenix/01.png through 08.png individually using view_image at native size and individually opened all eight 6× nearest-neighbor enlargements in phoenix-inspect. Inspection did not rely on a contact sheet.

## Classification

All eight stages have one body and one face. A/B/C multi-component classification is not applicable. No new ambiguous classification requiring user confirmation was found.

| Stage | Growth stage | Observed structure and decision |
| --- | --- | --- |
| 01 | 火のひな | One chick; connected crest, wings and tail flames belong to that chick. |
| 02 | よちよち火の鳥 | One stepping bird; raised wing and flared tail do not contain additional faces. |
| 03 | 若い火の鳥 | One long-necked bird with a single visible facial profile. |
| 04 | 空を飛ぶ火の鳥 | One bird with spread wings; fiery wing and tail tips are plumage/flame. |
| 05 | 燃えさかる火の鳥 | One airborne bird; spread wings and curled fire tail remain attached to the same body. |
| 06 | 金色の火の鳥 | One golden bird, single face, two wings and one trailing tail structure. |
| 07 | 年を重ねた火の鳥 | One aged bird; gray feathers and drooping wings are age characteristics, not additional individuals. |
| 08 | 灰からよみがえる鳥 | One chick emerging from an ash/coal pile. Coal pieces and detached sparks have no living faces and are environmental objects/flame, not B group members or C companions. Matches rebirth stage and growth text. |

Preserve all source silhouettes, wings, tails, fire, sparks, age colors and stage08 ash/coal. Only the existing face should express each requested state. No added faces or compulsory emotional treatment of sparks/coal.

## Suggested face anchors

128×128 source-pixel coordinates, tuple [faceX, faceY, leftHead, rightHead]. The first two values center the existing facial features; last two conservatively bracket the head/crest horizontally for placement. These are review recommendations for subsequent collision-aware mark placement, not a claim that final overlays have already passed visual QA.

| Stage | Recommended tuple |
| --- | --- |
| 01 | [73, 88, 53, 87] |
| 02 | [77, 73, 55, 92] |
| 03 | [80, 55, 54, 90] |
| 04 | [82, 59, 58, 92] |
| 05 | [83, 44, 61, 93] |
| 06 | [77, 35, 48, 86] |
| 07 | [84, 36, 55, 95] |
| 08 | [63, 79, 49, 78] |

Mark placement must include final expression alpha bounds. Stages04–06 have raised wings near the head; stage08 has detached source sparks and a wide coal pile. Stage07's drooping old-age expression must remain distinguishable from new sick/tired/weak/critical expressions while retaining its aged identity.

No production files or completed 1840 expression images were changed by this review.
