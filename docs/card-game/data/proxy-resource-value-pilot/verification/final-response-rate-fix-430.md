# Final metric consistency check

During final cross-check of actual decision schemas, canonical response decisions used response_seeded_fallback/strategic_unresolved_response_seeded_fallback and legal_candidate_ids. The evaluator recognized only the normal seeded_fallback mode, so25 actual response seed decisions were omitted from response fallback and unresolved counts. Normal metrics were unaffected. Fixed with a canonical-schema reproduction test RED→GREEN.97 dedicated tests now cover both normal and response modes. The final implementation fix pass remained open; no second review dispatched.

Expected actual schema totals from427: response_unique230 + response_seeded_fallback25 + priority_unique2 =257 response decisions; mandatory seeded61; normal85. Response pass239 + activation18 =257. Response effects are separately counted, not double-counted as hand plays. All8 stops are normal judgments.429 evaluation remains historical;430 supersedes the incomplete response counters.

Full430 was interrupted, success false; partial912 results are not combined with any new run. New full manifest is required after this correction.
