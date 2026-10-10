# Eagle repair and Author Naoto: independent actual-image review

Capture source: `e16963da37bed05de483096e6bafc83df6196b3a`.
Recovered archive: `5be8349` (controller-provided identifier); controller reports 151 raw-file hashes verified.
Evidence directory: `docs/qa/character-3d-full-v0/export/e16963da37bed05de483096e6bafc83df6196b3a/eagle-author-legacy-complete/`.

Actually opened Eagle and Author source-inline four-view boards. Also opened Eagle's individual 34 image; Author's individual front/34/side/back images; and actual `assets/characters/author/naoto.png`. The previously opened Eagle original and binding source description were reused. Controller handles the 128 states and eight distance images, including legacy rows; no full sweep or legacy acceptance was duplicated here.

**Spec/source-fidelity verdict: CHANGES REQUIRED for Author hair. Quality/four-view verdict: Eagle PASS, Author REJECT. Critical: 0. Important: 1.**

| Role | Actual four-view disposition | Result |
|---|---|---|
| `partner:high_eagle` | PASS scoped wing-repair re-review | Long descending layered primaries now approach talon level and replace the former short shallow wedges. The source's lowered-wing pose/extent is restored. |
| `author:naoto` | REJECT | Smooth domed hair cap and continuous low fringe omit the source's defining center-parted waves; I1 below. |

## Eagle prior wing finding resolved

`partner-high_eagle-views.jpg` front/34/back and `partner-high_eagle-0-34.jpg` now show layered brown coverts and pale dark-tipped primary feathers hanging along the body toward the talons. They no longer terminate around mid-belly as the previously rejected short wedges did. Side view retains the descending wing depth. Cream head/ruff, gold hooked beak/talons, brown body and short tail remain recognizable and physically supported; no new blocker caused by this wing correction is visible.

The broad lowered source silhouette is therefore restored in actual images, independently of the reported geometry checks. Full state/distance completion remains the controller's gate.

## I1 — Author's hair still renders as a helmet/cap rather than center-parted waves

Exact evidence: `author-naoto-views.jpg`, `author-naoto-0-front.jpg`, `author-naoto-0-34.jpg`, `author-naoto-0-side.jpg` and `author-naoto-0-back.jpg`, directly compared with actual `assets/characters/author/naoto.png`.

The original has medium-short dark-brown wavy hair parted at the center. A clearly exposed central forehead separates outward-sweeping left/right locks, and the hair's side silhouette has layered wavy ends around the temples/ears.

The captured front/34 images instead show one smooth dark dome covering the top of the head, ending in a nearly continuous horizontal/scalloped low fringe. There is no readable center opening or left/right wave division over the forehead. Side and rear views reinforce the compact helmet/cap silhouette, with little visible flowing side-lock structure. Small surface ridges or geometry that exists inside the cap do not restore the missing source presentation.

This is a characteristic hairstyle mismatch, not a request for identical pixels, anime facial duplication, or generic added detail. The canonical face, slim standing body, white hoodie/dark shirt, navy trousers and dark/pale-soled shoes otherwise remain recognizable; those are not new blockers.

Affected geometry: the candidate's `naoto.hair.closedVolumes` cap and `naoto.hair.closedPaths` locks in `character-3d/nonplayer-spec.js`, with established humanoid ownership. Requested result: locally reshape/place the cap and visible locks so the center-part forehead opening, outward wave division and wavy temple/side silhouette read in front/34/side/back. Preserve a closed physically connected hair assembly, source face clearance, existing owners, body/clothing and factory defaults. Geometry presence or a `style:'center'` data value alone cannot be its acceptance test. Fresh full Author image QA is required after correction.

## Remaining gates and limits

Eagle passes this independently inspected four-view repair gate; full all-state/two-distance acceptance is completed by the controller. Author remains REJECT until actual-source hair fidelity is corrected and fresh complete QA passes. Author routing, bounded QA placement, natural-region fallback, human/device QA and final CI status remain separate from these visual decisions; no production-region expansion or promotion is implied.

No additional Critical/Important blocker or actionable minor was found in this scoped review. No implementation edits, tests, mutations, produced-geometry probe, rerender, remote operation, promotion or subagent was performed. This report is the only written artifact.
