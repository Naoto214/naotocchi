# Coral final independent review

## Verdict

**Specification compliance: PASS for completed local art, integration, placements, and prepared Site. Code quality: PASS. No blocking technical finding.** Deployment and final remote/Draft-PR workflow confirmation remain root-owned steps; this is not a claim that the Site has deployed or that remote CI has passed.

One non-blocking documentation action remains: update `docs/qa/coral-expressions-20260917.md` from its 62-image/in-progress checkpoint to the final results before final repository delivery. At inspection it still listed generation, placements, and tests as pending despite their completion.

## Scope and independent evidence

Fixed pre-coral baseline: `adb83f0664cf42f177505096ab420429da86e2f6`. Reviewed the full production-source changes against that baseline, including previously reviewed nine integration files, eight added anchors and generated placement entries, coral-only sick-mark placement exception, single `index.html` asset-version bump, and plan/spec/QA additions. Existing game/romance/save behavior source remains unchanged; expression behavior extends only coral.

Executed a read-only inline Node audit using Git baseline blobs, current files, SHA-256 and Git blob hashes, Sharp raw RGBA inspection, and isolated old/new expression-module VMs. All assertions succeeded:

- Manifest has 80 unique final expression paths; all 240 original/source/final SHA-256 values match the actual files.
- All 80 final PNGs are 128×128 with transparent and opaque pixels and exactly the original nontransparent bounding boxes.
- All prior 960 expression PNGs match baseline bytes; all 248 normal stage PNGs match baseline bytes.
- All 96 prior placement objects match, while total placement records are now 104.
- All 960 prior routes and emitted SVG strings match; 288 sweat comparisons at 64/80/104 sizes match.
- All 81 selected correction offsets and their selection document match baseline.
- There remain exactly 241 skip-worktree entries. Their baseline tree identities were also independently checked in the earlier preservation review; this review did not change the index.
- Coral 06 wantsPlay has the corrected source `exec-d47a3cdc-ebc8-4ae7-a6de-253cd7d73668.png`; its final/current source hashes match. The manifest retains `previous_source` (present on disk) and `correction_prompt` documenting removal of the unintended purple-branch face.

## Art and placement assessment

Independently viewed all eight original sprites and both full overview sheets (`coral-1-4.png`, `coral-5-8.png`), inspecting the 80 marked composites. I found no obvious mark/body overlap, malformed or misplaced mark, or added face on a branch or rock. The main emotional faces remain on the pink infant, stages 02–05 central trunks, stage 06 central yellow coral, stage 07 upper orange coral, and stage 08 large yellow polyp. Secondary colony faces remain visible. The corrected stage 06 wantsPlay purple branch has no obvious extra face in the final overview. Pixel-identical non-face art preservation is not claimed; generated shape/detail variation remains visible. This is a static visual review, not a device-animation test.

The `tools/place-expression-marks.cjs` exception is appropriately narrow: it removes only the upper-right sick-mark head-width limit for `line==='coral'`. Angle search (60–75 degrees), radius limit, alpha collision rejection, sweat-envelope avoidance, canvas limits, distance scoring, and all other species' original conditions remain intact. This is a defensible solution to branches occupying the entire restricted band and is consistent with the inspected clear placements. Existing placements are retained rather than regenerated. Root reports the prior coral/03 no-placement reproduction and subsequent successful run; I did not rerun the mutating generator.

Root's independent overlap checker result is 1040 marks and 624 sweat envelopes with zero issues. This result supports collision clearance; it does not prove ideal spacing or motion appearance. I did not rerun that passing checker.

## Tests

Read the completed `/workspace/scratch/da3674e89b1f/coral-npm-test.log`: **1169 tests passed, 0 failed, 0 cancelled, 0 skipped, 0 todo**, duration 122770.398426 ms. Root separately confirmed command exit 0. No full suite was rerun during this review.

## Prepared Site

Independently ran the read-only `/workspace/scratch/da3674e89b1f/check-coral-site.cjs`; exit 0 with:

- 13 species, 1040 records, exactly 80 current coral records, default coral.
- Version `co-dfabc6d2`, eight current sheets, all 80 new PNG copies equal production.
- All 960 prior Site PNGs equal fixed-baseline Git blob identities.

Inspected Site commit `00fb38b` against prior `a7663c5` after root committed it during the review. `review.js` changes only add coral to labels and change the default species. Tap selection/deselection, memo edits, persistence, export, copy, and fallback-copy code are unchanged. Review HTML changes only current-batch wording and versioned script URLs; controls and styles are unchanged. The prior idempotency finding in the preparation helper is already resolved. The checker validates the prepared assets and records but does not exercise a real browser or deployed host.

Root confirms Site commit/push is complete and deployment has not yet occurred. Publication, final remote/local application tree equality, latest main/HEAD/CI status, and confirmation that PR 278 remains Draft and unmerged must be completed and reported by root. This reviewer made no implementation, Site, Git, commit, push, or deployment changes; only this scratch review was written.
