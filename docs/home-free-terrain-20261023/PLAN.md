# Free terrain Home implementation plan

Goal: PR #426 version 6 becomes a terrain-connected living Home with ordered information and event notifications.
Architecture: Keep the DOM illustration, expression and Motion owners. Build a screen navigation adapter over Meguru terrainGrid, camera projection and canonical collision geometry. Use bounded grid routing with swept collision checks. Remove Home-only plaza spots; preserve terrain and environment life. Consolidate information in normal document flow.
Tech stack: existing JavaScript, Three.js, CSS, Node tests, Sites private preview.
Spec: user's 13-section iPhone QA request, 2026-10-23, preserved in this session; version 6 baseline 404ea35d.

## Global constraints
- No main merge or production Pages update; continue existing Draft #426 and owner-private Site.
- No gameplay, save, attendance, expression priority, Motion v2 or Conversation v2 semantic changes.
- Three regions, four widths 320/375/390/430, scales 100/90/80/70 and casts 1/2/3/4+.

## Review focus
- Resize or world renderer recovery must not strand actors in water or obstacles.
- Path segments and diagonal grid steps must never cut through solids.
- Arrival changes must not resize established characters abruptly.
- Long event text, concurrent conversation and narrow screens must remain readable.
- Gesture/care/hidden transitions must preserve state and cancel stale routes.

## Tasks
- [x] 1. Baseline; add RED tests for absence of plaza pads, terrain projection/routing and obstacle/water rejection. Implement shared terrain navigation, scaled colliders and camera access. GREEN tests.
- [x] 2. Connect navigation to model/controller (sync, destination, waypoints, sweeps, resize). Preserve image state and gesture owners. Test cancellation, autonomy and multi-cast spacing.
- [x] 3. Consolidate header information and event slot. Preserve existing story queue priorities; serialize lightweight notices. RED/GREEN regression tests for content and order, busy transitions and save invariance.
- [x] 4. Compare stable cast sizes and 3-region/4-width browser screenshots. Choose a constant scale, document limitations and evidence. Validate full official package suite.
- [x] 5. Fresh whole-change review, address material findings, commit/push exact tree, update Draft #426, package and publish existing owner-private Site. Verify deployment and report.

## Progress / decisions
- Authorization includes design, implementation, git save and private publication; no intermediate approval needed.
- Existing version 6 local checkout matches remote PR SHA. Dedicated detached worktree isolates this task.
- Keep all evidence in this git repository; no separate artifact storage for repo-backed files.
