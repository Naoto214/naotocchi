# SDD ledger — plan: docs/card-game/plans/2026-10-04-mandatory-policy-contract-464.md

Base 58c896fa56df8ba0b7cbb765724087fb5e5d04da. Existing isolated card-game branch verified clean; docs-only scope. User authorized inline implementation and GitHub save; no intermediate approval.

Task1 complete: contract4 RED missing module -> GREEN. Pinned artifact + source hashes, strict C/JSON.
Task2 complete: random6 RED missing module -> GREEN. Fixed synthetic unit bytes only; no OS entropy. Independent HMAC construction, mirror/context binding, exact evidence and rejection boundary.
Task3 complete: audit5 RED missing module -> GREEN. Supplied fragment never admits balance. Singleton follow-up RED 2 failures -> GREEN dedicated16 after audit6 addition.
Root cause singleton: length of supplied IDs was labeled as fully legal singleton. Corrected pure arithmetic labels to supplied_singleton; strategic_unproven=null until semantic completeness evidence exists. No fullMRP record produced.

Ruling: Keep evidence-fragment validator distinct from fullMRP record validator — 463's nested semantic/lock/ledger proof contracts are unverified; do not substitute booleans. Cost: readiness remains closed and further adapters are required. No change to user-approved policy or admission semantics.
Ruling: Save one meaningful completed kernel checkpoint instead of per-task commits — user requests checkpoint only for meaningful progress. Cost: one combined review range, TDD logs retain sequence.

Task4 verification/review in progress.

Final review: reviewer C0/I0/M2. Ruling: regrade deep JSON classification to Important — malformed CLI input must return structured exit2, not pending exit1 — cost if unfixed: automation confuses invalid input with blocked readiness. Fix: loader catches RecursionError; 2 regression cases RED->GREEN, dedicated18 PASS.
Final: minor (deferred): supplied singleton proof intentionally does not bind root/context; N>=2 mutation guarantee is not singleton origin certification. No admission grant.

Task4 verification complete: dedicated18, related136, npm406 PASS; design errors=[]; old3629 blobs unchanged except README. GitHub transport follows; no runtime eligibility granted.
