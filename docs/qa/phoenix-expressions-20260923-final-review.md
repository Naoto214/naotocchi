# Phoenix independent final review

## Stage 1 — spec / code quality / disposable fixture

Reviewer: phoenix_final_review. Reviewed 2026-09-22. Scope: working-tree connection changes against local baseline `1b445488d0663a9dbbce7cb135448152841c7be7` (remote saved baseline `6ccc3d04d9a5295122d9a03c8b8bdae8332e197f`, same tree). Production PNGs and new placement generation are still in progress; they are explicitly excluded from this stage’s completion claim.

### Findings by severity

- Critical/high: none.
- Medium: none.
- Low/actionable: none.

### Spec review

Read the current three-class specification and phoenix continuation appendix. The latest A/B/C rules take priority over historical text. The new appendix carries the single-body/single-face decision, preservation of original fire/feathers/age/rebirth characteristics, no new living interpretation of ash/sparks, preservation of completed 1840 expressions and 184 placements, and the Draft/open/unmerged PR requirement. Original-image classification evidence and recommended face-anchor tuples are recorded in the separate original review. This stage did not repeat an audit of existing completed expressions.

### Code review

- `pet-expression.js` changes only the staged asset allowlist to add phoenix. Ten existing state names and semantics, resolver priority, reactions and all shared SVG definitions remain unchanged.
- New `expression-face-anchors.json` tuples agree with the independent original-image review. All old anchor rows are unchanged. The generated production placement block is unchanged at this stage; its new eight rows require later review.
- Canonical phoenix names match `character-world-master.v1.js`; the same eight age/stage mappings are used by the disposable preview.
- Preview achievement seeding extends the existing dragon rare-line fixture treatment to phoenix. It suppresses the artificial first-rare encounter overlay in the disposable preview; it does not modify production achievement logic, game numbers, save format, or real storage. The preview storage-isolation and stage tests cover this.
- Replacing unsupported-species fixtures from phoenix to god is appropriate: god exists in the canonical rare-species master and remains outside the expression allowlist. Tests retain unsupported portrait fallback, absent accent/sweat, and form-change clearing assertions. New phoenix loops cover each of the eight stages and all ten existing expressions.
- Integration coverage checks persistent states, temporary happy/strained reactions, critical precedence over happy, and unchanged serialized state after rendering.
- The asset test extension checks each new stage for ten distinct transparent PNGs, original bounds, and distinctness from normal art. It is intentionally not run until asset completion.
- Review gallery and placement-check species registration are additive only. No tracked old asset or normal image has changed in the inspected diff.

### Verification performed

Read-only diff inspection and `git diff --check`: pass. No repository edits, commit, Site operation, image generation, or existing-expression visual re-audit was performed.

Targeted Node test run passed **28/28**, zero failures, ~8 seconds. This includes phoenix routes (8), phoenix integrations (8), phoenix preview isolation/canonical names (2), and fallback/clearing assertions (10). Command:

```sh
node --test --test-name-pattern='phoenix.*routes|phoenix.*renders|phoenix preview|assetFor allowlists|accentFor returns|adult dog supports|puppy supports|wanpaku supports|young dog supports|calm dog supports|sweat follows|real home emotion|form changes' tests/pet-expression-test.cjs tests/pet-expression-integration-test.cjs tests/cat-expression-preview-test.cjs
```

Log: `/workspace/scratch/bf73fcf410a5/phoenix-stage1-tests.log`.

### Pending stage 2

Review all 80 new PNG + mark composites, generated new eight placement rows, actual collision/sweat checks, final diff and preservation evidence. This stage does not certify unfinished PNGs, final placement, deployment, GitHub state, or whole-suite results.


## Stage 2 — completed PNG composites and final code diff

Reviewed all new80 composites. Detailed per-state acceptance is recorded in `/workspace/scratch/bf73fcf410a5/phoenix-composite-review.md`. Current disposition is **79 PASS, phoenix08 sick sweat placement HOLD (C1, medium)**. No PNG regeneration was requested; parent is evaluating only the new08 sweat coordinates.

Final code-diff inspection confirms eight new phoenix placement records plus phoenix asset allowlist registration are the only `pet-expression.js` changes. The existing dragon08 record differs solely by the comma required to append new entries. Resolver, shared accent SVGs, reaction map, save/gameplay logic and existing184 placement values are untouched. `index.html` changes only the pet-expression cache version to `20260923-00f42d58` at this checkpoint. Face anchors and stage names append phoenix only. `git diff --check` passes.

Root reports byte-identical hashes for all2141 preexisting PNGs and equality of existing184 anchors/names; these preservation checks are credited to root rather than claimed as an independently repeated audit. The provided automated placement report records1920 marks/1152 sweat envelopes with zero issues. Existing completion-image visual re-audit was not performed. Root's final npm test is in progress and is not duplicated here.

Spec/code logic review: **PASS**, subject to closing visual placement C1 and final root verification. Overall final acceptance remains on hold only for C1; no other severity findings.


## Stage 2 closure — final Spec / Code / Composite PASS

C1 was corrected exclusively in the new `phoenix/08` sweat coordinates to `{leftInner:31.6875,rightInner:70.6875,centerY:54.1875}`. The regenerated sick composite was independently reopened and accepted: drops now sit near the face with visible spark/ash clearance. No PNG regeneration or changes to shared marks/old184 placements were needed. The refreshed automated placement report still contains no issues.

Final independent disposition: **Spec PASS; code logic/quality PASS; new80 composite review PASS (80/80). No open critical, high, medium or low findings.** Root is responsible for final whole-suite/final-validator evidence, updated runtime cache token after the last coordinate edit, owner-private Site validation and Draft/open/unmerged GitHub save. No claim about those unobserved external/final gates is made here. Root reports individual independent acceptance of all80 PNGs and matching reviewed-image hashes; this complements the composite review rather than replacing it.


## Root final verification addendum

After the independent closure, the runtime cache was updated to `20260923-592ae494` (matching the final JS SHA1 prefix). Whole npm test completed with 1576/1576 passing, exit0; because the new08 sweat data/cache changed during that run, the final relevant unit/assets/integration 864 tests and cache 2 tests were additionally run, all passing. Final placement:1920 marks/1152 sweat envelopes, zero issues. Final 80 accepted hashes, baseline2141 hashes, old184 layouts, and Site1920 PNG hash matches verified. This addendum records root verification and does not recast it as independent review.
