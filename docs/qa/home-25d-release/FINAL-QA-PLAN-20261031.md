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
