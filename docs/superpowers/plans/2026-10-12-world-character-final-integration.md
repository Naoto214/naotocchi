# World × Character final integration plan

> Execute with superpowers:executing-plans; independent protection audit and browser QA use dispatching-parallel-agents.

**Goal:** Complete existing PR377 and merge only after all required gates succeed.
**Architecture:** Preserve existing World and Character implementations. Repair proven integration defects and update obsolete structural assertions without weakening behavior checks.
**Tech Stack:** JavaScript, Node tests, Three.js, Playwright, GitHub Actions.
**Spec:** User's 2026-10-12 handoff; PR377 body; original baseline de0b38d06a4fec8d7d4e42497b9757996d8f2f7f, main249a954f09f70f124eb5e7243283c0fd4f8a4098.

## Global constraints
Existing 2D, save/schema/gameplay preserved. 293 Character shapes and approved Naoto/deer frozen. URL flags only. No force updates; expected SHA leases. iPhone NOT_RUN. Existing approved World visuals and 3D regional/corridor behavior retained.

## Review focus
- Unflagged discovery/map UX must retain main behavior.
- Hidden billboard is healthy only if active Character body is visible.
- Actor fallback must survive model failure and region changes.
- Terrain/bridge ground height applies equally to 2D billboard and 3D actor.
- Diagnostics stay opt-in and are not proof of pixel visibility.

## Task 1: integration corrections
- [ ] Reproduce the nine failures in the four reported suites.
- [ ] Audit main diff; add failing behavior tests for any unflagged 2D leakage; minimally gate World presentation.
- [ ] Update exact source assertions for groundY, player mesh variable, current regional/corridor predicate, explicit diagnostics; preserve all behavior assertions.
- [ ] Preserve original protected asset fixture; bind reviewed World simulation source in separate integration baseline.
- [ ] Recompute index cache tokens with canonical SHA1/date formula; leave correct tokens unchanged.
- [ ] Reuse World workflow on integration branch; retain all five jobs and read-only permissions.
- [ ] Run focused suites and remove-it controls, then leased GitHub checkpoint.

## Task 2: combined verification
- [ ] Full npm test, dedicated World/Character/integration tests.
- [ ] Runtime, Home and World CI on saved candidate.
- [ ] Browser QA: flags, reduced motion, 3D/player/fallback/terrain/cleanup/all regions/corridor; inspect saved images.
- [ ] Compare protected assets, Character shapes and gameplay/save sources against latest main; final independent review.

## Task 3: integration
- [ ] Fresh main/PR/conflict check; save evidence with expected SHA and verify HEAD/tree.
- [ ] Ready and merge PR377 with expected_head_sha once gates pass.
- [ ] Check merged main HEAD/tree and Runtime/Home CI.
- [ ] Close superseded parent PRs after proving their implementation is included, without duplicate merge.

## Progress
Initial fresh remote confirmed de0b38d, tree230c42688f72aa048a86310ce600e8cd12ae79bd. Main249a954. Home38198104385 success, Runtime38198104447 failure. Isolated checkout created; previous work not rebuilt.
