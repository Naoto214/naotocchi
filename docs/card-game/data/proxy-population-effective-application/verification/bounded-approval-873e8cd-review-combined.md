# Independent bounded approval read review

Reviewed working diff against `84789832f7c85c4a0b146a854996c4c6163b61e0`, including the new transport, retry tests, and plan. Review began before implementer follow-up fixes. Line references below refer to the reviewed snapshot; later fixes can move them. No repository files edited by this reviewer. No live API calls, production approvals, full suite, or game execution performed.

## Important findings

### 1. Removed redirect helper breaks execution rebinding

Location: `docs/card-game/tools/proxy_population_external_approval.py:135` (replacement of `_NoRedirect`); dependent call at `docs/card-game/tools/proxy_population_execution_binding.py:57`.

The old module-level `_NoRedirect` class was removed, but `read_remote_commit` still instantiates `approval._NoRedirect()`. Consequently every real historical remote-commit check needed by rebinding raises `AttributeError` before opening a connection. Historical-read unit coverage patches `read_remote_commit` itself and does not detect this integration regression.

Minimal reproduction on the initially reviewed snapshot: patch `rebinding.build_opener` with a network-forbidden sentinel and call `rebinding.read_remote_commit('a'*40)`. Evaluation of `approval._NoRedirect()` fails before the sentinel is called. Preserve the exported helper or update all dependent imports, and test the unmocked reader with a synthetic opener.

Status: reported immediately; implementer added the compatibility alias during this review. A later synthetic probe reached the network-forbidden opener sentinel, confirming that the missing-attribute failure was no longer present. I have not independently reviewed the accompanying new regression test.

### 2. Later gate failures discard recovered observation diagnostics in operator/worker errors

Locations: `docs/card-game/tools/proxy_population_approval_publication.py:53-56`; `docs/card-game/tools/proxy_population_launch_authorization.py:50,56-60`; downstream `proxy_population_batch_supervisor.py:48`, `proxy_population_attempt_runner.py:39`, and `proxy_population_generation_authorization.py:30-32`.

The new `failure_text(live)` is used only when live verification itself fails. If the verifier recovers from a transient outage and succeeds, then saved/current comment comparison, fresh remote publication, saved supervisor validation, or final edition validation fails, the new read audit stays inside a nested proof but is absent from `errors`. Supervisor and worker callers serialize only `errors` and never persist that nested proof when authorization fails. The endpoint, attempts, UTC times, HTTP status, and reasons for the recovered outage disappear from the terminal operator/worker diagnostic.

Synthetic reproduction performed: obtain a valid live proof after one mocked timeout followed by successful fixture reads; have `_read_committed_claim` return matching saved comment, `_verify_live_at_head` return this proof, and `remote.verify` return `fresh_remote_head_verified=False`. Publication retains the audit under `live_approval`, but its `errors` contains only `fresh consumption publication differs`. Passing that proof through real `audit_launch` produces:

```
["launch approval publication differs: ['fresh consumption publication differs']"]
```

This is exactly the content downstream gates serialize. Preserve all accumulated live-read audits in the terminal error/report at every enclosing gate, including gates that fail after a successful verifier. This must also cover generation callers because they use the same publication reader.

### 3. Successful prevalidation is lost if consumption subsequently fails

Location: `docs/card-game/tools/proxy_population_launch_authorization.py:102-104`; related low-level path `docs/card-game/tools/proxy_population_external_approval.py:263-280`.

`consume_launch_after_prevalidation` only returns `checked` after `consume_live` succeeds. If fresh claim-time verification fails, or exclusive claim creation/write/fsync fails, the function propagates the consumption exception and drops the entire successful prevalidation, including any recovered read attempts. Moreover, after a successful claim-time verification, `consume_live` itself emits an ordinary filesystem exception on claim persistence failure, losing that second read audit too.

Synthetic reproduction performed: mock `prevalidate_launch` to return a verified result containing the recovered observation from finding 2; make `consume_live` raise `ValueError('second verifier failed; second-audit-only')`. The real wrapper raises exactly that text; the first observation audit is absent. A mocked `os.open` failure after a successful low-level verifier reaches the same loss mechanism for claim-time diagnostics.

