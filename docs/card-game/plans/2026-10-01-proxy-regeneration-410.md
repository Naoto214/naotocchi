# 410 canonical regeneration restoration

Goal: restore the unsaved minimum input-forwarding change from GitHub 409, without changing historical outputs or removing independent replay.
Authority: user handoff 2026-10-01; remote HEAD 246f63a4f7520ef80439b4aeb4b68cc663be10e4, tree 9449eaae685e20dde1d3308d3c35856274aa6185. Fresh isolated clone; PR259 Draft/open/unmerged.

Constraints: no cache, no card edits, no historical data JSON changes, no R11, no fixture112 invention, independent balance0, no Ready/main merge. Saved409 evidence is historical; all410 evidence must be freshly generated.

- [x] Add nine dedicated tests; instrument real regeneration calls with wraps, compare actual output to saved bytes. Observe duplicate regeneration failures before implementation.
- [x] 124 build_plan(inputs,outcomes=None) retains validate_outcomes independent run; expected_outputs forwards generated outcomes. 124/125/126 check_outputs(data_dir=DATA,inputs=None) forward inputs.
- [x] 125 expected_outputs validates exact route set and canonical SHA256 against SOURCE_SHA before consuming explicit sources; observe forged-event rejection RED then GREEN.
- [x] 126 loads prior125 once, forwards it to check_outputs;127 and128 do the same for their prior source. Keep independent run_all and raw/hash checks.
- [x] Fresh dedicated nine tests, npm test, catalog/default design errors0, historical JSON/hash protection and diff check. Save code/tests/plan/log checkpoint before long regression; label full regression incomplete.
- [x] Fully discover test_proxy_*.py, partition by module into six independent processes. Retain planned IDs, actual IDs, statuses, worker logs and summary. Only identical complete ID coverage, no duplicate/skip, all workers exit0 and all tests pass qualifies as full success.
- [x] Review and verify remote blobs/tree/content,408 raw SHA256 and PR259 state.

Review focus: modified outcomes rejected independently; raw117 tampering rejected; transient registry scope revalidated; fresh disk edits rejected after success; returned mutable objects isolated; explicit125 source event tampering rejected. No use of previous unsaved PASS counts.

Fresh evidence: RED9=5FAIL/2unsupported-API ERROR/2PASS210.118s; GREEN9/9 PASS90.137s. npm exit0;catalog/default errors0;existing505JSON/408hash unchanged;review C/I/M0. Checkpoint saved before full regression; full result remains pending.

Full regression fresh:310modules816/816PASS,6exit0,planned/started/finished IDs exactly match,no duplicates/missing/skip,test source unchanged. Worker seconds1405.596–1622.431. Independent post-run discovery confirms coverage;505protectedJSON/408SHA unchanged. Report411 records result;no balance claim/no Ready/merge.
