# Production 2.5D home integration — work in progress

Owner authorization: release all 13 approved v9 backgrounds after full validation. Do not merge on unresolved regressions. No 52-image expansion in this change.

## Sources and recovery
- Initial main / rollback source: `851cf09a80c7ed41ba7293888084272917e4582c`.
- #426: `8ba4ef1cb2030979664589d2e36423f58c4dedbd`, open Draft.
- #462: `e0c5c52671666e8ab06b37afabf3eeae29f530fa`, open Draft; base `baseline/home-v22-art-20261028` = #426 head.
- Integration branch: `integration/home-25d-release-20261030`, based on current main. A single merge carries #462 and its #426 ancestry, never two independent merges.
- Source PRs, their branches and owner-only v9 Sites are untouched.
- Before release main check runs: 12 completed/success including Pages build/deploy. Prior v9 CI run 41014280598: completed/success at code SHA 369858842b13a443aae217cf13c277d0a6da3f42; not a substitute for integration CI.

## Implementation
- Resolve index/package/Pages conflicts retaining latest main menus, test list and all production distribution entries.
- Production manifest picks home C, waterfall forest, water G, sea B2, new star and new lake; other seven scenes retain v9 geometry and images.
- Production presenter/model materialized by tools/home-production-sync.cjs using the reviewed v9 model and rotation adapters. Historical sources stay available. Exactly one presenter is loaded by production HTML.
- Egg presentation uses existing C adapter; production save key remains `naotocchi-save-v1` and backup family unchanged. No migration introduced.
- Original character image files, other games, conversation modules and game catalogs have no diff from initial main.
- Historical QA entry builders map production HTML back to their original presenter in disposable output, preserving the original comparison tests' subject.

## Validation so far — NOT release approval
- New production tests: 3 passed; with asset-version checks 5 passed, 0 failed/skipped.
- Python Pages tests: 16 passed.
- Runtime package: 220182097 bytes (about 210 MiB), 4119 files; all old production allowlist entries retained, 13 optimized background images included, originals excluded.
- Initial package attempts correctly rejected original-art metadata references and incomplete dependency hashes. Runtime-only metadata and reviewed source manifest corrected.
- Initial exploratory baseline overlapped working-tree integration and is not claimed as a clean baseline. Sparse checkout caused missing archived QA fixtures; full checkout restored them. Retests of 3D fixture groups: 20 and 16 passed.
- Complete integration suite is in progress. First run includes failures found before subsequent fixes; final rerun required.
- Historical home-art-test has an experiment-only assertion comparing the entire working tree with #426. It rejects legitimate latest-main changes. Remains unresolved; not disabled or relaxed.
- Local Playwright browser download failed: official CDN returned HTTP 200 HTML `Site Unavailable` instead of ZIP. Chromium/WebKit matrix not yet executed. New GitHub Actions matrix prepared; CI success pending.
- Production HTTP verification must use clean package, not package plus disposable QA files.
- Physical iPhone Safari, rotation/background resume/performance remain unverified.

## Rollback procedure
Before release, record exact final pre-merge main and deploy run again. If authorized release later regresses, revert the integration merge via a new commit/PR; never reset/force push main. Run save compatibility and Pages checks before redeploying. Current change introduces no save-key/schema migration, and no action deletes localStorage. Do not roll back unrelated later main changes. Original sources remain recoverable at the SHAs above.

## Release gate
NO MAIN MERGE OR PRODUCTION DEPLOY until the complete regression, exact-head CI, 13-region Chromium/WebKit input/layout/save matrix, independent review and clean HTTP artifact verification pass. Deployment success alone is insufficient.
