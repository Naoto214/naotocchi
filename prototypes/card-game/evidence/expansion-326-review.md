# Expansion from 196 to 326 — scoped verification

Source baseline: e9499734cc00b1fe4ab5f058b0259c723496e952.
Intermediate saved implementation: 9593bb04f201a68a461ec37497a784f3a7d7180f.

Independent review was limited to changed selection, move replacement, numeric prevention, chain negation/retarget and effect-applied paths. It did not audit the fixed400 or strategy infrastructure.

Findings fixed with executable regressions:
- Effect ordering moved from activation selection to resolution (E-naoto/G-sudoku-mini).
- Pending events from one chain cannot activate a once-per-round ability twice.
- Reveal/coin/deepsea operations report actual applied effects, including empty-deck growth loss.
- Choosing nothing in an optional resolution selection does not report an applied effect.
- Changed replacement destinations are checked against remaining replacements.
- Chain target privacy retains its facedown snapshot after the physical target changes zones.

Narrow re-review confirmed fixes except the final empty-deck deepsea edge, subsequently fixed and covered by `empty-deck deepsea still records the applied growth loss`. No other confirmed serious findings remained in that scoped review. Not a proof of all combinations or all 326 individual cards.

Tests cover atomic payment/selection, cancellation, forged/stale commands, same/distinct card types, dependent payment/target selection, response-time changes, mandatory choices, ownership, once/round limits, inspected-set ordering, source versus effect target references, chain deferral/negation/retarget, and save replay.

Python source definitions remain unchanged. The 452-card catalog check and existing 717 representative Python oracle cases were rerun successfully; newly added effects are not all covered by Python differential fixtures.

196-card baseline browser match: 328 commands, 244 handoffs, R10 A50/B40, save reload and double-click rejection successful, no page errors.
326-card expanded browser match: see expansion-326-browser.json. Actual Safari hardware QA remains for the user.

Remaining 126 IDs are disabled in deck construction and labeled unsupported. Ability copying and event-dependent reservations remain incomplete; no card text is replaced by an intentional no-op fallback. Fixed400 inputs, approvals, previous stops and canonical docs are untouched.
