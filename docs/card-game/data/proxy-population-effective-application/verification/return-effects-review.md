# C-bat/M-antlion-06 return resolution review

Base 75483e95de2003434d2410b94fc2cf8c77ba3e06. One independent read-only review: C0/I0/Minor1. Exact source72/55 return semantics match; reviewer focused5PASS and inline retained-outer-link probes for both sources PASS. No native handler or historical pin change.

Minor deferred: retained nonempty outer stack has no committed dedicated regression. Existing independent probes pass; keep this explicit under P07, not a new rule or a claim of all dispatch completeness.

TDD: missing audit3FAIL; direct GREEN3PASS. First-green had fixture error: departed source was tested outside existing effects.scope/activation_reference; corrected test scope without reimplementing it. Coverage-entry first RED hit old stale-event-hash rejection; strengthened mutation to rebind all hashes. Bound entry RED then reached later missing final envelope, proving the old coverage had no semantic rejection for the supplied extra draw. Connected GREEN4PASS; face-up attachment test added, related30PASS2.634s. All attempts retained.

Ruling on review exclusions: activation/payment history, choice authority, all opportunities, admission remain explicit false/None and separate P07/P09/P10/P11 gates. Supplied resolution semantics never authenticate the link. Author verifies RED evidence, documentation and integration separately. C-bat is triggered by own quick play during opponent turn, without successful application as a prerequisite; it returns a prepared card, not draw. Corrected the prior human inventory row, no native behavior changed.

Verification commands:
- PYTHONPATH=docs/card-game/tools python -m unittest test_proxy_population_return_effects test_proxy_population_trigger_effects test_proxy_population_effect_creation test_proxy_population_trigger_coverage test_proxy_population_resolution_order test_proxy_population_relationship_consumption
- PYTHONPATH=docs/card-game/tools python -m unittest test_proxy_population_challenge_window test_proxy_population_connected_entry test_proxy_population_admission test_proxy_population_runtime_entry
- npm test
- python docs/card-game/tools/check-design-data.py

Related30PASS; npm406PASS; design errors=[]; numbered476 unchanged. Frozen-source integration result recorded in return-effects-integration.log. These are not all-proxy regression results. No seed generation, production input fixation or400 games. preflight-ready=false.

Final frozen-source integration22PASS162.362s (previous19 scope plus runtime_entry3). Related30PASS2.634s; npm406PASS; design errors=[]; numbered476 unchanged. Independent C0/I0/Minor1 deferred as above. No production seed/input/game.