Retain prevalidation and claim-time audits on the error path without retrying the mutation. A consumed or partially persisted ID must remain terminal; preserving diagnostics must not imply rollback or reconsumption.

## Smaller findings / test coverage

- `proxy_population_approval_transport.py:27-31,35-42` and approval read auditing around `external_approval.py:222-231`: an actual HTTP 200 response containing malformed JSON becomes `kind='invalid'` without status in the child protocol. The parent raises `ValueError`, so the audit reports `http_status=null` although HTTP 200 was observed. Redirect rejection similarly throws away its known response status. No erroneous retry occurs, but this falls short of retaining the known HTTP status in failed-read diagnostics. Carry response status separately from parse/validation outcome.
- New prevalidation tests inherit a fixture-wide mock of `require_generated_package` and also replace `_preclaim_package`. They therefore do not demonstrate that failure of actual manifest/immutable-package/preparation gates prevents consumption. The implementation visibly invokes these gates, so I found no concrete bypass, but negative boundary tests should explicitly assert each rejection prevents `consume_live`.
- The subprocess timeout test mocks `subprocess.run`. It verifies the supplied timeout and retry count, not actual child termination/reaping under DNS or body stalls. Standard-library `subprocess.run(timeout=...)` provides a reasonable bounded-child design; a synthetic sleeping child test would exercise this boundary without network access.

## Reviewed behavior and limits

The reviewed retry loop restarts owner, PR, exact comment, complete revocation pagination, and final exact comment reads. Partial evidence is local to each observation. Authority/HEAD/comment/revocation facts are checked before issuing the next read, preventing the previously observed masking pattern. Attempt limit and waits are three observations including initial, then 2 and 5 seconds. Request inputs are deep copied; launch/binding inputs are copied before shared preparation. The loop contains no consumption, write, supervisor, or game retry. Existing fresh postclaim and worker authorization remain present.

Focused verification executed with synthetic fixtures only:

```
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=docs/card-game/tools python -m unittest test_proxy_population_approval_read_retry test_proxy_population_external_approval test_proxy_population_launch_authorization -q
Ran 27 tests in 19.727s — OK
```

The supervisor fixture verifies one worker dispatch, a stopped first row, and 399 unexecuted rows after read recovery. No production worker or game was run.

No critical authorization bypass found. Findings 1–3 are important correctness/audit-contract issues. I did not judge current execution readiness: the changed preflight selector intentionally points to a future report, and final source full-suite evidence and fresh preflight remain pending. The diff reviewed does not modify old approval `6159857990` or historical run artifacts. Durable recovery B remains outside scope. No live GitHub availability or hard realtime guarantee under OS process-creation/scheduling failure was assessed.

---

# Review resolution

Independent reviewer: /root/retry_review; fresh context, no repository edits. Review snapshot was the working diff against 84789832. Author fixes below were not independently re-reviewed.

- Important 1, historical redirect compatibility: preserved `_NoRedirect` alias; real historical reader with synthetic opener failed RED then passed GREEN.
- Important 2, audit loss after later gates: publication, launch and generation errors now retain read_audit even after successful live verification. Remote/final-source failure regressions failed RED then passed GREEN.
- Important 3, persistence/consumption failure: consumption exceptions retain claim-time audit with original exception class; wrapper failure retains preceding prevalidation too. Three reproduction tests failed RED then passed GREEN. No failed mutation is retried or undone.
- Known HTTP status loss was treated as a contract defect (user requirement7), not cosmetic: malformed JSON200 and redirect302 regression RED→GREEN, status carried independently of semantic failure.
- Added explicit prevalidation preparation/structure/lock/package/edition rejection checks and a real synthetic sleeping-reader termination check. These were coverage additions for existing behavior.
- Final focused regression: 49 tests, exit0. Separate supervisor/attempt regression:7 tests, exit0. Full edition suite/connected/preflight still required at this checkpoint.

No unresolved findings. No B recovery, approval reuse, new request or production run. Limits: subprocess scheduling overhead is not a hard realtime guarantee; no late evidence is accepted. Persistent operator logs remain part of the existing operator trust model. The new prevalidation/consume entry returns both observations and failures retain them, but does not itself publish evidence or launch a supervisor.

Final unchanged-source full suite: 929 tests, exit 0; non-production connected fixture completed with 328 events; design exit 0. Python fingerprints match before/after.
