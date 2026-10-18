# Relationship Expression — iPhone Home QA page delivery

## Decision
QA page implemented and dedicated owner-private Site publication succeeded. **Human iPhone Home QA is pending; Relationship System is not marked GREEN.** No Work Chromium launch was attempted in this task.

Actual deployed URL:
https://naotocchi-relationship-home-qa.kerzion214.chatgpt.site

This is a separate QA Site, not the normal GitHub Pages game. Deployment success establishes a live URL; it does not establish Safari pixel/touch verification. The owner may need to sign in. No existing Site or production Pages was overwritten.

## Fresh Git baseline / saved code
- Repository: Naoto214/naotocchi
- Branch: feat/relationship-expression-pilot-20260930
- Start remote HEAD: 88c8042cad6bf43536946b5962e95c20a2d015eb
- Start tree: 4adc73d0b7756427ff0381fe06ad9a554106146c
- Fresh main: dd50ce4bc7b2bef1952ca52ab6157579598aacc1
- Start ahead / behind: 11 / 0
- Start open PR: none
- Fresh fetch and local tree matched; no previous working state used as authority.
- Main/branch rechecked before code saves; no main changes/integration needed.
- Code commit: c074bb9920dbb69390a4690c7d39c2bc46427ff1
- Code tree: fcf8ecd367f998e6968467fbb4d2ef1fbbb6e6e8
- All page/test code is saved in that commit (parent code commit 20ce0de2a827df9ad0e609009fed19675a596e11).
- This subsequent documentation-only commit records final validation/publication; final HEAD/tree/ahead/behind are fresh-verified after saving and reported in the handoff.

## Files and scope
Production changes: **0**. Existing runner/fixture changes: **0**. Production image changes: **0**.

QA additions:
- tools/relationship-home-qa/build.cjs — static artifact builder; exact production markup/dependencies, narrow generated runtime export, source hash manifest, empty-output guard.
- tools/relationship-home-qa/cases.cjs — twelve cases derived from saved visual-qa fixtures.
- tools/relationship-home-qa/bootstrap.js — memory local/session storage, fail-closed ordered script loading, relation image preload, development-only clock isolation.
- tools/relationship-home-qa/runtime-hook.js — existing reaction stimulus / real play action, deterministic representative draw, one action per fixture.
- tools/relationship-home-qa/page.html — Japanese responsive controls outside full-viewport Home.
- tools/relationship-home-qa/controls.js — selector/navigation/reset/replay/status, parent-only return affordance.
- tests/relationship-home-qa-test.cjs — thirteen new QA-specific tests, separately invoked (not silently added to npm test).

Documents:
- relationship-expression-iphone-plan-20260930.md
- relationship-expression-iphone-usage-20260930.md
- this result

## Twelve cases / instructions
All twelve are implemented and reproducible from disposable fixtures. Exact values, labels, expected transitions, developer build/serve commands and human steps are in relationship-expression-iphone-usage-20260930.md.

| # | Case | Evidence / purpose |
|---|---|---|
| 1–3 | Bear normal / positive / lonely | Same cast/layout, real resolver; positive explicitly held for inspection |
| 4–6 | Octopus normal / positive / lonely | Same cast/layout, real resolver; face/major arm structure for human check |
| 7 | 26 mixed companions | 9 lonely / 17 normal; optional actual court gives partner positive simultaneously |
| 8 | Ordinary play | Real click; exactly one representative positive |
| 9 | Single rescue | otter 20 -> 50 -> normal after reaction |
| 10 | Multiple/selective rescue | otter/clock/cat_friend 20/25/60 -> 50/55/90; first two positive, third not rescued |
| 11 | Current-low-value expiry | Existing temporary partner reaction -> lonely at 2500ms |
| 12 | Normal Home | main, partner, 26 companions, conversation, buttons, original animation/layout |

No new Relationship marks, expression states, thresholds, game events or progression rules. Existing renderHomeCast, cast-layout.js and relationship-expression.js are used unchanged. Only the generated QA runtime copy receives a closure export; source equality after removing the exact bridge is tested.

Storage substitution happens before any original inline/external game script is activated. It never reads persistent storage. Both localStorage and sessionStorage are memory-only; replacement failure means no game script is activated. Parent controls have no storage access. Case reload replaces the entire iframe and discards its state/timers. Nothing persists a Relationship expression field.

Fixed-positive display is explicitly labelled and retriggers the existing reaction every second; transition cases retain the actual 2500ms duration. QA stops only the automatic 3000ms age interval. No production timer or behavior is changed. The low-value return case is a QA stimulus, not a fabricated new game event. Original Home play is used for rescue cases with a temporary deterministic draw selecting the first companion; this makes the representative overlap the rescued set without changing the production rule.

