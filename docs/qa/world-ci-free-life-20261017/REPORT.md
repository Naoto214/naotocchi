# World CI repair — free-life startup and explicit cast

## Scope and baseline

- Repair PR: https://github.com/Naoto214/naotocchi/pull/392 (Draft; do not merge).
- Fresh main: `faeee72c81957073502d9c37e2ca6bedb37c1a79`.
- Base tree: `49b29928798d07eca632f408e432b29eb8f0cce9`.
- Production source, character assets, save/schema, other games and UI: unchanged.
- Final CI URLs, exact reviewed HEAD/tree and merge recommendation are recorded in the PR body after CI completes. This source report does not convert pending runs into passes.

## Confirmed failures (original run, not repair results)

World run https://github.com/Naoto214/naotocchi/actions/runs/38981863084:

| Job | Original result | Cause |
|---|---|---|
| character-integration | failure | Validator required >=3 live bodies from automatic shiba/cat_friend party. Failure injection searched that empty party. Normal-URL stress expected 26 automatic companions. |
| browser (smoke) | failure | All 13 regional reports correctly had party=0, but summary required party=27. |
| browser (captures) | success | Historical successful run only |
| browser (corridor) | success | Historical successful run only |
| browser (visibility) | success | Historical successful run only |
| regression | success | Historical successful run only |

Original Runtime 38981862983, Home 38981862978 (pad-size + home-layout), Naopoyo integration 38981863007, slide series 38981862989 and Pages 38981862193 were successful. These are not fresh repair verification.

Full original failure logs are retained alongside this report.

## Repair

- `cast-fixture.cjs`: test-only explicit placement, based on production registry and companionsOf; exact nonempty/unique identities, removal of duplicate resident identities, save unchanged. Never imported by production. Runtime accompaniment cap and duration remain unchanged.
- `character-integration.cjs`: normal zero-party startup first; the same explicit two-character fixture then exercises fault isolation, fallback, terrain, all regions and corridor cleanup. Explicit 26-companion + player load preserves the previous 27-body viewport test.
- `regions-smoke.cjs`: each region records normal zero-party startup first. It observes the actual installed social session advancing, then visits an unmodified resident of each present role and checks live attached visible 3D holders. It subsequently inserts 26 companions + partner and retains walking, overlap sampling, landmark and rendering observations.
- `ci-summary.cjs`: normal and load contracts are independently required; missing actors, empty observations, absent/stalled social sessions, missing load bodies, missing overlap samples and browser errors fail. Normal form/companion/partner role coverage is required across the 13 regions.
- `world-character-browser-runner-test.cjs`: rejection tests for missing/incorrect normal and load evidence; actual runtime fixture must stay save-neutral and reset to free life on regional reentry.
- Workflow: run World checks before merge on PRs to main (previously push-only). Reuse existing autonomous producer QA, 293-model x 12-state browser sweep, direction/reduced-motion QA and 27-model expression benchmark. Upload generated direction evidence too. No skipped or removed tests.

## Local checks and review

- Red control: normal single-player sample failed the old >=3 assertion (`red-gate.log`).
- Focused free-life/social/runner suite: 31 PASS / 0 FAIL (`focused.log`).
- Expression/free-life/Relationship/Motion protection suite: 153 PASS / 0 FAIL (`protection-local.log`).
- Autonomous producer tool: 3 PASS (real reunion/greeting/affection_interaction -> subscribed production expression bridge).
- Review found insufficient normal resident render observation and omitted direction artifacts. Both were addressed; rendering and session-advance observations were added without changing production.
- Local full Chromium encountered a host socket permission restriction. Playwright's installed Headless Shell can run and is used for local rendering. Neither represents physical iPhone Safari.
- An initial local smoke attempt was stopped after the home result when review strengthened its contract; it is not a complete successful run. Final GitHub smoke must cover all 13 regions.
- Full suite and CI outcomes are pending at report creation; see the final PR body and linked raw GitHub logs/artifacts for the completed results.

## Remaining gate

No main merge in this task. Require all fresh World, Runtime and Home jobs to succeed and an explicit final merge approval. iPhone Human QA and final visual/interaction quality remain uncompleted. SwiftShader timings are observations, not physical device performance certification.
