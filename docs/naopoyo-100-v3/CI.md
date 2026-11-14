# Existing CI failures: diagnosis and bounded fixes

Baseline: `63af9f9a82dafcb6825cec5ff850980205abadb4`, Draft PR #535. Investigation and local validation: 2026-11-12. These changes do not alter game production code, disable tests, weaken assertions, or change browser versions.

## Browser runner compatibility

[Run 42807145461, job 129799065356](https://github.com/Naoto214/naotocchi/actions/runs/42807145461/job/129799065356) checked out PR merge `6d2ad51fc9d559acbd4ae34a17c94282f45379f1`. Its `ubuntu-latest` runner was Ubuntu 26.04.1 (`ubuntu-26.04`, image `20261101.186.1`). Installation of the workflow's pinned Playwright 1.51.1 stopped before browser tests:

```text
Cannot install dependencies for ubuntu26.04-x64 with Playwright 1.51.1!
Error: ERROR: Playwright does not support chromium on ubuntu26.04-x64
```

Only `chapter-browser` now uses `ubuntu-24.04`. Replay/card jobs retain their existing runners. Playwright 1.51.1, test commands, and all browser checks are unchanged. The [versioned Playwright platform source](https://github.com/microsoft/playwright/blob/v1.51.1/packages/playwright-core/src/server/utils/hostPlatform.ts) declares Ubuntu 24.04 supported and routes 26.04 to an unsupported platform key.

Local verification used a temporary installation of exactly Playwright 1.51.1. With `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu26.04-x64`, asserting a nonempty Chromium download list failed (`actual: 0`). The identical assertion passed with `ubuntu24.04-x64`; that platform also has a populated native Chromium dependency list. The 24.04 CLI dry run resolved Chromium 134.0.6998.35 build 1161 and its headless shell. Workflow YAML parses successfully. This checks the specific compatibility failure; it is not a hosted-runner or complete browser-test pass.

## Simulation fixture nondeterminism

[Run 42807145647, job 129799066954](https://github.com/Naoto214/naotocchi/actions/runs/42807145647/job/129799066954) reported one failure in its large test batch (3292 passed / 3293 tests): `the simulation runs with no renderer or DOM: world coordinates, movement, obstacles, meeting and talking`, in `tests/meguru-test.cjs`. The nearest actor was a beetle, while the test expected the mushroom by reference.

The test selected the first unfixed resident, moved the player 20 world units behind it, and assumed that resident would be closest. Before this assertion it advances more than 21 simulated seconds. An unseeded random walk and date-dependent world population permit other residents to approach. `meguru.js` correctly selects the actor with the shortest distance; the fixture did not guarantee its expected actor was closest.

The unchanged test was repeated locally through a temporary runner executing its actual callback. It reproduced on attempt 5: mushroom distance `20`, forest bear distance `19.10033732010388`; reference equality failed. No game code was changed to obtain this failure.

The test now opts into the existing `harness({ deterministic: true })` preset, matching the nearby scene test's established approach. This pins the date, environment, and shared random stream for this fixture only. All movement, obstacle, meeting, talking, bubble-expiry, following, and view assertions remain. Production randomness and the harness defaults remain unchanged.

## Validation and remaining checks

- Local Node: `v24.22.1` (workflow requests Node 22).
- `node --test tests/meguru-test.cjs tests/harness-determinism-test.cjs`: **21 passed, 0 failed**, including the existing harness tests across host clocks and time zones.
- The same temporary callback runner executed the corrected simulation test **60 times with zero failures**.
- Playwright platform compatibility: unsupported 26.04 assertion red; supported 24.04 downloads/native-dependency assertions green, as described above.
- Workflow YAML parsing and `git diff --check`: passed.
- Bare `npm test` was attempted. It passed the first command group, then stopped in the second group (35 passed / 37 tests) because this sparse checkout omits `home-production-egg.mjs` and `index.html`. The affected tests were `egg visible body is centred independently of transparent PNG padding` in `home-production-birth-test.cjs` and the `menu-12-test.cjs` file. These are local checkout availability failures; a full npm-suite pass is **not claimed**.
- GitHub Actions has not yet run these changes. The hosted browser job and full npm suite must be checked after the branch update; no existing run was rerun as a substitute.
