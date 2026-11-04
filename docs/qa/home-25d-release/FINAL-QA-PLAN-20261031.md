# PR #490 final QA implementation plan

Goal: resolve the remaining release blockers on the existing Draft branch; no main merge or publication.
Spec: user's 2026-10-31 handoff (sections 0–14) and FOLLOWUP-20261031.md.
Start: a015cededb4cf197a70bde023e9324275b9d1fdf. Clean dedicated checkout.

## Constraints
Keep all 13 approved backgrounds, fixed 5+4 controls, notice 42px, speech 76px, safe areas, navigation, collision thresholds, coordinates, save schema, dialogue rules and existing games. Preserve failures and distinguish branches, CI merge commits, browsers and physical iPhone QA.

## Tasks
1. Reproduce resident expression cases 6/13. Inspect update cadence and nearest selection. Repair only invalid fixture assumptions in tests/meguru-resident-expression-test.cjs. Run the complete file and later npm test.
2. Trace production conversation canStart blockers. Inspect host vs VM RNG in tests/helpers/runtime-harness.cjs and tests/home-household-conversation-test.cjs. Make fixture randomness deterministic without changing production probability or dialogue eligibility. Run production contracts and determinism checks.
3. Reproduce native touch failures and record input target, blockers, path, acceptance and displacement. Inspect tests/helpers/home-production-pointer-target.cjs, home-production-native-touch.cjs, home-production-browser.cjs and scroll-browser.cjs against shipped input/model. Fix demonstrated causes only; retain movement >5px and safe-ground assertions. Re-run 24 conditions and all 13 regions with both engines.
4. Inspect additional current CI failures, compare latest main and preserve other-game changes. Run npm test, production contracts, save compatibility, guide/layout, distribution package + HTTP/hash verification. Save exact outcomes; never count unexecuted conditions as passing.
5. Review the changes, recheck concurrent remote updates, commit/push without force to PR #490, update Draft description and inspect all required CI conclusions. Report unresolved items and physical iPhone checklist; no merge/deploy.

## Review focus
- Dense 320px cast: real click hit targets and return paths after a first move.
- Rotation while conversation/reaction is active: preserve legitimate stops.
- Scroll painting: wait for an actual frame, still fail boundedly on missing synchronization.
- Expression cadence and nearest actor: assertions remain behavioral.
- Deterministic fixtures: independent private RNG must not consume dialogue RNG.

## Ledger
- Start CI completed: production regional jobs 9 passed / 4 failed; fixed-controls both failed at scroll after guide/layout passed. Home layout and character startup also failed. Full logs retained separately.
- Baseline expression test reproduces case 6/13 failures.
- Execution is inline under the user's explicit authorization; no further approval needed for investigation, tests or Draft branch writes.
- Resident cases corrected with cadence/nearest fixtures;18/18. Deterministic private model RNG verified independently of gameplay RNG; production contracts365/365 in two completed trials.
- Native inputs24/24,48 accepted moves including320x568/28. Full regression3745/3745 in two completed runs. Fixed layout22/22 and guide30/30 across both engines.
- Regional matrices cover13 regions,312 displays,104 positive inputs,26 blocked-input cases. Physical iPhone remains unverified.
- Review caught incomplete fallback selection and test-clock protocol timing margin; both corrected and rechecked. WebKit resize dispatch delay reproduced and acknowledged boundedly before unchanged geometry assertions.
- GitHub saves use equal-tree checked commit/ref API, force=false, expected current head. main/production untouched. Latest CI conclusions are maintained in the Draft PR body to avoid invalidating CI with a result-only commit.
- Final detailed report: FINAL-QA-20261031.md. Historical19/24 raw condition mapping and historical chicken blocker remain unverified; do not infer them from other trials.
