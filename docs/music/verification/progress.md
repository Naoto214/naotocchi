# SDD ledger — plan: docs/superpowers/plans/2026-11-14-bgm-production-library.md
User authorized native execution, independent integration PR and production merge/publish after passing verification.
Pre-flight: Task1 catalog32 supplies Task2 frozen library; Task2 generated runtime exports must retain Task1 catalog behavior; Task3 package uses only approved assets; Task4 merges exact tested head.
Design builder check: approval fingerprint, cache failures, pipeline exclusion, source lock, loop boundaries and async jingle cancellation incorporated into spec before implementation.
Task1: started; latestmain105dba5; #540 integration delta reviewed; #54901a5591 and #550bea117b pinned. No full legacy branch merge.

## Checkpoint: runtime and library implemented
- Latest-main selective BGM hooks;21 runtime/SFX tests and9 game-scope tests pass.
- Exact32 master adoption;3158 melody events and50 rows protected;32 existing quality receipts reused after hashes checked;no regeneration.
-12 library tests pass including isolated33rd registration/revision/resume/approval/export and immutable32.
- Pages package4319 files/293648325 bytes, within350MB budget.
- Full game suite, packaged browser checks, independent final review and production deployment remain pending. This checkpoint does not authorize ignoring any failed check.
