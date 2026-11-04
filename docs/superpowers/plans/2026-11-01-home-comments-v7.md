# Home comments VERSION 7 implementation plan

**Goal:** Implement the user's approved V7 design: system notices above, all character comments below with a small portrait/name row and a full-width body, intrinsic CSS dimensions and native wrapping.
**Architecture:** Preserve the notice timers/queue and conversation engine. Explicit presentation metadata at story/action sources routes character narration to the existing speech lane. A viewport dock inside the unchanged 76px reservation sits above fixed controls; its content has no influence on terrain geometry. Shared portrait/header rendering covers all roles, including first encounters.
**Tech Stack:** Existing JS/CSS, Node runtime harness, Chromium/WebKit CI.
**Spec:** User's complete VERSION 7 request in this session (2026-11-01).

## Constraints
42px notice and 76px speech base lanes; no world coordinates, movement, save schema, background, growth, dialogue rules, main merge, Pages publish or force push. Keep V6 b3c48ef52fbc78687a35d4b14b5506f18d2c935d and Site version 6 recoverable. Publish privately only when required checks pass.

## Review focus
First encounters without an existing partner; repeated comments alongside system notices; very long names/tokens; rotation with open choices; hidden UI and hit testing over the terrain.

## Tasks
- [ ] Runtime RED tests: no injected phrase markup, explicit comment routing, system milestones unchanged, formal portraits for all roles.
- [ ] Scoped renderer, dock and CSS implementation; preserve legacy comparison behavior and queued events.
- [ ] Browser regression: five lengths, three roles, four widths, rotation, simultaneous notices, controls, unchanged world geometry. Retain historical V6 checks against the frozen V6 baseline where their old requirements intentionally conflict.
- [ ] Full suite, production contracts/package, CI 13 regions and both engines. Review changes, push only the authorized branch.
- [ ] Private Site source/package and deployment after gates; retain recovery version; report exact results and remaining device QA.

## Decisions / progress
- User has already approved the design and implementation/publication; proceed inline without another design gate.
- Starting PR branch b3c48ef5, main aec03c20; baseline 9 workflow runs successful. Other checkout's uncommitted work left untouched. Working in an isolated worktree.

- Runtime tests RED→GREEN for native text, portrait/name markup, candidate encounters and actual court replies. Existing 365 production regression tests passed.
- Review found an actual court-friend source still using setMessage; corrected with candidate identity, plus author greeting. Added mixed-queue duration tests and browser choice/menu/rotation/exchange checks.
- Ruling: legacy touch tests now measure the new scroll owner (dock), retaining overflow, edge containment and tapability assertions; the 76px reservation is no longer the painted text scroll box.
- Git CLI lacks write credentials; used GitHub Git-data API with tree equality verification and a non-force expected-head update. First remote V7 commit 2413151b.

## Continuation review — 2026-11-01
- Resumed at dbbb729b8d8a968e7ff595950a6443e90309bff8 in an isolated worktree; main remains aec03c20. V6 source f10871d8 and private saved version 6 remain available.
- Fresh review reproduced three important issues: plain action messages interrupted care afterglow through story semantics; guest-code replies lost their portrait/name; companion farewell still used the upper lane.
- Ruling: original setMessage-based narration uses a dedicated presentation panel in the same bottom dock, with the original message timer/critical priority and shared speaker renderer. It must not invoke the semantic story engine or change its movement/afterglow gates. Existing genuine stories keep their queue and interruption behavior.
- RED→GREEN: four feed/cure and reduced-motion cases, companion farewell, guest portrait; added critical deferral/lifetime regression. Actual court reply browser test targets the presentation panel while retaining loaded portrait, containment and two-row assertions.
- Browser runtime currently unavailable: cua backend connection closes before initialization. No local alternate browser-control path used. Required Chromium/WebKit checks remain gated on GitHub CI; no V7 deployment until they pass.
