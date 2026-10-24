# Independent review: fixed-400 checkpoint/resume fixes (2bfbe209..efa46a3a)

Reviewed commit: `efa46a3acce1ba71e5d8c568a0c05a19da65cffb`. Base commit: `2bfbe209215a142b96dea1038adade043cb3039a`.

## Files covered

The runtime diff (`review36-runtime.diff`, 521 lines, tests excluded) changes 7 files under `docs/card-game/tools/`:

- proxy_population_approval_publication.py
- proxy_population_checkpoint_ledger.py
- proxy_population_checkpoint_operator.py
- proxy_population_checkpoint_supervisor.py
- proxy_population_external_approval.py
- proxy_population_results_store.py
- proxy_population_start_obligations.py

I also read the surrounding code that these files call:
- proxy_population_attempt_runner.py: the worker `start.json` shape, which the ledger now checks.
- proxy_population_batch_supervisor.py: `CHILD`.
- proxy_population_launch_authorization.py: `audit_launch`, `prevalidate_launch`, `consume_launch_after_prevalidation`.
- proxy_population_external_approval.py: `pre_claim_head`, `_observation`, `_verify_live_at_head`, `consume_live`.
- proxy_continuation_rules.py: `source_section`.

I also read the four named test files, the 2bfbe209 review, the disposition, PREFLIGHT-STOP-2bfbe209.md and plan §8–§9.

## Method

All commands used the production interpreter (`py/inst/python/bin/python3.12`, 3.12.14) with `-B`. Probe scripts and temporary files were written only under `scratchpad/review36/probe` and `scratchpad/tmp36`. `git status --porcelain` on the worktree was empty after every run.

- **Worker I/O.** I ran the real `_Worker` with substituted trivial children (`probe/worker_probe.py`):
  - A 5 MiB request delivered, with 1 MiB stdout and 3 MiB stderr drained: rc 0, all bytes received, no deadlock.
  - A child that exits without reading stdin: rc 5. The BrokenPipe is absorbed.
  - A child that SIGKILLs itself: rc -9.
  - `terminate()` on a sleeping child: killed in about 0 s, thread joined.
  - The original M1 error (`flush of closed file`) is gone.
- **Pipe error path.** I forced `Popen.communicate` to raise inside the worker thread (`probe/worker_err.py`). See N1.
- **Catalog cache.** I timed the new `catalog()`: 1.8 ms per cache hit. It reads and hashes the 11 KB catalog, the 13.5 KB fixture and 12 rules files (238 KB) on every call. The 2bfbe209 profile shows about 2,680 calls per 78 steps, so this costs roughly 10–30 s per match. That is informational and not a defect.
- **v3 with no results reference.** A generation-1 request with `results_ref=None` and 0 rows validates and renders approval text. With rows > 0 it is refused.
- **Tests.** `test_proxy_population_checkpoint_resume`, `test_proxy_population_resume_claim_chain` and `test_proxy_population_active_cards_equivalence` ran 41 tests, all OK (724 s). `test_proxy_population_checkpoint_real_worker` ran 2 tests, both OK (1836 s). They include a real-engine row, real child processes, two resumes and a 2 MiB stderr. The log is at `probe/real_worker_test.log`.
- **Frozen files.** `grep -c '"tools/<file>"' docs/card-game/data/proxy-population-runtime-468/sources.json` prints 0 for all 11 changed tools files (7 runtime and 4 test). No frozen file was edited.
- **v1/v2 gate.**
  - `_read_committed_claim` now runs the chain only for v3 requests with `resume_generation > 0`. Before, it ran when `parent != publication`, and for v1/v2 the parent is always the publication (`pre_claim_head`). So v1/v2 behaviour is unchanged, and v3 generation 0 is also unchanged.
  - The only change in `external_approval` is inside `_resume_target`, which only v3 reaches.
  - Comment identity, author, PR, head, edit, revocation and consumption checks (`_observation`, `_check_comment`, `consume_live` O_EXCL) are untouched.
  - The pre-existing rewind-and-reconsume exposure noted in the 2bfbe209 review is unchanged.

## Earlier findings (2bfbe209 review: M1 + m1..m11 = disposition #1..#12)

