# Pages runtime allowlist

`allowlist.json` is the publication source of truth. Its `files` array contains
exact repository paths; the packager never copies a directory or wildcard.
Nothing is removed, moved or re-encoded in Git. A new original or QA file stays
unpublished unless someone explicitly changes this reviewed list.

## Build and verify (Python 3.11+)

Run from the repository root, with empty output paths outside the checkout:

```sh
python -m unittest discover -s tests/pages -v
python tools/pages/package.py --out ../pages-runtime --report ../pages-report.json --tar ../pages-runtime.tar
python tools/pages/verify.py --artifact ../pages-runtime --package-report ../pages-report.json --report ../pages-http.json
```

Both raw file bytes and uncompressed tar must be below 350,000,000 bytes, well
below Pages' 1 GB published-site limit. The report records every path and SHA-256.
The package includes an empty `.nojekyll`; source bytes and URL paths stay intact.
The workflow's upload-pages-artifact action tars the same validated directory.

## What is retained

- Main game HTML/CSS/JS, fonts, 2D art/expressions, item/UI art, World backgrounds.
- Character 3D and World 3D modules, vendored Three.js and licenses.
- CARD GAME code, approved palette/marks, UI art and all 904 optimized WebP
  derivatives for 452 card IDs, preserving paths and hashes.
- Naopoyo, slide08, growth-clear and legacy growth-chain player/entry URLs.
- Individually listed sample/replay JSON used by the existing playable selectors.
  Some live inside `results/` or `witnesses/`; these are explicit runtime exceptions,
  not permission to publish their parent directories.

Original card PNGs, comparisons, rollout images, QA screenshots, fixed match
evidence, Python, test/development tools and documentation stay in GitHub and
are omitted from the site (except the existing linked CARD GAME UI guide).
No existing external/private trial URL is edited or redeployed by this workflow.

## Updating runtime dependencies

1. Review the actual browser loader and all possible runtime URLs. Add exact paths
   to `files`; do not add glob-copy code or whole evidence directories.
2. Keep `dynamic_lists` (sample selectors) and `dynamic_families` (current runtime
   art families) complete. Families only assert coverage; they never select files
   to publish. A new family member requires an explicit allowlist addition.
3. Review each changed HTML/CSS/JS/MJS source for computed URLs and update its
   SHA-256 in `reviewed_runtime_sources`. Add/remove entries when sources change.
   This intentionally fails on any unreviewed source change, because regex-based
   static extraction cannot prove arbitrary JavaScript-generated URLs complete.
4. Rebuild and inspect the inventory, HTTP report and relevant game tests.
   Do not regenerate the list by recursively copying all repository files.

Missing dependencies, stale source hashes, source coverage changes, symlinks,
unsafe paths, duplicates, forbidden originals/evidence and capacity overflow fail
the build. Static links cover imports, script/style/img URLs, CSS URLs and literal
fetches. Runtime source hash guards complement the reviewed dynamic contracts.

## Release prerequisite — separate approval required

Current production uses **Deploy from a branch → main / (root)** with default
Jekyll. This PR only prepares and tests a replacement workflow. It does **not**
change the live site's source setting or deploy anything.

After the separately approved release decision:

1. Integrate this stacked fix into PR #399; recheck its final HEAD and CI.
2. Before merging #399 to main, change Settings → Pages → Build and deployment
   → Source to **GitHub Actions**. This stops the old root/Jekyll pipeline from
   republishing the multi-GB repository. The setting change is a required release
   step, not something that adding a workflow or `.gitignore` accomplishes.
3. Merge only #399 to main after all gates pass. The main push runs build,
   verification, upload and deploy. PR builds always skip deploy.
4. Confirm the Pages deployment SHA, public entry points and published images.

Do not merge #393/#396/#397/#398 separately. Do not deploy this branch manually
to production. The known FUN_ITEMS regeneration mismatch is outside this repair.
