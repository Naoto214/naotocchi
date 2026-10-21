# Native arrival/end predicate bundle review

Base36c4b91378b3995cb3febf2c34dbf93571c77cb0. One independent read-only reviewer /root/review_native_predicates: Critical0 / Important1 / Minor0. Reviewed source31/55/74/77/89 and existing adapter composition; independently passed7 new tests. No edits or second review.

I1: ExistingAdapter.collect/proof is used to observe every transition by trigger_coverage, including second response passes entering resolving. The new wrapper wrongly applied the activation guard to empty observations. Conditional arrival/end fixtures reproduced2RED; initial integration19 had2errors with the same cause. Fix permits only native arrival/end empty observation to proceed to the unchanged semantic comparison. Expected alternatives are not forced empty; missing positive alternatives still fail. Nonempty activation rows during resolution and all start/latched guards still reject, as does sequential.inventory. Added both empty-observation and positive/missing-positive rejection cases across all7 mechanisms.

Final related37PASS (7.958s) in native-predicates-final-related-foreground.log. Two earlier background attempts terminated without unittest summaries; their logs are retained as incomplete observations and are not PASS. One reported `fatal library error, lookup self`; no code change was made for it. Final integration is separately recorded in native-predicates-final-integration.log. Design errors=[] and numbered top-level476 unchanged before final guard correction; the final guard changes no source data. No latest all-proxy/npm run claimed.

Ruling: resolving event observation is distinct from executable activation inventory. Only an independently empty native set can pass this observation boundary; a nonempty set is never admitted during resolution. Promoting observation to execution would violate06, so sequential selection retains its existing unconditional guard.

Declined-to-judge ruling: origin/history authenticity, first-opportunity closure, information isolation, candidate identity grammar, reused _used/_since helper correctness, policy/balance admission remain unproved. Helpers were deliberately reused; a narrow current predicate certificate does not independently certify them. Cost of promotion is false opportunity/admission evidence, so readiness stays false. Existing114/116/119, 474B, seven-card area claim,107 decks and planned400 rows preserved. No new seed/input lock/run.

Final guard source design recheck: errors=[].

Final corrected implementation: connected19PASS (134.736s), including historical115/test-zero-root full20turn/R10, connected entry and admission. Same production source as related37. I1 fixed; no second review. No background test or population execution is retained after the check.
