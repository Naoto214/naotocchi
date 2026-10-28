# Independent review: fixed-400 checkpoint/resume runtime diff (f1025fdd..2bfbe209)

## Scope

Runtime diff `review35-runtime.diff` (889 lines; tests excluded), 11 files under `docs/card-game/tools/`:

- proxy_population_approval_publication.py
- proxy_population_attempt_runner.py
- proxy_population_checkpoint_ledger.py (new)
- proxy_population_checkpoint_operator.py (new)
- proxy_population_checkpoint_supervisor.py (new)
- proxy_population_current_preflight.py
- proxy_population_external_approval.py
- proxy_population_incarnation_runtime.py
- proxy_population_launch_authorization.py
- proxy_population_results_store.py (new)
- proxy_population_start_obligations.py

## Method

- Read the whole diff and the surrounding code in the worktree: external_approval (`_validate_request`, `_observation`, `_verify_live_at_head`, `consume_live`), approval_publication, launch_authorization, attempt_runner, batch_supervisor (the previous supervisor, for comparison), execution_edition, remote_publication, connected_entry, current_preflight, incarnation lifecycle, plus the design doc and the new tests.
- Ran read-only checks with the pinned interpreter (`py/inst/python/bin/python3.12`, 3.12.14, the same `python_version` recorded in the 33cb2f85 binding manifest), from a scratch directory with `-B -I`. Nothing was written into the worktree.
  - Ran the real `_Worker` class from the supervisor with a trivial child script: `finish()` raises `ValueError: flush of closed file` (M1).
  - Ran the ledger on the real completed row `proxy-population-400-final-run-20261023/attempt-0001`. `play_summary` works, and `tools_sha256` computed from the 33cb2f85 tools blobs equals the record's `connected_tools_sha256`, so the ledger matches real records.
  - Compared the old and new `active_cards` on a non-canonical card (m10).
  - Checked GitHub API limits (15000/h through the proxy, so parallel live checks are not rate-limited) and gitignore (row files are not ignored).
- Frozen-file check: every changed path was looked up in `docs/card-game/data/proxy-population-runtime-468/sources.json`, and no hits were found. No frozen file was edited.
- v1/v2 behaviour: `pre_claim_head` returns the publication for v1/v2, and the chain check runs only when the parent is not the publication. The `_read_committed_claim`, `_verify_live_at_head` and `prevalidate_launch` checks are unchanged for v1/v2. A v3 request has its own schema and digest, so old comments cannot approve it. The old supervisor cannot use a v3 approval, and the checkpoint supervisor cannot use a v2 approval. No v1/v2 behaviour change was found.

## Findings

### M1 (material): the real worker wrapper always fails on the production Python, so no row can ever be accepted or checkpointed
- Location: `proxy_population_checkpoint_supervisor.py:114-117` (`_Worker.__init__` / `_Worker.finish`), reached from `finish()` at line 181.
- `_Worker.__init__` writes the request and then calls `self.process.stdin.close()`. `finish()` then calls `self.process.communicate()`. On CPython 3.12 (both 3.12.3 and 3.12.14 tested), `Popen._communicate` calls `self.stdin.flush()` on the already-closed pipe. It raises `ValueError: flush of closed file`, which 3.12 does not suppress (3.13 does).
- Failure scenario: in a real v3 launch, the first worker finishes its match (about 22 minutes) and the supervisor calls `finish(1)`. `worker.finish()` raises, the `except BaseException` handler marks the row `record_unverified` with reason "ValueError: flush of closed file" and sets stop. Every other running worker fails the same way.
  - The run ends `stopped` with 0 rows persisted, and the owner approval and claim have already been consumed.
  - No results branch is ever pushed, so `prepare_resume` cannot even build a resume (see m8).
  - The new tests replace `_launch` with `FakeWorker`, so the real `_Worker` is never exercised.
- Reproduced with the supervisor's own `_Worker` and a trivial child: `finish raised ValueError flush of closed file`.
- Fail-closed, but the real launch can never succeed. Possible fix: pass the request through `communicate(input=...)`, or drain stdout/stderr with threads and do not pre-close stdin. Add a test that uses the real `_Worker`.

