# Spider yarn, Eagle and Snowman: independent actual-image review

Capture source: `73a1b4e384b1a636a1f2f557edd3afd1cd19dfe6`.
Evidence directory: `docs/qa/character-3d-full-v0/export/73a1b4e384b1a636a1f2f557edd3afd1cd19dfe6/spider-yarn-eagle-snowman/`.

Actually opened all three source-inline four-view boards and the three actual partner PNG originals. For specific uncertainty, opened individual Snowman front/34/side and Eagle front/34/back images. Read the prior Spider omission and Task 9 source/contact review for context. The controller owns all-state/two-distance review; no sweep was duplicated.

**Source-fidelity verdict: CHANGES REQUIRED for Eagle's wing silhouette. Quality/four-view verdict: two PASS, one REJECT. Critical: 0. Important: 1.**

| Role | Actual four-view disposition | Result |
|---|---|---|
| `partner:knitting_spider` | PASS scoped yarn-fix re-review | A distinct round green yarn ball now hangs below the knitted strip, with visible trailing yarn joining it. The former missing-source-prop finding is resolved. Needles, strip, face and eight-legged body remain readable. |
| `partner:snowman` | PASS scoped four-view review | Three decreasing snow spheres, navy folded hat, red scarf/panel, carrot nose, two buttons and three-finger twigs preserve source identity. Head/body and scarf appear supported/connected in front/34/side, rather than a detached head above a floating collar. No new blocker found. |
| `partner:high_eagle` | REJECT | The lowered layered-wing silhouette is missing: captured wings form short shallow wedges ending around mid-body rather than long hanging primaries approaching the talons. I1 below. |

## I1 — Eagle's actual lowered-wing silhouette is not preserved

Exact evidence: `partner-high_eagle-views.jpg`, `partner-high_eagle-0-front.jpg`, `partner-high_eagle-0-34.jpg` and `partner-high_eagle-0-back.jpg`, directly compared with `assets/characters/partners/high_eagle.png`.

The actual source has broad layered wings whose long outer/primary feathers sweep downward along the body; their distal ends reach near the talon level. This is a prominent part of the source's perched, lowered-wing silhouette, beyond just white head/brown body/gold beak coloring.

The captured normal/idle front and 34 instead show small triangular wedge-shaped wings spreading shallowly sideways. Their outer pale/dark tips terminate substantially above the torso's lower belly and feet. Rear view similarly reads as two short sloping bands/triangles with a pale stripe, rather than the source's long descending feather fan. The actual side view loses most of the wing's depth silhouette. The source reference and rendered model therefore have a materially different wing pose/extent, despite the correct cream head, ruff, hooked gold beak and talons.

This is an actual image finding, not a inference from implementation intent or an assertion that anatomy tests failed. The controller independently notes the same short-wedge appearance in motion. Existing attached-feather/contact/cap/budget tests can pass while the source's lowered-wing silhouette remains wrong.

Affected candidate geometry: `highEagle.wings.left` / `.right`, specifically the existing primary feather centerlines and overlapping brown coverts, together with their candidate wing placement/pose. The current image shows the outer feather endpoints forming the short wedge. Requested result: redistribute/reshape the same owned layered wing geometry into longer descending primaries and appropriate overlapping coverts to recover the source's lowered fan silhouette across front/34/side/back. Preserve body/head/beak/talons, physical feather/body connection, canonical face clearance and prior family defaults. No shared-factory redesign or unrelated source edit is requested. Geometry should be redistributed within the established <18000 budget rather than added without checking the small reported margin. Fresh full Eagle image review is required after correction.

## Resolved and retained findings

Spider's green ball is present in front/34/side/back and visibly connected through trailing yarn to the existing strip, so the original prop omission from `six-aquatic-mermaid-image-review.md` is resolved. Its simplified ball surface is not a new blocking source mismatch.

Snowman raw front/34/side views show the head meeting the central snow body and the scarf wrapping the neck/body junction with its panel descending over the middle sphere. The apparent rim spacing is not evidence of a floating head/scarf. Existing reviewed physical contact evidence supports those interfaces; no further geometry probe or test replay was necessary. Source identity, props and exposed canonical face remain clear in these views.

## Remaining gates and limits

Spider and Snowman pass this independent scoped actual four-view review; full image acceptance also includes the controller's separate state/distance checks. Eagle remains REJECT until a localized lowered-wing correction and fresh complete gate. Human/device QA and final CI status remain separate; no promotion is implied.

No additional Critical/Important blocker or actionable minor is asserted. No implementation edits, tests, mutations, produced-geometry probe, rerender, remote operation, promotion or subagent was performed. This report is the only written artifact.
