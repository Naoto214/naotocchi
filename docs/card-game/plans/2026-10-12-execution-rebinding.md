# Execution rebinding implementation plan

> Inline: superpowers:executing-plans. One independent review at bundle end.

Goal: reuse fixed material in a separately verified edition without reusing launch authority.
Architecture: old generation is audited by its exact code in an independent checkout; pure projection and exact comparison create a separate manifest; append-only binding joins both editions, original blobs, source delta and evidence.
Tech: Python standard library, Git, GitHub API, unittest.
Spec: data/proxy-population-effective-application/verification/positive-end-66199f4-rebinding-design.md; user approval 2026-10-12.

## Constraints

Only docs/card-game changes. Preserve old seven artifacts, stopped attempt, claims and numbered rules. No production play/resume/entropy/approval consumption. Manifest differences ONLY source_versions; every other key/value (Python, all hashes, groups, rows, order, roots, protocol, registry, provenance) compares canonically. Full Python identity and generator bytes protected separately. New binding/manifest hashes are distinct new artifacts, never replacements of old hashes. Exact source delta must equal explicit allowlist.

## Tasks

1. Create tools/proxy_population_execution_binding.py and test_proxy_population_execution_binding.py. RED missing API, mutations of every protected field, Python/generator/delta drift; GREEN pure derive(original, material, registry, old_edition, new_edition, allowed_delta). Old audit uses independent checkout and old existing package/operation/claim/preparation validators; never trusts caller success booleans.
2. Add binding publication and launch integration: RED altered binding/edition/manifest/request, absent proof and output reuse. New request schema binds both editions, receipts, proof and schedule. Existing v1 checks remain; supervisor forwards same context to worker. Dedicated and integration tests before GREEN.
3. Fixed-source validation: Git Data API expected_sha/force=false source checkpoint, population/mandatory full suite, diagnostic complete connection, design, fingerprints and PIPE logs. One independent review; TDD fixes. Append-only current preflight and binding artifacts; verified preparation before new request. No production supervisor invocation.

## Review focus

Forged old proof booleans; coherent hash/root mutations; generator/Python drift despite listed source delta; mixed supervisor/worker binding and v1 approval; stale/partial preflight, reused destination and consumed/edited comments.

## Ledger

Pre-flight: historical audit and projection feed binding audit; binding audit feeds request and both entries; saved new preparation feeds all launch gates.
Ruling: retain user-designated dedicated checkout; independent temporary old checkout. No repeated baseline run solely for restoration. User authorizes intermediate work without further confirmation.

Implementation checkpoints: 2de50b87 (binding/entries; related67 PASS/exit0/Python1096 unchanged), 0e45c957 (original seven-artifact preservation; two focused PASS). The related suite began before its identical source was committed; it is supplemental evidence, not the final fixed-source suite.

Final review: one read-only independent review of 2cfc1ca3..0e45c957; C0/I2/M0. Both Important findings entered one author TDD fix pass: mutable designated progress vs immutable data; explicit pre-repair preservation baseline for claims and stopped run. Two missing-gate tests RED; four focused tests GREEN. Actual baseline audit covers all pre-repair data and numbered rules, not only the known 23 files. Review report is verification/execution-rebinding-independent-review.md. No independent re-review claimed.

Ruling: preservation policy is a source-bound JSON document, requiring original package ancestry into baseline and baseline ancestry into new edition. Future repairs must explicitly maintain/advance the pre-repair baseline before their immutable source is verified. Changing the policy is an edition change covered by new verification and a new request, never a runtime allowlist relaxation. Cost if wrong: historical evidence loss; all selected protected blobs are compared and missing/changed files fail closed.
