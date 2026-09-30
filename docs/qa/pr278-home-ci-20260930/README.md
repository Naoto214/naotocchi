# PR #278 Home CI transport investigation — 2026-09-30

Canonical feature HEAD: `a34661525fef83852d6925c2941ba199b8779ac6`; tree `5eb222e80a15b49db93524176246ca2af4d20ce3`.
Main: `05b31dfd4c2c2ebecc5890ffc2a23efbcfd1d032`.
PR remains Draft/open/unmerged. Production runtime, images and formal assertions are unchanged in this investigation.

## Failure evidence

- Runtime run 36644035343: 2780 PASS / 0 FAIL / 0 SKIP.
- Home run 36644035334 attempt 1: chromium-phone-badges-safe-area; pet-expression.css fetch failed with ECONNRESET 133ms after case start. Other 213 printed PASS lines completed.
- Previous Home run 36641517795: landscape-safe-area, four CSS fetches failed with ECONNRESET. The failed viewport changed across runs.
- Main already documents the same failure class in docs/qa/rh-1-save-integrity-2026-09-26.md and rh-6-test-architecture-2026-09-28.md. The relevant browser test and route guard are exact main, but that alone does not prove the cause of these particular failures.

## Local investigation

- Node 24.19.0: 60 page loads with the existing route.fetch/fulfill mechanism, no CSS transport failure.
- Node 22.23.3: another 60 page loads, no CSS transport failure.
- First 10 original layout scenarios, Chromium: four samples on Node 22.23.3, all 40 pass.
- Exact CI Node 22.23.2: first 10 original layout scenarios pass.
- The reduced diagnostic harness invokes original layout assertions but omits subsequent suites and WebKit; these are diagnostic observations, not a complete Home CI pass.
- Server timeout events were observed locally without client CSS failures. A controlled worker-server keep-alive timing probe did not reproduce a failure. Stale connection reuse remains an unconfirmed hypothesis, not a finding.

## Remote diagnostic method

Isolated branch `integration/pr278-home-ci-20260930`, commit `30dec206b103c8718fb7496430902e2452ae5b2b`, tree `79fad74d6b7d6bc5ec82bba69cc597910c4d7689`.
Only the isolated branch workflow and an opt-in Node preload changed. The preload records localhost CSS request errors with reusedSocket, timing and ports. It does not alter request options or bodies, retry, suppress errors, or change assertions. A real localhost-server probe verified both unchanged successful response bytes and a single surfaced failure with one diagnostic and one request.
The branch-only push trigger is for investigation, not a change to the canonical workflow policy.

Diagnostic Home run: 36659988776 (full unchanged suite with preload).
Control: Home run 36644035334 attempt 2, same canonical HEAD, one explicit rerun. A pass does not erase earlier failures or prove a permanent fix. Do not repeatedly rerun until green.

## Terminal CI observations

- Diagnostic Home run 36659988776: SUCCESS, 214 printed PASS lines, 0 FAIL lines, no CSS_TRANSPORT_DIAGNOSTIC error record. This does not establish the hypothesis: the failure did not reproduce.
- Canonical Home run 36644035334 attempt 2: SUCCESS, 214 printed PASS lines, 0 FAIL lines, no ECONNRESET. The full Chromium and WebKit suite completed with unchanged assertions and no in-test retries.
- Canonical Runtime run 36644035343 remains SUCCESS, 2780 PASS / 0 FAIL / 0 SKIP. It was not redundantly rerun: canonical source and HEAD are unchanged.
- Fresh PR #278: Draft/open/unmerged, mergeable=true, mergeable_state=clean. Both latest check-runs completed with success. Legacy combined status is pending with total_count=0; that is not a pending check-run.
- Fresh main and feature refs equal the SHA values above. The canonical feature branch received no new commit during this investigation.
- Fresh image recheck: 3289/3289 SHA256 values match the pre-integration approved baseline; see image-recheck.json.

**Current CI is GREEN; the intermittent transport defect is NOT proven fixed.** Preserve both original failures and these non-reproductions. The root cause remains unresolved in the RH-6 test-transport backlog. No speculative connection, retry, timeout, cache, runtime, artwork or assertion change has been applied.

The diagnostic preload and branch-specific workflow trigger remain on the isolated investigation branch only. They must not be silently merged into the canonical branch. This record closes the current reproduction/CI check, not the underlying flake investigation. Public same-URL image-cache architecture remains a separate unresolved item. Ready/PR merge/main push were not performed.
