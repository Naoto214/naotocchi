# Independent narrow re-review of Important 1–3

Reviewed repository HEAD `158c9784197e6786d2ff85929c3f99187a340ffb`, with baseline `84789832f7c85c4a0b146a854996c4c6163b61e0`, against `bounded-approval-873e8cd-review.md` and `bounded-approval-873e8cd-review-resolution.md`. Review was limited to the three important fixes and their relevant tests/callers. No repository edits.

## Findings

No unresolved Important 1–3 findings found in this re-review.

1. **Redirect-helper compatibility — resolved.** `proxy_population_external_approval.py` preserves `_NoRedirect=transport._NoRedirect`. The existing `execution_binding.read_remote_commit` can instantiate it. An independent synthetic opener probe exercised the actual historical reader, returned fixture JSON, confirmed a single opener construction, and confirmed its handler rejects a redirect with `ValueError`.

2. **Read-audit loss after later gate failure — resolved.** Publication now appends the full live observation diagnostic on failure, including after successful verification. Launch and generation append it at their enclosing failure boundaries. Their downstream callers serialize these `errors`, so the audit reaches their terminal exception text. Independent offline probes first produced a real verifier proof containing a timeout followed by a successful restarted observation. Exact `failure_text(proof)` was then found in terminal errors for saved/current comment mismatch, fresh-publication rejection, final launch-edition rejection, missing saved-supervisor record, and final generation-edition rejection. This checks the entire recovered audit, not merely presence of a `read_audit` key.

3. **Prevalidation/consumption persistence failure — resolved.** `consume_live` wraps persistence `ValueError`/`OSError` failures with claim-time diagnostics; `consume_launch_after_prevalidation` adds the complete earlier prevalidation when consumption fails. Independent temporary-directory probes injected exclusive-open, write, and fsync failures. Each retained both distinct observation markers, invoked the claim verifier once, and raised rather than accepting consumption. The write/fsync cases retained their claim files; subsequent consumption failed with `FileExistsError`, confirming no deletion, rollback, or mutation retry. A separate second-verifier failure probe retained prevalidation and made one consumption call. Failed prevalidation serializes the complete checked result before any consumption.

Relevant source boundaries: `external_approval.py:135–137,262–281`; `approval_publication.py:47–63`; `launch_authorization.py:49–65,98–109`; `generation_authorization.py:29–39`. The committed regression tests cover the compatibility helper, later publication/generation gates, prevalidation retention, local preclaim rejection, and exclusive consumption.

## Verification and limits

The independent offline probes above all passed. Their transport and remote calls were explicitly replaced with synthetic fixtures, and persistence used temporary directories. No production approval was consumed or reused, no production worker/game was launched, and no live API result was used as evidence. Repository status remained clean after inspection.

A focused unittest command was initiated, but obtaining its result via process polling was automatically rejected because the reviewer identified possible GitHub access conflicting with the no-live constraint. That operation was not retried or pursued; its completion and outcome are not claimed here. The successful offline probes are the execution evidence for this re-review. No broad suite, live availability check, fresh preflight, or full execution-readiness audit was performed.

## Readiness conclusion

Important 1–3 no longer block preparing the fixed 400-input rebinding. This is a narrow code-fix review, not execution authorization: exact-source validation, current preflight, immutable binding checks, and fresh approval/publication checks remain the responsibility of their existing gates. This report does not authorize reusing a consumed approval or starting a run.
