# Relationship Expression — final Home QA reattempt (2026-09-30)

## Decision
**Home QA UNEXECUTED (environment-blocked). Not Home FAIL, not Home GREEN, not final GREEN candidate.**
A fresh local Chromium launch failed before creating any page. No screenshots or DOM measurements were obtained. No repeated launch, privilege escalation, sandbox workaround, alternative-host deployment, PR creation, Ready change or main merge was performed.

## Fresh source of truth
New clone from GitHub, not a previous working copy.
- Branch: feat/relationship-expression-pilot-20260930
- Start remote HEAD: 751533f565c49798ff4dc33b68c6b7ece118cf9a
- Start tree: 1a1fbf114c167d0d8e70e055d1d7c4432bee0db2
- Main: dd50ce4bc7b2bef1952ca52ab6157579598aacc1
- Ahead / behind: 10 / 0
- Open PR: none (fresh GitHub connector branch-filtered search)
- Pre-save ls-remote: branch/main unchanged.
This documentation-only commit has the start HEAD as parent. The resulting remote HEAD/tree are verified after saving and reported to the user.

Read the design, pilot plan, preflight, human Home check, full runtime plan/result, browser runner and development fixtures from this snapshot. Latest commit history identifies ad3969f as the runner/full-runtime update and 751533f as the runtime report/hash manifest. Historic image approval gates do not reopen: all 88 images are human-approved.

## Environment and one launch attempt
- Node v24.19.0; npm 11.9.0.
- npm ci --no-audit --no-fund: exit 0, 27 packages installed; tracked files unchanged.
- Available Playwright: 1.62.1.
- Its default Chromium revision 1234 and WebKit revision 2336 executable paths do not exist.
- Installed Chromium revision 1194 was selected explicitly for a single launch probe.
- Executable: /root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome
- Launch command, from the repository root:

```sh
node - <<'NODE'
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({
    executablePath:'/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome'
  });
  console.log('BROWSER_LAUNCH_OK',await b.version());
  await b.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
NODE
```

Exit 1. Playwright reported:
```text
browserType.launch: Target page, context or browser has been closed
FATAL:chrome/browser/process_singleton_posix.cc:292
Check failed: . socket() failed: Operation not permitted (1)
ptrace: Operation not permitted (1)
process did exit: exitCode=null, signal=SIGABRT
```

The fatal socket restriction occurs before page creation. The secondary crash diagnostic is not a Home failure. No launch was retried. Full runners were not started after this blocker; no browser scenario is counted as executed. WebKit was not launched.

## Saved runner / fixture readiness (read-only)
- tests/relationship-expression-browser.cjs
- tests/visual-qa.cjs (development-only /__qa fixture provider)
- tests/home-layout-regressions-browser.cjs
- tests/home-layout-browser.cjs
- Existing resume instructions: relationship-expression-full-runtime-result-20260930.md

All three browser runners passed node --check. The saved fixture provider was evaluated using the runner's existing VM extraction method. All eight relationship fixtures were generated and checked successfully:
relationship_{forest_bear|rock_octopus}_{20|50}_{pair|dense}.
Partner ID and affection are correct; pair has two companions, dense has 26; all companion bond values equal the named value. This confirms fixture construction, not browser behavior.

Relationship runner targets Chromium and WebKit at 390x844 and 320x568: 32 scenarios, up to 160 phase captures.
Saved assertions include loaded assets, expected cast count/paths, no document overflow/page errors, ordinary representative positive, all low-bond rescues, expiry to normal, court positive/expiry, and no serialized reaction fields.

### Coverage limits to retain on resume
The current fixtures give all companions the same bond. The runner does not by itself establish every item in the current handoff:
- Mixed normal/lonely/positive Home with multiple low-bond individuals.
- Single rescue and selective A=20/B=25/C=60 rescue, including post-play 50/55/90 and affected/nonaffected individuals.
- Expiry back to lonely when the current relation value remains below 30.
- Relationship marks absent, stable placement through expression changes, and technical visual readability/structure.
- Romance formation/repair/marriage are covered in saved Node evidence, not by this browser runner's court-only path.
These are explicit remaining browser evidence, not detected production bugs. Use QA-only fixture setup/minimal isolated browser supplementation where necessary on a capable machine; do not change production progression, assets or rules. Ordinary representative selection and rescue selection must remain distinguished according to the saved design/runtime. Do not claim the existing 160-capture matrix alone closes these gaps.

## Per-item browser status
| Area | Required evidence | This attempt |
|---|---|---|
| Bear | normal/positive/lonely, correct assets, partner placement, practical face readability, no layout jump | Unexecuted |
| Octopus | three states/assets, head/face/arm connections and major eight-arm silhouette, transparency, partner placement | Unexecuted |
| Dense companions | mixed states, individual lonely, one ordinary representative, density/layout, no new marks | Unexecuted |
| Rescue | single/multiple/selective rescue, lonely -> positive -> normal, nonrescued behavior | Unexecuted |
| Current-value expiry | positive -> lonely below 30 | Unexecuted |
| Partner events | court/formation/repair/marriage as reproducible | Unexecuted |
| Existing Home | main, partner, companions, conversation, responsive layout, controls, animation, cast layout | Unexecuted |

No aesthetic review, small-size asset comparison, image edit or new human image-approval gate.

## Tests / code / hash
- Production code changes: 0.
- Runner/fixture/test changes: 0.
- Save/schema/migration changes: 0.
- Newly executed browser scenarios/captures: 0.
- Existing saved Node baseline: 2,851 PASS / 0 FAIL (2,789 + 62); not rerun and not presented as a new run.
- New read-only checks: three runner syntax checks; eight fixture construction/value/count checks.
- All 3,430 tracked image files freshly checked against relationship-expression-full-runtime-hashes-20260930.json using SHA-256 AND Git blob SHA-1; changed/missing: 0. Tracked image count also matched.
- Relationship 88: unchanged.
- Usual 31-series images: unchanged.
- Companion/partner and other normal images: unchanged.
- Naoto images: unchanged.
- All other images: unchanged.
- Resolver, hunger, marks, z-order and motion: unchanged.
Only this QA document is added.

## Resume on a browser-capable authorized environment
1. Fresh-fetch this branch and main; verify HEAD/tree/open PR. Read this record and the full runtime result.
2. npm ci
3. Match repository CI tooling: npm install --no-save --package-lock=false playwright@1.62.1
4. Provide matching runnable Chromium/WebKit and OS dependencies (normal documented setup: npx playwright install --with-deps chromium webkit). The environment must permit browser process/socket creation and a local Vite listener; downloading a binary alone does not resolve a socket restriction.
5. Run node tests/relationship-expression-browser.cjs; inspect test-results/relationship-expression/results.json and actual Home captures. Preserve 390x844 and 320x568.
6. Complete the explicit coverage gaps above through development-only QA fixtures/isolated browser checks. Existing development route: npm run dev, /__qa, select the saved relationship fixtures; never require prolonged production gameplay.
7. Run node tests/home-layout-regressions-browser.cjs and node tests/home-layout-browser.cjs. Inspect required Home technical behavior, not image aesthetics.
8. Record exact browser results, remaining gaps and image protection. If runtime/test changes are necessary, follow the current handoff's relevant/full test requirements.
9. Save on this branch only; fresh-check remote HEAD/tree/main/ahead/behind/PR. No PR creation, Ready change or main merge.

The only outstanding work in this phase is genuine browser evidence listed above. Deferred bond/marriage/motion features are not begun and are not completion requirements for this phase.
