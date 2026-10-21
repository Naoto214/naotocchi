# SDD ledger — plan: docs/card-game/plans/2026-10-01-normal-decision-resource-pilot-implementation.md
Method: Native, user approved. Base 7fcf8290341a268dd54732cb95b49edb0f751f51. Approved spec414 immutable.
Pre-flight 1→2: compare_problem/validate_problem consumed as defined; no conflict.
Pre-flight 1–3→4: problem schema and wrapper agree; no conflict.
Pre-flight 2–4→5: full transition state must remain distinct from strategy view; adapter handles conversion, not old priority mode forgery.
Pre-flight 4/5→6: planned vs observed IDs and unsupported records retained; no conflict.
Pre-flight all→7: original 505 baseline and historical counts preserved.
Task 1: in progress.
Task 1: complete (commits 7fcf829..fbaf3d4, tests: python -m unittest discover -s docs/card-game/tools -p test_proxy_resource_value_comparison.py -v → OK)
Task 2: Ruling: Existing116 test file currently runs36, not historical34 in plan — preserve all36 and report actual run — cost if wrong: inventory attribution only, no contract change.
Task 2: complete (commits fbaf3d4..72c420b, tests: python -m unittest discover -s docs/card-game/tools -p test_proxy_resource_value_selection.py -v → OK)
Task 3: Ruling: Legacy pass score uses empty card_copy_id — allow empty only for pass to preserve114 tie behavior, verified RED→GREEN — cost if wrong: pass tie priority differs; covered by literal compatibility test.
Task 3: Ruling: Full old121 projector exposes every opponent prepared card; new strategy view conservatively masks undeclared visibility, retains only explicit public cost/face-up metadata — prevents secret text use; unsupported actual visibility representation must stop instead of infer — cost if wrong: extra unsupported boundaries, never secret-informed choices.
Task 3: complete (commits 72c420b..e29d7f7, tests: python -m unittest discover -s docs/card-game/tools -p test_proxy_resource_value_inputs.py -v → OK)

Task 4: Ruling: Historical141 score copy field used instance IDs whereas its116 certificate used physical copy IDs — preserve historical scores for legacy, bind pilot copy field to the owner-visible physical copy — cost if wrong: equality tie ordering; actual source identity is separately validated.
Task 4: Ruling: Fresh candidate scope differs on17 saved boundaries — preserve all110 planned records and classify17 unsupported, without replacing historical legal sets or claiming policy effects — cost if wrong: reduced shadow coverage; no secret-informed or fabricated choice.
