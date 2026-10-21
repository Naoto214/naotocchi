# Fixed400 execution — stopped, no retry/resume

Approved publication: d4e24431a1f3c9b6dae0cc9b8d8c5099db3a5e02
Request SHA-256: e932c1632915fb98597a42ff8d2884fbb2efae6406613ddea4953faa874ba59c
Owner comment: 6162350238, Naoto214 / 323909980. Exact body including terminal LF verified; creation/update timestamps equal; no currently visible revocation. Historical deleted edits/revocations are not proven absent.
Claim-only publication: 9de03b432d5051f77a8cdefa87a91a1bbb8ceab1
Claim tree: 0137fca5fb31d4a844033ee29e50157ec306939e

Fresh prevalidation passed. One exclusive consumption, one supervisor invocation and one worker invocation. Supervisor and worker live authorization gates passed. Fixed 200 groups / 400 mirrored rows retained; seeds, initial order and inputs unchanged; limit 512. No operation retry/resume occurred.

Result: stopped. First row group-001-A-first is record_unverified. Completed 0/400 (0% of planned rows); 399 not_executed. Worker exit 1: KeyError 'A-035#2' in proxy_continuation_quick.py verify, accessing prior legacy game_state.cards[source], reached from end-of-turn history verification. This is a runtime verification exception, not a transport failure or 512-step completion. Exact root cause, event sequence and repair are not established by the retained traceback alone.

No record.json.gz or receipt.json was produced, so no completed game, outcome, exact step count, policy eligibility or strategic conclusion is certified. No whole-population/card-balance conclusion is justified; independent balance samples remain zero. Missing proof was not inferred or skipped.

Raw supervisor/attempt starts, request/result, interruption and fixed 400-row supervisor report are preserved in docs/card-game/data/proxy-population-400-bounded-read-run-20261014/. Full worker stderr and consumption/prevalidation evidence are retained here. Prior tracked files, old stop originals and old approval claims were unchanged. Comment 6162350238 is consumed and cannot be reused; 6159857990 remains untouched.

Next: authorize investigation/repair of the history-verifier reference boundary. No worker rerun or ended-supervisor restart is authorized by this result. Any future execution requires the applicable new-edition/request/owner-approval workflow; retain the fixed material and this stop original.