## iPhone / responsive boundary
- Full device innerWidth/innerHeight iframe; QA controls never reduce its height.
- Reference viewport correspondence: 390x844 and 320x568; code-level resize/control tests cover both dimensions.
- Parent-page top-right QA return button remains reachable despite original Home pan-lock; it is outside the iframe DOM/layout. This small QA overlay may cover part of the header and is not a production layout change.
- No actual iPhone/browser render or screenshot claimed. Human confirmation is the remaining purpose.

## Tests
- Full `npm test`: exit 0; 2,851 PASS / 0 FAIL = 2,789 existing suite + 62 Relationship; cancelled/skipped/todo 0. Existing suite duration 995899.892268ms; Relationship duration 5443.998323ms. QA-specific additions are run separately. All production/npm-test inputs remained unchanged throughout the full run.
- Related existing + initial QA subset: 151 PASS / 0 FAIL (141 existing + then-current 10 QA; overlaps full suite, not additive).
- Final QA-specific: 13 PASS / 0 FAIL; cancelled/skipped/todo 0.
- Dedicated tests cover twelve-case data, memory storage isolation/fail-closed, source identity, original play/rescue transitions, current-value expiry, nonserialization, outside-button routing, iPhone return/viewport handling, nonempty-output rejection, image preload/failure.
- RED observed before new implementation; concrete QA routing/return/output guard/preload failures reproduced before corresponding GREEN fixes. Early syntax errors during development were corrected before final runs.
- Related command: node --test tests/relationship-home-qa-test.cjs tests/relationship-expression-test.cjs tests/relationship-expression-integration-test.cjs tests/save-compat-test.cjs tests/save-integrity-test.cjs tests/save-recovery-test.cjs tests/cast-layout-test.cjs tests/home-touch-test.cjs
- Final QA command: node --test tests/relationship-home-qa-test.cjs
- No browser test executed; no inference that Node tests certify pixel layout or physical touch.

## Review / decisions
Independent code review found no Critical production issue. Important QA usability issue: full-height iframe plus existing pan-lock could trap navigation. Fixed with parent-only return control that remains reachable on manual scroll/resize; regression test failed then passed.
Output directory guard was also tightened to reject any nonempty directory, preventing unrelated files from being copied into a publication. Regression test failed then passed. No remaining review finding deferred.

Decisions made within the authorized scope:
- Use a new owner-private static Site rather than overwrite the existing approved Expression Site or main Pages. Cost: one additional isolated QA Site; no production impact.
- Freeze only auto-aging and label held-positive separately. Cost: this page does not validate long-running game progression (not this task's purpose).
- Deterministic representative overlaps rescued first actor for selective-rescue cases. Cost: not a test of random distribution; actual production rule is retained.
- QA return overlay is outside Home geometry. Cost: small header overlap while viewing Home, documented above.
- Avoid Work browser launch because the environment restriction is already established and user explicitly chose human-device QA.

## Hash / artifact audit
All 3430 tracked images match the saved full-runtime manifest using SHA-256 and Git blob SHA-1; final SHA-256 recheck also changed 0.
- Relationship 88: unchanged
- Companion and partner normal: unchanged
- Usual 31-series: unchanged
- Naoto: unchanged
- Other images: unchanged
No production asset additions/deletions/recompression/renames.

Generated output source/ref audit: 3032 copied/source-manifest entries matched, all local script/stylesheet/preload references exist. Original playable index is not the preview root, and original script.js is not exposed as a separate normal entrypoint; generated game.html + qa-runtime.js are isolated. Runtime/assets correspond to code commit c074bb9. No credential, real user save or personal data is embedded.

## Publication evidence
- Dedicated Site ID: appgprj_6abd0706d5fc8191ba0292d2e91922f3
- Site source commit: 363bd2a1fb6929f43fd7fd6aafc1a9cc6c30d710
- Saved version: appgprj_6abd0706d5fc8191ba0292d2e91922f3~appgver_aaeacdca10948191b53c89a9accab570
- Deployment: appgdep_6abd0a2ec7dc819183e188ab67ece465
- Status: succeeded
- URL: https://naotocchi-relationship-home-qa.kerzion214.chatgpt.site
- Audience: owner-private; no audience change.
- Static configuration: {"project_id":"appgprj_6abd0706d5fc8191ba0292d2e91922f3","static":{"directory":"dist"}}
- Packaging initially rejected unsupported static.directory=public before any deployment; corrected to supported dist and successfully repackaged. Expired Site source credential refreshed for the same Site. No duplicate Site/deployment was created.
- Existing repository has test/artifact workflows, no branch-preview deploy. Normal main Pages and prior Expression Site unchanged.

## Remaining work / stop
Only human iPhone Home QA and any concrete issue it reveals remain for this phase. Request the owner to inspect the twelve cases; do not request renewed image approval. Formation/repair/marriage browser routes are not certified by this minimal page; saved Node coverage remains.
No PR creation, Ready change, main merge, PR278 change, normal31/Naoto change, bond/marriage/date/motion work. Stop after final remote verification. Page implementation and successful publication are not final Relationship GREEN.
