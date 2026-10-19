# Pages runtime package plan

Goal: preserve PR #399 and every source/evidence file while publishing only reviewed runtime paths, below 350,000,000 bytes. This is the user's approved capacity repair, not a game change.

1. Inventory the current root/Jekyll deployment, game entry points, module imports, static assets and dynamic sample JSON loads.
2. Add an explicit path allowlist, a dependency-free Python packager and reference verifier. Reject unsafe paths, symlinks, duplicates, missing files, excluded references, stale output and over-budget artifacts. No wildcard copying.
3. Preserve all runtime bytes. Include current 2D expressions, companion/partner art, World backgrounds, fonts, Three.js/Character modules, 904 card derivatives and playable sample records. Reject development/original/evidence files unless an individually documented runtime sample is required.
4. Add build-only PR CI and a main-only Pages deployment job. Require Pages source to be switched from branch/Jekyll to GitHub Actions at the separately approved release; do not change settings or deploy now.
5. Generate actual directory and deterministic tar, test all included HTTP paths and references, run focused existing regressions and a fresh independent review. Save exact capacity, hashes, protection comparison and limitations in this directory.

Checks: a future unlisted file never enters the artifact; a new referenced asset absent from the allowlist fails; a missing dynamic asset/sample fails; directory/query/fragment links remain valid under /naotocchi/; source and output bytes match; no protected paths change.

Implementation files: tools/pages/{allowlist.json,package.py,README.md}, tests/pages/test_package.py, .github/workflows/pages-runtime.yml. Evidence and this plan live in docs/pages-capacity-20261019/ and are never published.

Baseline: #399 d32e652bb799e09e403a9eb0feac74b45d7771b6, tree 3e1d823ecee59a6531fa77023e9a3b125f94c05e. Main fe6fd8a308df5ff0147d00bc0b6abd2ff0fceca7. Existing PR CI 9/9 success and focused card tests 47/47 already verified. FUN_ITEMS regeneration failure remains unrelated and unchanged.

Decision: custom workflow replaces root Jekyll after separate approval. Generating a denylist for Jekyll would admit newly added originals by default; exact allowlisting avoids this. Source-setting change and main merge remain release prerequisites, not actions in this task.
