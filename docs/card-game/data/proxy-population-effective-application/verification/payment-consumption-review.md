# Next-transform payment consumption review

Base: dc4154e4ea0cc69717d6b24402a069e45e25de31.

One independent read-only review: **C0 / I0 / Minor0**. No blocking findings. Reviewer independently ran payment consumption and expiry suites: 12 PASS in 1.085s. No second review.

Source91 preserves next-transform modifiers across the old main departure and excludes birth/time_skip. The existing batch.transition performs consumption. The new audit binds its supplied movement to the closed normal entry, actor/source/variant/sequence, exact sorted consumed IDs and retained other-controller rows. Actual transform at floor-zero payment is covered. Broader envelope/event validation remains in coverage's existing latching.capture; this narrow audit is not a standalone state authenticator.

TDD: missing audit 3 RED then GREEN; actual coverage export 1 RED then connected. Added wrong actor/source/variant/phase/open-chain/retained-value cases. Final related suite: 58 PASS in 8.092s. Initial integration: 19 tests, 1 failure, because the added test wrongly assumed the existing 20-turn fixture includes main_movement. Its diagnostic event inventory contains no main_movement. Corrected only that assertion to compare the verification flag with actual per-event applicability; actual transform consumption remains positively tested through the existing movement handler. This was a test assumption failure, not evidence of a runtime defect. Initial failure log is retained, final integration logged separately.

Payment arithmetic, effect creation provenance, other effect families, legacy reservations, all-rule opportunities, actual permitted-information use/operand origin, external approval authentication and input lock/provenance remain unproved. No policy/balance admission. No production seed, input lock or games. Existing107 decks / planned400 rows unchanged; old116 excluded, policy promotion=false, independent balance sample0, overall conclusion=null. npm406 belongs to the preceding expiry bundle; this is not a latest full-proxy regression.

Final frozen-source integration: 19 PASS in 133.828s. Final design errors=[]; protected numbered476 unchanged.
