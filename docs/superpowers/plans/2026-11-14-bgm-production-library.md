# BGM production library Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. User has authorized implementation, merge and publish after passing verification.

**Goal:** Adopt immutable V7 music and provide safe incremental additions.
**Architecture:** Selective runtime transplant onto current main; frozen32 library; Python metadata/verification/export CLI; approved-only Pages payload.
**Tech Stack:** existing JavaScript/Web Audio; Python3, NumPy, mido, FFmpeg; Node test runner; Playwright Chromium/WebKit.
**Spec:** docs/superpowers/specs/2026-11-14-bgm-production-design.md

## Global Constraints
32 approved music files remain byte identical;3158 melody notes;50 original placement rows; per-track gain0dB; effective common gain0.36; no SFX/voice/save/game-engine changes; no historical PR deletion.

## Review Focus
- Async jingle stop/off/network-order and interruption must not cause late playback.
- Mutable metadata/assets must invalidate receipt and approval; incomplete cache fails closed.
- Candidate files must not leak through Pages allowlist.
- Frozen32 and old game code remain protected even when extensions are added.
- Existing catalog consumers and Safari lifecycle still work; state/save schema unchanged.

### Task1: selective runtime integration
Files: audio.js,script.js,bgm-v2.js,bgm-subapps.js,index.html, relevant subapp entry HTML, assets/bgm/*, tests/bgm-runtime-test.cjs.
Consumes pinned playtest runtime and549 music. Produces effective0.36 routes, unchanged game logic and50-row catalog mapping.
- [ ] Pin inputs/dependencies/other PR overlap; verify baseline tests and Pages layout.
- [ ] Write failing production catalog/gain/selection tests; runRED.
- [ ] Copy verified AAC/metadata; add minimal event hooks and common gain; preserve approved playback.
- [ ] Reproduce pending jingle/off/interruption defects; minimal guard/onended fixes; GREEN.
- [ ] Commit/push stage and create integration Draft against main.

### Task2: immutable library and incremental CLI
Files: music/{library.json,approved32.lock.json,placements.json,extensions.json,sources.json,policy.json,masters/,provenance/,templates/};tools/music/{library.py,quality.py,export.py};tests/music/test_library.py.
Consumes pinned metadata and assets. Produces registry, exact source lock, complete fingerprinted receipts, approved-only runtime export and preview manifest.
- [ ] Write failing duplicate/invalid/license/path/lock/approval/cache/new33 tests; runRED.
- [ ] Build initial32 records from pinned files; no synthesis/rendering/normalizing.
- [ ] Implement init/register/verify/approve/build with lock+atomic writes and approved payload list.
- [ ] Validate original32; simulate33 in tempdir including pause/retry/skip and approval boundary;GREEN.
- [ ] Commit/push stage.

### Task3: docs, deploy gates, full regression
Files: docs/music/*, music/README.md,.github/workflows/music-library.yml, tools/pages/allowlist.json, tests/music/browser.cjs.
Consumes Task1 runtime +Task2 exports. Produces documented commands, published-safe artifact and verified integration.
- [ ] Document arrangement/sample/license knowledge, usage loudness, creation template, new33 workflow, restore and PR operations.
- [ ] Reconcile Pages allowlist with approved-only exports and content hashes; test payload capacity.
- [ ] Full npm test, subapp suites, preservation/50routes/all32decode/gain/lifecycle/save tests on packaged runtime in Chromium/WebKit.
- [ ] Independent whole-branch review; resolve important findings with regressions; commit/push.

### Task4: production release
- [ ] Recheck currentmain and PR checks; incorporate only necessary latest-main conflicts.
- [ ] When allrequiredchecks pass, merge exact reviewedHEAD integration PR; preserve historicalDrafts.
- [ ] Wait Pages production success; verify live32AAC SHA and main/subapp screens/output graph.
- [ ] Save release evidence and report PR/SHA/main/URL/new33 commands.
