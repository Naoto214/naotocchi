# Task 11 bounded integration workflow — independent review

Reviewed `/workspace/scratch/150320e8a2fd/rollout-integration-evidence`, exact base `8523a522bf8967a2679ed7cbfdcdd63b328d354b` through clean head `cc8f42584dec9e4844184bd252d0d57888794044`. Read all four changed files, the root evidence map, relevant existing motion/stage/gallery tools, report and before/final logs. Independently checked exact selector/map identity, YAML parsing, preserved job/dependency layout and diff whitespace. No implementation edits, broad test replay or capture.

**Code/spec PASS. Critical: 0. Important: 0. No actionable production minors. Actual integration CI/capture and image acceptance remain separate gates.**

## Scope and routing

The explicit `[qa:integration]` marker reuses the existing 18 jobs; no runtime, model, exporter, capture implementation, registry, gameplay/save/World/Home/Expression/2D change is included. The existing 31-family matrix, same-source stage aggregate, conflict audit, human/fish performance, scene/lifecycle, gallery and dedicated regression remain active. The five already approved capture steps in `wave-review` are conditional, while its gallery check and gallery artifact path remain intact. Four family wave-capture jobs, four former candidate-distance jobs and nonplayer capture are skipped only in integration mode. Dedicated integration keeps existing mechanism mutations while skipping the scoped candidate selectors.

Ordinary unscoped and existing six-marker behavior are preserved. The focused test evaluates all **64 prior marker combinations**, including dedicated-step routing, plus explicit integration precedence with representative mixed markers. In particular, **`[qa:nonplayer]` without `[qa:integration]` does not run the new motion step or stage matrix and still runs nonplayer capture and its scoped mutation route**. Root's next candidate-image save can bundle this inactive mode without launching integration capture.

Independent PyYAML parsing confirms all **18 existing job names/order and dependency relationships** match the base. No new browser/setup framework or duplicate family jobs appear.

## Exact motion selector and recoverable evidence

The new config independently matches the root's reviewed JSON selector exactly: **86 unique stages in 15 families**. The tracked evidence map is a byte-for-byte copy of the root reviewed map. Tests establish legal inventory, exclusion of 136 reviewed full-state stages and 26 Pilot samples, and a complete disjoint 248-stage partition; duplicate, accepted, Pilot and illegal in-memory substitutions are rejected.

The existing `wave-motion.cjs` runs only under the integration marker and receives each existing matrix family's exact configured subset. Empty subsets do not invoke it. Motion goes into `stages/$QA_LINE/missing-motion`, included by the existing source-specific family artifact upload. At most eight stages/256 raw cells are added per family, preserving archive limits and avoiding a combined 86-stage artifact. Existing stage capture command, max-parallel 5, artifact names/paths and aggregate source checks remain unchanged. Timeout is 25 minutes only for integration, retaining 15 minutes otherwise.

The stage aggregator reads only `meguru-qa.json`; the nested motion file has its distinct `motion-evidence.json` name. The meaningful synthetic CLI regression places misleading failed/different-source motion metadata in all 31 child folders while requiring the legitimate **31 shards/248 exact stage records** to aggregate. Existing distance file and same-source/duplicate/coverage gates therefore remain effective.

The config/map distinguish **860 historical minimum review cells** from **2752 emitted raw cells plus 86 sheets**. Actual review/owned-face coherence remains controller work; emission or a green stage aggregate is not image acceptance. Prior source-specific gates, partial Pilot evidence, early 80-distance-image review gap and clownfish05 notice limitation remain explicit. Actual family artifact sizes and combined browser duration have not been measured by these local static tests; the first integration CI run remains the execution evidence for those bounded settings.

## Evidence inspected

`task-11-before.log`: **4 PASS/2 RED**, failing actual new integration skip behavior and timeout route before implementation. `task-11-validation.log`: **7/7 PASS**, no skips/failures, 2.264 seconds—six new focused workflow tests plus the existing exact-stage evidence test. The inline selector command is executed for all 31 families, and ordinary/integration routing plus aggregation are asserted. Worker also records the actual new shell block passing `bash -n`; no browser run or image PASS is claimed.

Root's assembled `integration-and-legacy-page.tap` additionally records **8/8 PASS**, no skips/failures, 2.287 seconds, combining six workflow cases with the separately reviewed two legacy-page resolver tests. This supports the current inactive-mode/nonplayer bundle; the page implementation is outside this review's diff.

Current finished workflow/config/test hashes independently recorded during review:

- workflow: `d4a9f7cb1730cd7b426fa631d46697729216fdfa86337f624f34d899fc581d26`
- selector config: `38207566addceab814179b708793644c30a4a59bca2f2cb9a2120d513ff31ef0`
- focused test: `6f3fd599887170eebdfde00d49089d4684697182b705590e592ae9d0507f79ad`

Clean finished commit and whitespace check confirmed. No code correction is required. The worker report's skip-list sentence was initially ambiguous; clarification was requested without requiring a production change. Two candidate source-image decisions and final integration/Human/device acceptance remain root gates, unaffected by this workflow review.
