# Review resolution

Independent reviewer: /root/retry_review; fresh context, no repository edits. Review snapshot was the working diff against 84789832. Author fixes below were not independently re-reviewed.

- Important 1, historical redirect compatibility: preserved `_NoRedirect` alias; real historical reader with synthetic opener failed RED then passed GREEN.
- Important 2, audit loss after later gates: publication, launch and generation errors now retain read_audit even after successful live verification. Remote/final-source failure regressions failed RED then passed GREEN.
- Important 3, persistence/consumption failure: consumption exceptions retain claim-time audit with original exception class; wrapper failure retains preceding prevalidation too. Three reproduction tests failed RED then passed GREEN. No failed mutation is retried or undone.
- Known HTTP status loss was treated as a contract defect (user requirement7), not cosmetic: malformed JSON200 and redirect302 regression RED→GREEN, status carried independently of semantic failure.
- Added explicit prevalidation preparation/structure/lock/package/edition rejection checks and a real synthetic sleeping-reader termination check. These were coverage additions for existing behavior.
- Final focused regression: 49 tests, exit0. Separate supervisor/attempt regression:7 tests, exit0. Full edition suite/connected/preflight still required at this checkpoint.

No unresolved findings. No B recovery, approval reuse, new request or production run. Limits: subprocess scheduling overhead is not a hard realtime guarantee; no late evidence is accepted. Persistent operator logs remain part of the existing operator trust model. The new prevalidation/consume entry returns both observations and failures retain them, but does not itself publish evidence or launch a supervisor.
