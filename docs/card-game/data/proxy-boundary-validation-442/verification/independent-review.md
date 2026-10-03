# Independent review442 — one review

Reviewer: separate read-only agent /root/review442. Baseline441 44b3fcdc6ccfbd0075cc487b9bec9b77e97e5fa8. No second independent review is claimed.

Findings: Critical0 / Important1 / Minor0.

Important: an explicit selector with instance_id=null reused the non-explicit selector's None sentinel and selected the first matching physical card. Reproduced for both effect target and payment selection; violated explicit identity matching and atomic rejection.

Coordinator added one test with twelve subcases (target/payment x null, empty string, boolean, integer, list, object). Before fix, the null target and payment cases both failed to reject. `review-red.log` preserves both failures. The fix requires a nonempty string for explicit identity and validates target card-name shape before zone routing. Rejection preserves state/commands/events/snapshots. `review-green.log` and final integration record post-fix verification.

Reviewer additionally checked07 replacement/prevention ordering, target departure and source departure distinction, per-object use retirement, costs retained, rejection rollback, and synthetic-vs-legal-run labeling. Reviewer ran16 dedicated tests, loaded the saved gzip and replayed16 cases/583events, and confirmed all six441 execution records identical. Whole historical proxy suite was not rerun. Final post-fix regeneration/source/protection checks are coordinator checks, not a second review or a claim of zero initial findings.
