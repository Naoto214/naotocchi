# Version 9 CI follow-up — 2026-10-30

Resumed at PR #462 HEAD `8067baf5aa1211ad6f45854efaa612a096e92629`. The existing v9 artwork, comparison pages and owner-only publication are retained.

## Failure and root cause

Run 41009097493, job 123910673722 (sea-b2), passed the Chromium/WebKit background matrix but failed the interactions runner's final page-error assertion. Its unconditional Playwright init script accessed localStorage on the lifecycle test's `about:blank` document, producing `Access is denied for this document`. This is test setup, not a demonstrated game-save failure.

## Change

Extract the same sentinel initializer into a test-only helper. Seed only when `location.origin` equals the exact HTTP test-server origin, including port. Keep the blank-page navigation, page-error assertion, sentinel byte comparison, save/reload checks, and all pointer/motion assertions. No swallowed storage errors or weakened assertions. Three unit cases cover opaque/unrelated origins, seeding and preservation, and visible storage failures at the real test origin. The original behavior fails the first case; the guarded behavior passes all three. Existing v9 manifest and region selector tests also pass (7 total).

The runner invokes the new unit tests in CI. No runtime, artwork, delivery files, main, PR #426 or Sites deployment is changed. Existing v9 publication remains source `22dab24840fa39f557c180d12a3f2b5167e5c4e4`, saved version 12; v8 rollback version 11 remains available. CI success after the change must be checked separately; this commit is not a claim that browser CI has passed.
