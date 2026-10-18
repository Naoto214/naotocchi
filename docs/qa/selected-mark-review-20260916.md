# Selected marker review — 2026-09-16

User supplied 81 exact IDs against image version 959afaea. All 81 marker translations changed; the other 239 marker translations, all 32 sweat placements, every expression PNG, state color, outline and reaction remain unchanged. The selected IDs are stored in tools/expression-placement-review.json.

Silver marks now occupy a visibly diagonal upper-left band. Selected right-side marks move into a diagonal upper-right band. Six orange mark anchors were aligned with perceived head centers. Cat03/dog04 sick lines use a steeper upper-right band and a horizontal head-bound constraint to avoid drifting toward raised tails.

Known limit: cat03/dog04 sweat still sits high to avoid the character, including ears/body/tail and the full falling envelope. These two sweat placements are not claimed resolved; the review page explicitly labels this limitation.

Validation: final npm test 825 passed, zero failures; 320 mark collision cases and 192 sweat envelopes returned no issues. Added a diagonal-direction regression test for the selected states. Compared the complete generated table against baseline: exactly 81 selected translations changed, zero other translations changed. Reviewed all eight overview sheets and the final revised woman01 sheet. Expression PNGs are unchanged.

The touch-selectable page now uses image version r2-2f799f80, defaults to the requested 81 cases, keeps original feedback stored under its old version key, and exports new feedback with the new image version. Verified all 320 asset mappings, 81 filter IDs and feedback serialization. Sheets remain static composites, not device screenshots; sweat is approximated.

PR #278 remains Draft; no main merge.