| # | Earlier | Verdict | Note |
|---|---|---|---|
| 1 | M1 worker pipe | **resolved** | `communicate(input=...)` runs in one thread per worker. On 3.12.14 the request is delivered, both pipes are drained, and the returncode is correct, including negative values for signals. `finish()` raises on a recorded pipe error. Residual: N1, a pipe error before `wait()` hangs instead of failing closed (minor). |
| 2 | m1 rewound PR / chain skipped | **resolved** | The chain is always required for v3 generation ≥ 1. Its length must equal the generation, its first commit must be `original_claim` and its last must be `previous_claim`. A `previous_claim` of P or C0 at generation 2 is refused. Redoing generation n on a rewound C(n-1) is the pre-existing reconsume exposure (see Method). |
| 3 | m2 chain commits shape-only | **resolved** | Each chain commit must add one regular 100644 file holding a canonical consumption record, whose request is v3 of the same attempt and publication at that position. Residual gaps are minor (N4). |
| 4 | m3 start.json unbound / no replay | **resolved (binding) / accepted (replay)** | `start_sha256` and `generation_claim` are in the entry. On resume the ledger checks the start schema, match, manifest, edition, 512-step limit, bound approval commit and attempt. Not replaying saved records is a stated design choice. The receipt carries the worker's independent reconstruction verdict. The ancestry check is broader than the claim chain (N3, minor). |
| 5 | m4 result-file failure | **resolved** | A failed write of a result file calls `halt(index)`. An interrupt sets `interruption` and is re-raised. The row status is no longer overwritten, so a saved row is still counted. |
| 6 | m5 dispatch failure / interrupt in finish | **resolved** | `stop_index` lets lower running rows still save in order. Because only the lowest running row is ever finished, saved rows remain a contiguous prefix. `finish()`/`dispatch()` catch only `Exception`, so interrupts reach the outer handler, which kills every row in `running`. Residual: N2 (minor). |
| 7 | m6 undrained pipes | **resolved** | Pipes are drained concurrently (probe: 3 MiB stderr, 1 MiB stdout, no hang). |
| 8 | m7 unsaved count | **resolved** | Counts both `persist_failed` and `completed_not_saved`. |
| 9 | m8 resume before first row / pre-consumption results check | **resolved** | A generation ≥ 1 may carry `results_ref=None` only with 0 rows. `resume_plan` and `Store.prepare` both require that the branch is absent. `checkpoint_operator.prevalidate/consume` call `verify_resume_reference` before consuming. Residual: the claim chain itself is not checked before consumption (N5, minor). |
| 10 | m9 workspace hazards | **resolved** | One workspace per generation, `results-<attempt>-gNNN`. Worktrees are detached only (no `checkout -b/-B`). A workspace inside the repository is refused. The refusal happens in `Store.__init__`, before the destination is created, so `run` can be repeated with a corrected workspace on the same claim. |
| 11 | m10 active_cards | **accepted** | No runtime change. The equivalence test pins identical output, and a non-canonical value is unreachable from manifest-derived canonical states. The justification holds. |
| 12 | m11 catalog cache | **resolved** | The cache key is the catalog hash plus the fixture hash plus the hash of each referenced rules file. That covers every byte `catalog()` checks (`source_section` reads `rules.ROOT/<name>`). The cost is in Method; it is not a defect. |

## New findings

### N1 (minor): a worker pipe error before `wait()` hangs the supervisor instead of failing closed
- Location: `proxy_population_checkpoint_supervisor.py:140-145` (`_Worker.run` and `poll`), with the loop at `:258-263`.
- `poll()` returns `self.process.returncode` once the thread has died. If `communicate()` raises before its internal `wait()`, the thread stores `self.error` but nobody reaps the child, so `returncode` stays `None`. In the probe the child was still blocked on its stdin pipe, and `poll()` returned `None` forever. `finish()` is never called, so the `worker pipe failed` error is never raised.
- Failure scenario: a selector or OSError in `_communicate` (not BrokenPipe, which is absorbed) on the lowest row leaves the supervisor sleeping in `POLL_SECONDS` forever. No stop record is written until an operator interrupt.
- Reproduced with `Popen.communicate` patched to raise: `thread alive False, error set, poll None` (also checked after the child could have exited).
- Practically unreachable on Linux. The result is a hang, not a wrong result. The disposition's "fails closed on any pipe error" is therefore not exact. Fix: make `poll()` return a non-`None` sentinel when `self.error` is set (or call `self.process.poll()` there).

### N2 (minor): an interrupt during verification of the row being finished leaves that row unrecorded; narrow worker-leak window in dispatch
- Location: `proxy_population_checkpoint_supervisor.py:218-229` and `:253`.
- `finish()` pops the row from `running` before its first `try`, which now catches only `Exception`. A KeyboardInterrupt during `edition.verify` or `_verify_row` therefore leaves that row as `execution_status='started'`, with no `result-NNNN.json`. The outer handler only walks `running`. That worker has already exited, so nothing leaks and nothing is counted. Only the diagnostic record is missing.
- In `dispatch`, an interrupt between `_launch(...)` returning and `running[index]=control` leaves a live child that no handler terminates. The window is a single bytecode gap.
- Nothing is counted or saved wrongly.

