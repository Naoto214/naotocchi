# Lightweight Work development implementation plan

> Execute inline with superpowers:executing-plans. User authorized implementation and an independent Draft PR; no additional design approval is needed.

**Goal:** Create a reusable, small home-development checkout without changing existing copies, game assets, history, PR #490 or deployments.

**Architecture:** A new-directory-only partial shallow fetch selects the exact runtime allowlist plus root files, tools, tests and workflow sources. A small PR guard prevents undeclared generated evidence from accumulating; immutable hash-bound exceptions preserve intentional evidence publication.

**Tech stack:** Python standard library, Git, GitHub Actions.

**Spec:** User request of 2026-11-03, “容量調査結果の反映・軽量なWork開発環境の整備”. Protect all originals, approved previews, historical evidence and saves. No mass retrieval or history rewrite; validate only the lightweight workflow and capacity effect.

## Review focus
- Existing destination or symlink must never be changed.
- A server without partial-fetch support must fail before downloading blobs.
- Missing/unsafe runtime paths or runtime exclusions must fail before checkout.
- Documentation may contain executable CI inputs; add-on retrieval must be documented.
- Storage exceptions must match both exact path and content, not permit an entire directory.

## Tasks
- [x] Add real local Git fixture tests for sparse checkout, original retention, runtime coverage, full expansion, existing-directory refusal and unsupported filter. Observe failures, implement `tools/work/checkout.py`, run tests.
- [x] Add changed-file guard tests for existing evidence, new QA/archives, official assets and hash-bound exceptions. Observe failures, implement `tools/work/check_storage.py`, add a narrow workflow and root-only ignored output locations.
- [x] Save concise Japanese usage instructions. Verify one actual PR #490 snapshot with the new checkout tool; measure logical selected bytes and actual disk use, verify runtime coverage without building another copy, record results. Review and publish only an independent Draft PR.

## Execution record
- Isolated partial checkout created in this Work; existing checkouts not opened or changed.
- Prior audit reused. main baseline `aafe4abe7842b2fcf57060b207500e5b24f6c7a0`; PR #490 advanced concurrently, so live validation will pin its observed commit rather than modify its branch.
- Full game regression and full source download intentionally excluded by the user's verification scope.

- Task 1 complete: real local Git tests cover sparse selection, no hydration of excluded blobs, full expansion, ignored output, destination/symlink refusal and unsupported filter.
- Task 2 complete: generated-output guard + exact hash exceptions, root-only ignore and read-only PR workflow.
- Ruling: use ls-tree without size queries; the first experiment showed that -l hydrates omitted blobs. Regression reproduced RED then GREEN; interrupted experiment retained only approximately 1.3 MiB of metadata.
- Review: independent reviewer found stale-base false positives; fixed by merge-base comparison, with GitHub compare metadata for shallow CI. Regression RED then GREEN. No deferred material findings.
- Task 3 complete: live PR #490 snapshot d604642 verified, 4155 runtime blobs match Git; 12340 protected paths and their unique blobs remain absent. Focused tests 8/8.
- Ruling: preserve old branch-specific evidence exporters; do not change other work. Apply new output policy to new Work, with repo guard effective after this independent PR is merged.
