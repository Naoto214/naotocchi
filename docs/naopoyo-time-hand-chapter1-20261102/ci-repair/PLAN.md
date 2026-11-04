# PR504 CI repair, 2026-11-04

Keep approved d55a48d9 gameplay and e03fdcc9 release behavior byte-identical. No stage/UI/rule/save migration changes. No test deletion or disabling.

1. Inspect each failed job and artifacts. Incorporate main3a9929ef (CARD breakup change) without overwriting it.
2. Fix cache tokens, obsolete public-route expectations, version contamination in private historical QA, test-injected startup wait, and direct render-count measurement. Preserve exact reviewed game source protection instead of forbidding the authorized addition.
3. Run affected existing tests and immutable-source checks, push exact merge tree, require final-head GitHub CI. Merge/publish only when all release conditions pass; otherwise report remaining concrete failures.