### m1 (minor): the claim chain check is skipped when `previous_claim` is the publication, and an older claim is accepted, so a rewound PR branch passes for generation 2 and later
- Location: `proxy_population_approval_publication.py:55`, `proxy_population_external_approval.py:116`.
- `_resume_target` ties `previous_claim` to `original_claim` only for generation 1. For generation 2 and later, `previous_claim` can be any shaped dict. If it is `{commit: P, tree: P^{tree}}`, then `pre_claim_head` returns P, `parent == publication`, and `_require_claim_chain` never runs. `previous_claim` may also be C0 even after C1 exists.
- Failure scenario:
  1. After generation 1 (C1 on the PR branch), the operator force-pushes the PR branch back to P (or to C0).
  2. The operator builds a generation-2 request with `previous_claim` set to P (or C0).
  3. Once the owner approves that digest, the claim C2 is a child of P (or C0), and all audits and per-match worker rechecks pass.
  4. `resume_plan` still reuses the rows, because it binds `original_claim` (C0) only through `attempt_id` and the entries.
- The docstring promise that the PR branch "only ever moves forward … never rewritten" is not enforced. A fresh owner approval is still needed, and the general rewind-and-reconsume exposure already existed for v2. So this is not an unauthorized run, and it is rated minor.
- Possible fix: require `previous_claim.commit != publication` for generation 1 and later, and always run the chain check. Optionally bind the generation number to the chain length.

### m2 (minor): chain commits are only shape-checked
- Location: `proxy_population_approval_publication.py:40`.
- Each intermediate commit only has to add one path that starts with `CLAIM_DIRECTORY`. The path can be any name, a subdirectory, a symlink or a gitlink, with any content. The check does not require a canonical `<comment_id>.json` consumption record for the matching request, although the docstring says "canonical claim file".
- Failure scenario: a non-claim commit, for example one adding `…/proxy-population-approval-consumption/notes/x.md`, sits between C0 and the previous claim, and generation n is accepted.
- Impact is limited: the generation-n comment is still verified live, and edition verification rejects any added `.py`.

