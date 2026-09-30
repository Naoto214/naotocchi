# Butterfly final independent review — 2026-09-17

## Verdict

**Specification compliance: PASS for the completed local artwork, integration, placement data, tests, and prepared Site. Code quality: PASS. No remaining blocking finding.** Site publication and final GitHub/Draft-PR verification remain root-owned delivery gates and are not claimed here.

One actionable issue was found and resolved during review: `index.html` briefly used the malformed cache token `4f5d97ee-5c2056d4`. Root ran the normal bump workflow, producing `pet-expression.js?v=20260917-4f5d97ee`, which matches the current file hash and project convention. I independently reran `tests/asset-versions-test.cjs`: 2 passed, 0 failed.

## Scope and code review

Reviewed the complete working change against fixed local baseline `1452200bdb9242ef05d0e3555206cb2d8c1de7bc` and its approved butterfly plan/spec. The runtime change is limited to eight butterfly stage routes plus generated butterfly placement entries. Preview, gallery, stage-name, placement-checker, asset-contract, route, runtime, and hunger-mark coverage consistently extend the established coral pattern. The eight Japanese stage labels match `character-world-master.v1.js`; unsupported fallback coverage remains on `beetle`.

No placement algorithm, gameplay, romance, save, CSS, or unrelated runtime behavior changed. The spec and QA record correctly describe stage 06 as the left emerged butterfly with an empty right chrysalis.

Independent checks:

- Final manifest helper: 80 unique stage/state records and 80 unique generated sources; all 240 recorded original/source/final SHA-256 hashes matched; every final PNG is 128×128 with alpha; manifest is `complete: true`.
- Asset contract: all eight butterfly stage tests passed, covering ten distinct transparent expressions with each original's exact drawing bounds.
- Preservation helper: all 1,040 prior routes, emitted SVG accents, expression PNGs, and all 104 prior placement objects match the baseline.
- Direct Git-blob audit: all 297 baseline non-expression character PNGs in the working tree match byte-for-byte, covering the required 248 normal stage sprites.
- Placement checker: 1,120 marks and 672 sweat motion envelopes, zero issues.
- The 241 historical skip-worktree entries remain present. `git diff --check` passes.

## Art and placement review

Independently inspected all eight originals, the 80 normalized portraits, and both full marked overview sheets (`butterfly-1-4.png` and `butterfly-5-8.png`). Stages 01–03 preserve their caterpillar bodies; stages 04–05 preserve the hanging caterpillar/chrysalis, twig, leaf, and attachment; stage 06 preserves the blue emerged butterfly and keeps the right chrysalis empty; stages 07–08 preserve the blue wing patterns, antennae, body, and single central face. No obvious extra face, stray object, malformed anatomy, or wrong expression remains.

All eight fixed face anchors align with the actual-coordinate grid. Marks retain the existing semantics and read clear of the subject in all 80 composites. Branches and wings naturally place some marks above or outside the head silhouette, but no body/mark collision or misleading target was found. Generated outline and detail variations are visible and remain within the approved production-first tolerance. The gallery is a static composition with approximate sweat, not a device-animation capture.

## Tests and prepared Site

Inspected the completed full-suite log at `/workspace/scratch/8774163cb668/butterfly-npm-test.log`: **1,211 passed; 0 failed, cancelled, skipped, or todo; duration 138,557 ms**. This run preceded only the cache-token format correction; the targeted asset-version tests passed afterward.

Independently reran the read-only prepared-Site checker. It passed with 14 lines, 1,120 unique records, exactly 80 current butterfly records, butterfly as the initial line, version `bf-08021b72`, eight sheets, all 80 production PNG hashes matched, and all 1,040 prior Site PNGs preserved. The Site diff adds butterfly labeling/default selection and current-batch content while retaining tap selection/deselection, memo persistence, export, copy, and fallback-copy behavior.

## Pending delivery gates

- Publish the prepared update to the same owner-private Site and verify the deployed result.
- Save the application tree to the existing GitHub branch using the required remote base tree, confirm remote/local tree equality, retain all 241 skip-worktree entries, and confirm PR #278 remains Draft and unmerged.
- At review completion, root reports remote `main` at `5d39eea915d09be3900d92fa879a9e9f1ecf6091`, advanced independently; the feature branch remains at `909262e070308b065fdf8898d6807535ae944716`, and PR #278 remains open, Draft, unmerged, with its pre-existing conflicts. Recheck these after the branch save and report CI accurately; no-runs/pending is not a passing CI result.

This reviewer made no implementation, artwork, placement, Site, Git, commit, push, or deployment change; only this review report was added.

## Delivery follow-up by root

Same owner-private Site version51 published successfully; source 8c3382f2cc32388e78a3712a2f9845b7c2ebc52a, deployment appgdep_6aabc9923e2c8191adc686cb17a1d9bf. Final application save and post-save GitHub checks are recorded in PR #278.
