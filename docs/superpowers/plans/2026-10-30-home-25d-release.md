# Formal 2.5D Home Integration Plan

> Execute inline with superpowers:executing-plans. Preserve source PR histories and require verification before merge.

**Goal:** Publish the owner-approved 13 backgrounds on the current production game without losing saves or other games.
**Architecture:** Start from main 851cf09a80c7ed41ba7293888084272917e4582c. Merge the #462 ancestry once (which includes #426), resolve only overlapping integration files, and connect the tested 2.5D presentation directly to the production entry point. Keep historical preview manifests/builders unchanged and introduce a production manifest with G/B2/C/new special backgrounds.
**Tech stack:** Existing plain JavaScript/modules, Node tests, Python byte-preserving Pages packaging, Playwright Chromium/WebKit, GitHub Actions.
**Spec:** Owner's full 2026-10-30 release instructions in the initiating conversation.

## Constraints
- Never force push; never merge both source PRs mechanically.
- Preserve production save keys/schema and all growth, conversation, relationship and economy rules.
- Preserve latest main menus, Naopoyo chapter 2, CARD GAME, story and other games.
- Keep 2D character assets byte-identical. Keep owner-only v9 untouched.
- No new background artwork or 52-image time-of-day work.
- Stop release for unresolved regressions, unsafe conflicts or save incompatibility.

## Review focus
- Production startup must load art without preview URL flags or storage keys.
- Egg and grown-stage transitions must clean up/recreate background correctly.
- Reflow/rotation must preserve navigation coordinates and 28-character movement.
- Existing saved conversation/relationship/evolution state must round-trip.
- Pages must include transitive module/image dependencies and exclude preview originals.

## Task 1: Preserve ancestry and main behavior
- [ ] Record source SHA, CI, deployment baseline and rollback commit in docs/qa/home-25d-release/REPORT.md.
- [ ] Run bounded-concurrency main baseline tests; classify environment failures separately.
- [ ] Merge #462 into dedicated integration branch, resolving index.html, package.json and tools/pages/allowlist.json with latest-main entries retained.
- [ ] Audit script.js automatic merge, all changed runtime files and protected content hashes.

## Task 2: Connect approved production presentation
- [ ] Add tests/home-production-test.cjs covering default 13-region selection, G/B2/C/special adoption, production entry, and save-key protection. Run and observe failure before connection.
- [ ] Add home-production-manifest.mjs and home-production-world.mjs, reuse v9 navigation and rendering. Wire home-diorama.js, script.js and index.html including egg presentation and fixed UI.
- [ ] Extend exact Pages allowlist with necessary runtime modules and 13 optimized images. Do not add originals/QA.
- [ ] Run focused tests and Python Pages checks; measure payload and verify bytes.

## Task 3: Integration QA and CI
- [ ] Run complete existing runtime, home, Naopoyo, card and Pages regressions without deleting/relaxing assertions.
- [ ] Run production-entry Chromium/WebKit matrix: 13 regions, 4 widths, 1/6/28 cast, eggs, input, rotation, resume, reduced motion and console errors.
- [ ] Verify old production save fixtures and menu navigation.
- [ ] Save exact commands/counts/failures and visual evidence, obtain independent whole-branch review, fix material findings.
- [ ] Push integration branch, open PR, require completed/success CI for exact final head.

## Task 4: Release and verify
- [ ] Recheck latest main; integrate/retest any changes before merge.
- [ ] Merge authorized integration PR only after gates pass.
- [ ] Verify final main CI/Pages deployment, HTTP file hashes and public browser behavior; physical iPhone QA remains explicitly pending.
- [ ] Record actual source PR status, rollback procedure, remaining limits, and links. Keep source PR branches and v9 site intact.