### m3 (minor): the saved per-row `start.json` is never verified, and row provenance is not re-derived
- Location: `proxy_population_results_store.py:71,101`; `proxy_population_checkpoint_ledger.py:52-76`.
- `start.json` (the worker's launch-authorization evidence) is copied and required but never parsed, hashed into the checkpoint, or checked. The checkpoint's `original_claim` and `edition` fields are copied from the current descriptor, not proven from the row.
- Resume re-verifies only that the receipt, record and checkpoint are consistent with each other. The record is not replayed, and the receipt's `admission` is not re-checked.
- Failure scenario: someone with push access to `fixed400-results/<id>` adds a row with arbitrary `start.json` bytes and a fabricated but self-consistent receipt/record (same bundle hash and tools hash). `prepare_resume` and `resume_plan` accept it as `reused_verified_checkpoint`.
- This is within the design's stated "hash re-verification" scope, but it is weaker than the doc's "承認 attempt への束縛" claim.

### m4 (minor): a failure to write the result control file does not stop dispatch, and an interrupt there is swallowed
- Location: `proxy_population_checkpoint_supervisor.py:171-175`.
- On the success path (after `append_row` has pushed), `record_result` catches any exception, including `KeyboardInterrupt`. It marks the row `record_unverified` but does not set `state['stop']`, so the loop keeps dispatching the rest of the schedule. The interrupt is re-raised only after the run ends.
- The old supervisor stopped at the first such row.
- The row is already on the results branch, but the report counts it in `persisted_rows` and not in `completed_rows`, so the status is `stopped` even if everything else completes.

### m5 (minor): a later row's dispatch failure discards earlier completed rows, and an interrupt inside `finish()` does not terminate the other workers
- Location: `proxy_population_checkpoint_supervisor.py:193-196,214-216`.
- If `dispatch(k)` fails (control-file write, edition check, Popen or BrokenPipe), stop is set, and the still-running lower rows i<k that then complete are marked `completed_not_saved`. They are not checkpointed even though they precede k. The comment assumes "an earlier row stopped".
- A `KeyboardInterrupt` caught inside `finish()` (for example during `communicate`, `_verify_row` or `git push`) sets stop but leaves sibling workers running until they finish naturally (about 20 minutes each).
- Neither path counts anything unverified. The cost is lost work and a delayed stop.

### m6 (minor): undrained pipes can hang the supervisor
- Location: `proxy_population_checkpoint_supervisor.py:221` (with `_Worker`).
- Worker stdout/stderr are `PIPE`s that are read only in `finish()`, and only the lowest running worker is polled. If the lowest worker writes more than the pipe buffer (64 KiB) to stderr, for example a long traceback with approval read-audit or audit-error lists, it blocks forever. `poll()` never returns, and the supervisor hangs with no stop record.
- The old supervisor used `subprocess.run`, which drains the pipes. A historical failed row already had 11.8 KiB of stderr.
- This still applies after M1 is fixed.

### m7 (minor): `unsaved_completed_rows` undercounts
- Location: `proxy_population_checkpoint_supervisor.py:235`.
- It counts only `persist_failed` and omits `completed_not_saved`.
- Example: parallelism 4, row 1 incomplete, rows 2-4 completed. The report says 0 unsaved completed rows.

### m8 (minor): an interruption before the first pushed row cannot be resumed through the contract API
- Location: `proxy_population_checkpoint_supervisor.py:83`; `_resume_target` (results_ref is required for generation 1 and later).
- The results branch is created on the remote only by the first successful `append_row`. If the container is lost during row 1, or row 1 fails (including M1), `prepare_resume` raises "results branch absent; nothing to resume".
- A new generation 0 needs the PR head to equal P, which is impossible after C0 without a rewind. The documented incident shape (a loss early in the run) is therefore not covered unless the operator manually pushes C0 as the results branch.
- In addition, prevalidate/consume do not re-verify the results ref and ledger before consuming the comment. If the results branch moved after the request was built, the approval is burned and the supervisor stops.

### m9 (minor): same-container resume and workspace placement hazards
- Location: `proxy_population_results_store.py:49,61`.
- `workspace/results-<attempt>` must not exist, so a same-container resume with the same `store_workspace` fails after consumption.
- `git checkout -B <branch>` while the old worktree still has that branch checked out works on git 2.43 (tested) but is refused on git 2.44 and later.
- If `store_workspace` is placed under `docs/card-game/`, the results worktree's `tools/*.py` make `edition.capture`'s `rglob('*.py')` differ, so every edition check fails.
- None of these constraints is enforced or documented.

### m10 (minor): `active_cards` is not output-identical for non-canonical single-generation cards
- Location: `proxy_population_incarnation_runtime.py:37`.
- The old code called `life.digest` on every instance, so a single-generation card with a non-canonical value (for example a float) raised `ValueError('unsupported JSON type')`. The new code returns `{'A-001':'A-001#1'}`. Reproduced.
- This is unreachable for canonical, manifest-derived states, where `canonical(record)` would fail anyway. For multi-generation groups, only the evaluation order of the two digests changes.

### m11 (minor): the `catalog()` cache changes error behaviour under mid-process source mutation
- Location: `proxy_population_start_obligations.py:27`.
- On a cache hit, the fixture hash and the per-section `source_section` checks are skipped. If `data/proxy-fixtures-107/...json` or a referenced rules `.md` changes after the first call in a worker, the old code raised '107 source changed' or 'start source text changed'. The new code returns the cached catalog.
- Within a single process, the results are identical when files are unchanged. The edition verify before and after each match covers a persistent change, but not a transient one.
- The cache is process-global but keyed to the pinned `CATALOG_SHA`, and workers are fresh processes, so it is not shared across editions in production.

## Checked and not found

- No push uses force or amend: `push` uses a plain `HEAD:refs/heads/...` refspec, and `checkout -B` is local only.
- A push failure is never treated as saved. A push that succeeds but reports failure is marked `persist_failed`, and the row is legitimately reused later because its bytes re-verify.
- Rows are checkpointed only in schedule order (only the lowest running worker is finished, and stop blocks later saves), so saved rows always form a prefix.
- Tampered, missing, duplicate or out-of-order rows are rejected by the hash chain, the index-to-match binding and the four-file requirement. A deleted trailing row is simply re-run.
- A different edition, manifest, seed or order is rejected through the entry fields recomputed from the descriptor and the bundle.
- An edited, revoked, wrong-PR or wrong-author comment is rejected as before. A consumed comment is rejected as before (subject to the pre-existing rewind exposure).
- The per-match worker recheck now also binds `resume` through the saved supervisor `start.json`.
- No frozen-file edits.

UNRESOLVED MATERIAL FINDINGS: 1
