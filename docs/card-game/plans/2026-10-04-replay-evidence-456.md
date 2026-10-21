# 456 Saved Replay Evidence — Implementation Plan

Inline sequential TDD; one final independent review. Continues approved454/455, no new rules or matches.

Goal: independent replay from the existing signed initial loader, compare every saved field, and report bounded evidence for candidate/selection/decision-opportunity regeneration. Existing executor is the oracle; not an independent game implementation, optimality proof, global legality checker, or balance admission.

1. Test compare_replayed(saved,replayed): exact canonical equality, changed/omitted/extra/reordered decisions, changed candidate/flags/events/snapshots/result, unknown fields, no mutation, mismatched run identity, cannot admit. RED then minimal implementation.
2. Adapter audit_saved_file(path_id): pinned447 manifest and file SHA; load original route independently; invoke existing439/447 executor for each of3policies; compare before producing evidence. Unknown route/policy rejected. No saved choices injected. Save compact hashes/counts/status only. Initial source validators and engine continue unchanged.
3. Run4 saved input files in isolated processes (scopes monkeypatch shared modules, so no threads), total12replays. Preserve all previous data. Failure remains error/unverified, not a new game loss or unresolved=0.
4. Dedicated+455+116/119 tests and npm; source/protection checks. Rebuild compact final aggregate twice from verified per-path artifacts (not claim24replays). One review and TDD fixes if needed; saveGitHub, verifyHEAD/tree/PR.

Files: tools/proxy_replay_evidence_audit.py, tools/test_proxy_replay_evidence_audit.py, data/proxy-replay-evidence-456/{reproduce.py,contract.json,paths,summary.json,verification},456report,README.

Admission permanently null. Strategy remains unresolved if original modes/flags say so. Replay reproduces operational choices; it does not prove seeded strategic merit. Independent experimental sampling plan remains unapproved. Full beyond-executor opportunity completeness stays unverified.

Execution: steps1–4 completed. 8 dedicated +15/36/31 related tests and npm406 passed; 12 saved replays exact; two aggregate generations byte equal; design errors empty; one independent review with no findings. Final aggregate/log packaging followed review. Existing tracked files preserved except README index.
