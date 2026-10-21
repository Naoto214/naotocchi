# Current public turn review

Independent read-only review /root/review474_bundle: Critical0 / Important0 / Minor0.

89 W-city counts the owner's cards in this turn, not only the owner's turn. 06 resets both players' per-turn usage when the active turn changes. New opt-in boundary/count/usage and W-city candidate enumeration agree with those sources. Existing response window/occurrence distinction and source_instance_id usage remain. Switch-before-start handling is restricted to turn_start; missing history is not zero. Native activation/resolution and selectors are reused, historical code unchanged.

Static source/diff review only; supplied-history fixtures do not prove origin or all rule opportunities. After review, the existing opponent-turn test was extended to actually activate and resolve with the existing designated look callback (test-only roots). Final related25PASS includes20turn source-bound prefix. No experimental generation or new games.
