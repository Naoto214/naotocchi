# iPhone trial implementation plan

Goal: PR385 new2/6, anchorA playable independently, preserve lab and all 560 records.
Architecture: reuse old movement/hold/roster/store and adapt player lifecycle to new session. Rendering is a projection of committed wave snapshots. No timer pause for tool selection. Only resolution animation serializes actions. Own storage key only.
Spec: user iPhone trial request, 2026-10-15.

- [x] Add player lifecycle tests: timer during selection, stale target, no spend on invalid/collision, animation exclusion, snapshots/replay.
- [x] Implement player-model.mjs using existing lifecycle and pathToPose; tool selection controller with final-tap commit.
- [x] Add player.html/css/mjs with 6x12 left board/right tools,44px controls, stage labels/images,NEXT3; gesture and hold reuse; default2/6 vs8/24 new run only.
- [x] Add short mixed/evolve/death/egg animation timeline; extract existing10chain replay; independent storage, records, save/resume.
- [x] DOM/geometry-contract checks, focused tests and mutation, original tests and full npm test. Keep tests and measurements unchanged.
- [x] Document iPhone LAN trial and preview limits; independent review; scoped commit and GitHub save; fresh SHA/tree/clean and Draft/open state.

Review focus: hidden-page elapsed time; stale target after lock; double taps while animating; saved pose and queue identity; short320x568 viewport and unavailable storage.
No main merge, no public deployment, no protected edits. Sites deployment is classified as production by available tool, so do not use without explicit approval. Local LAN is the fallback deliverable.

Execution ledger: model8 + effects2 + existing31 tests pass; DOM flows and standalone pass; review found hidden landing deadlock, HTTP save unavailable, storage getter exception. All three fixed; lock and HTTP persistence regression assertions observed failing before fixes. Storage denial smoke now passes. Full regression completed: 3144 + 80 passed. Final outcome is in phone-qa-results.json.

Ruling: no Sites deployment because tool classifies it as production; provide local LAN/private Codespaces instructions and standalone build instead. Cost: user starts a server; no immediate phone URL in this Work session.
Ruling: HTTP fallback uses optimistic revision checks and one-tab usage, with weaker concurrency guarantees than HTTPS Web Locks. Existing game saves remain untouched.
Browser limitation: no control-browser capability; actual Safari geometry/touch/audio QA deferred and explicitly reported.