### N3 (minor): the saved-row claim check accepts any ancestor commit, not only chain members, and does not bind the comment id or the generation
- Location: `proxy_population_checkpoint_supervisor.py:84-85`; `proxy_population_checkpoint_ledger.py:77-85`.
- `merge-base --is-ancestor <row claim> <current claim>` also accepts the publication P and the whole pre-publication history. `_start_bindings` checks only `consumption.binding.commit`. The checks do not cover `generation_claim.comment_id`, and they do not require that `entry.resume_generation` matches that claim's position in the chain.
- Failure scenario: someone with push access to `fixed400-results/<id>` writes a self-consistent row whose `generation_claim.commit` and `start.json` binding name P. It passes resume verification. This is within the accepted "no replay / hash re-verification" scope (#4). A genuine worker cannot produce such a start record.
- Fix: compare against the commit list returned by `_require_claim_chain` plus the current claim, and check the comment id.

### N4 (minor): chain record checks are looser than `_read_committed_claim`'s own claim checks
- Location: `proxy_population_approval_publication.py:43-57`.
- The claim file name is checked with `isdigit()` and `int()`, so `017.json` and non-ASCII digit names are accepted. It is not required to equal `str(comment_id)+'.json'`.
- The record's key set is not checked as exact.
- The embedded saved approval is not checked with `_check_saved_approval` (request digest, scope, comment body).
- Each record's `previous_claim` is not linked to the preceding chain commit.
- Failure scenario: a hand-made chain commit with a fabricated record (schema and request right, `approval={'comment_id':N}`) passes the structural check for a later generation. Impact is limited: the later generation's own comment is live-verified and names the exact `previous_claim`, and no row could have run under a fabricated claim, because workers live-verify their own claim.

### N5 (minor): claim-chain validity is not checked before consumption, so a mis-numbered generation burns an owner approval
- Location: `proxy_population_launch_authorization.py:85-101` (unchanged), `proxy_population_checkpoint_operator.py:56-68`.
- The new strict `len(chain)==resume_generation` rule and the per-record generation check run only inside `_read_committed_claim`, which runs after the claim commit exists. `prevalidate` and `consume` (including the new `verify_resume_reference`) do not run `_require_claim_chain(git, request, previous_claim.commit)`.
- Failure scenario: an operator passes the wrong `generation` to `next_generation_request`. One example: generation 2 after a generation-1 consumption that was never published, with `previous_claim`=C0. The owner approves, `consume` writes the claim, and `run` then fails with "chain length differs from the generation". Fail-closed, but the approval is spent and a new one is needed.
- Fix: run the chain check in `prevalidate`.

## Checked and not found
- Rows are counted only when `completed` and `persisted is True`. Reused rows come only from `verify_ledger`.
- `verify_ledger` now also requires a contiguous prefix.
- No row is saved at or after `stop_index`. No dispatch happens after any stop.
- The loop exits once nothing is running.
- All running workers are killed and joined on interrupt.
- The production worker's `start.json` (attempt_runner:47-53, with `launch_authorization=audit_launch(...)` and `consumption=audit_committed_consumption(...)` whose `binding.commit` is the claim) satisfies `_start_bindings`, so a real launch can checkpoint rows.
- A results branch that exists while the approval names none is refused, both before consumption and at run time.
- Pushes remain plain fast-forward pushes to `HEAD:refs/heads/<branch>` from a detached worktree.
- No new path accepts a different author, text, PR, head, an edited, revoked or consumed comment, or a force-push.

UNRESOLVED MATERIAL FINDINGS: 0


---

# fixed400 checkpoint launch preflight — review resolution (tested commit efa46a3a)

Independent review of the runtime diff 2bfbe209..efa46a3a (7 files, tests excluded): `UNRESOLVED MATERIAL FINDINGS: 0`. Earlier review 2bfbe209: 10 resolved, #4 resolved for the start.json binding with the no-replay part accepted, #11 accepted (justification upheld). The reviewer ran the real `_Worker` on 3.12.14 (5 MiB stdin, 1 MiB stdout + 3 MiB stderr drained, exit codes 0/5/−9, terminate joins) and the resume, claim-chain, active-cards and real-worker tests on the production interpreter.

Five new minor findings are accepted without a code change. None can let a wrong result or an unauthorized run pass; changing code now would require another tested commit and full preflight. They remain recorded for later regression work.

- N1 `checkpoint_supervisor.py:144` — if `communicate()` raised before its internal wait, `poll()` would report "running" forever: a hang, not a wrong result. Practically unreachable on Linux; the run is watched by the operator's monitor, and a hung supervisor is a stop under the contract (resume needs a new approval).
- N2 `checkpoint_supervisor.py:218,253` — an interrupt during the finishing row's verification leaves that row "started" with no result file; nothing is counted as completed or saved. A one-statement window in dispatch could leave one child untracked after an interrupt; the run is stopped either way and the child's output is not accepted.
- N3 `checkpoint_supervisor.py:84` / ledger — the saved-row claim check accepts any ancestor of the current claim, not only chain members, and does not tie the row's comment id/generation to the chain. Exploiting it needs push access to the results branch (the same trust model as the PR branch); saved rows are still bound to this attempt's edition, manifest, order, receipt and record bytes.
- N4 `approval_publication.py:43` — chain records are checked more loosely than the live claim (file-name normal form, exact key set, embedded approval not re-checked, records not linked to the previous claim). Every chain record must still be a canonical consumption record of this attempt and publication at its generation, with one claim per generation, and every new claim still needs the exact live owner comment.
- N5 `checkpoint_operator.py:56` — a mis-numbered generation fails only when the claim is audited, after consumption, which would spend the owner's approval. Operational mitigation: generation n is the number of claims already on the PR branch after the publication (the runbook derives it), and the request shows it before the owner approves. Generation 0 (the next launch) is unaffected by N3–N5.

Informational: `catalog()` now hashes its inputs on every call (~1.8 ms; ~10–30 s per match).
