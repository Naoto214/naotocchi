# Bounded approval reads Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline and a fresh independent final reviewer. Follow RED → GREEN.

**Goal:** Implement the approved A contract for future editions without restarting a stopped supervisor or reviving a consumed approval.

**Architecture:** Each live approval verification owns one immutable request and a 120-second monotonic budget. Only allowlisted GET transient transport failures can restart its entire observation, at most three observations with 2/5-second delays. A read-only subprocess bounds DNS/TLS/body stalls; this is not a game worker. Pre-consumption launch checks share the existing input gates, followed by fresh claim-time and dispatch-time authorization.

**Tech Stack:** Python standard library, unittest, immutable Git evidence.

**Spec:** User approval dated 2026-10-14, reproduced in constraints below.

## Global Constraints

Only GET 502/503/504 or communication timeout; maximum 3 observations including initial, 120 seconds total, delays 2 and 5 seconds. Discard all failed evidence. Never retry mismatched authority/HEAD/hash/text, edits/revocation, auth failure, malformed JSON or redirect. Freeze request, edition, binding, manifest, schedule and destination. Never retry writes/consumption/supervisor/worker/game. Save endpoint, observation number, UTC times, HTTP status and termination reason. Preserve historical evidence and approval 6159857990; no production run or new request here. B durable recovery is excluded.

## Review Focus

- Slow DNS or trickling bodies must not escape the total deadline.
- An earlier identity mismatch must not be hidden by a later transient failure.
- Failed approval diagnostics must survive outer exception/log serialization.
- Pre-consumption checks cannot replace fresh post-publication authorization.
- A retry must not leak a failed page or mutate frozen launch inputs.

## Task 1: Bounded complete observations

Files: tools/proxy_population_external_approval.py, new tools/proxy_population_approval_transport.py, tools/test_proxy_population_approval_read_retry.py, existing external approval transport test.

Interface: verify_live and _verify_live_at_head retain signatures and proof flags; add read_audit. Transport reads have explicit deadline, fixed allowlist, no retry. Failure diagnostics are canonical structured exception text retained by outer gates.

- [x] Write recovery, exhaustion, deadline, fail-closed and no-mixing tests; run and save RED.
- [x] Implement retry around complete observation, validate each authority fact immediately, capture attempt-bound evidence and diagnostics.
- [x] Verify GET transport hard bound, redirect/JSON failures, and all dedicated tests GREEN.

## Task 2: Pre-consumption preparation and side-effect invariants

Files: tools/proxy_population_launch_authorization.py, tools/test_proxy_population_approval_read_retry.py.

Interface: prevalidate_launch uses shared existing input preparation, live approval at approved publication, exact remote publication and final local edition check. consume_launch_after_prevalidation calls it and then consume_live once. It does not publish or launch anything. Existing supervisor and worker keep their fresh committed-claim gates.

- [x] Add RED tests for failed prevalidation producing zero consumption/workers, recovered read producing one consumption, and unchanged 400-row schedule.
- [x] Implement shared preparation and explicit prevalidation entry; preserve existing request generation and guards.
- [x] Run related external approval/publication/authorization/supervisor/attempt regressions.

## Task 3: Reviewed edition and evidence

- [x] Independent review of complete diff; address material findings with RED → GREEN.
- [ ] Publish tested source checkpoint with new preflight selector; no old evidence edits.
- [ ] Full population/mandatory suite, connected non-production fixture, design validation and preservation hashes on unchanged source.
- [ ] Publish append-only evidence, capture new edition and run actual preflight; verify remote HEAD/tree, clean local tree and Draft/open/unmerged PR.

Publication procedure remains evidence → edition → binding publication → external request → owner approval → claim-only commit → one supervisor invocation. A transient read retry belongs solely to its current verifier invocation; an exited supervisor remains terminal.

## Evidence and operator procedure

For a future approved edition, use `prevalidate_launch` for read-only inspection, or `consume_launch_after_prevalidation` for the explicit one-shot prevalidation/consumption stage. The latter returns `{prevalidation, consumption}`; persist the complete return value in operator evidence, while publishing only the existing canonical consumption record in its claim-only child commit. The prevalidation proof is diagnostic and never authorizes a later dispatch. The existing supervisor and each worker still authenticate the exact published claim and current owner approval.

Capture stdout/stderr and the terminal exception in exclusive operator evidence before invoking a stage, and preserve its return value or failure log. Each live approval proof contains `read_audit`; failures serialize that audit into enclosing errors so existing prestart/worker interruption logs retain it. Successful claim proofs are fsynced in the exclusive consumption record; successful dispatch proofs are in supervisor/attempt start records. No failed observation's repository/PR/comment bodies are promoted into accepted evidence. HTTP status is null when no status was observed, never an inferred success or zero. UTC times are for audit, monotonic time controls deadlines.

The 120-second budget belongs to one call of the live verifier, including all its reads and waits, not to the entire supervisor lifetime. A dedicated read-only subprocess is bounded by `min(30 seconds, remaining budget)` and killed/reaped by subprocess.run on timeout, including DNS/TLS/body stalls. No reader is a game worker. Unknown reader failures stop immediately. Local scheduling/termination overhead is not an authorization extension: evidence arriving at or after the deadline is rejected.

Historical immutable-commit reads and git remote publication checks are prevalidated but are not on this retry allowlist. Their failure remains terminal. Retry does not remove TOCTOU: owner revocation or HEAD movement may occur after prevalidation, which is why fresh claim and worker checks remain. If any stage exits after consumption, its approval stays consumed. This contract does not establish global no-start proof or recovery across processes/machines.

Approval 6159857990 and its 84789832 stop are historical terminal evidence. They are not eligible for this new procedure. New binding/publication and owner approval remain separate future operations; none are created or consumed by this implementation task.
