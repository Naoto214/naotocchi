# iPhone trial implementation plan

Goal: PR385 new2/6, anchorA playable independently, preserve lab and all 560 records.
Architecture: reuse old movement/hold/roster/store and adapt player lifecycle to new session. Rendering is a projection of committed wave snapshots. No timer pause for tool selection. Only resolution animation serializes actions. Own storage key only.
Spec: user iPhone trial request, 2026-10-15.

- [ ] Add player lifecycle tests: timer during selection, stale target, no spend on invalid/collision, animation exclusion, snapshots/replay.
- [ ] Implement player-model.mjs using existing lifecycle and pathToPose; tool selection controller with final-tap commit.
- [ ] Add player.html/css/mjs with 6x12 left board/right tools,44px controls, stage labels/images,NEXT3; gesture and hold reuse; default2/6 vs8/24 new run only.
- [ ] Add short mixed/evolve/death/egg animation timeline; extract existing10chain replay; independent storage, records, save/resume.
- [ ] DOM/geometry-contract checks, focused tests and mutation, original tests and full npm test. Keep tests and measurements unchanged.
- [ ] Document iPhone LAN trial and preview limits; independent review; scoped commit and GitHub save; fresh SHA/tree/clean and Draft/open state.

Review focus: hidden-page elapsed time; stale target after lock; double taps while animating; saved pose and queue identity; short320x568 viewport and unavailable storage.
No main merge, no public deployment, no protected edits. Sites deployment is classified as production by available tool, so do not use without explicit approval. Local LAN is the fallback deliverable.
