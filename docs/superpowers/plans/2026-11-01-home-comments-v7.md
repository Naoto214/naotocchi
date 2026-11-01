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
