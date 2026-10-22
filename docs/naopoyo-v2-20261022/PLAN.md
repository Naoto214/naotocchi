# Naopoyo v2 Implementation Plan
> Execute inline with superpowers:executing-plans. User explicitly approved uninterrupted implementation and private publication.

**Goal:** Continuous additive merge/split independent iPhone trial.
**Architecture:** Independent pure engine, transaction session, pointer controller, browser UI. Reuse read-only official art and geometry.
**Tech Stack:** Buildless ES modules, canvas, Node tests, Sites private static hosting.
**Spec:** SPEC.md (same directory).

## Global Constraints
No existing runtime/stage/save/Pages edits; no main merge; #422 untouched; no automatic integration.

## Review Focus
- Blocked drag recovery without teleporting: input tests.
- Mid-drag background/cancel reload retains single Undo: session and DOM tests.
- Gravity relocation with fast/coalesced input: controller tests.
- Corrupt save and Undo poisoning: store tests.
- Edge digits and pointer capture loss: renderer layout and browser QA.

### Task 1: Engine
Files: prototypes/naopoyo-v2/engine.mjs, tests/engine.test.mjs.
Interface: createState(stage), move(state,id,dx,dy)->result, splitCandidates(state,x,y,dx,dy), settle(state), mass(state), validState(stage,state).
- [ ] Write behavior tests with empty implementation stubs; assert conservation, sums, rejections, split ranking, passive gravity, deterministic state.
- [ ] Run tests and observe assertion failures.
- [ ] Implement; rerun node --test prototypes/naopoyo-v2/tests/engine.test.mjs to PASS; commit.

### Task 2: Session, input and save
Files: session.mjs, input.mjs, store.mjs, tests/session.test.mjs.
Consumes engine above. Session(state) owns begin(id,point), travel(point), end(), undo(), retry(). Store pack/restore validates full snapshots.
- [ ] Tests: 1→3→6→7 single drag, k=0 continuation, split/remerge, fast/slow/coalesced equivalence, cancel, whole-drag undo, corrupt save.
- [ ] Observe RED, implement, run all v2 tests to PASS; commit.

### Task 3: Stages and playable UI
Files: stages.mjs, solutions.json, app.mjs, render.mjs, index.html, style.css, tests/app.test.mjs.
Consumes session/store. Browser pointerdown/move/up/cancel/visibility handlers exercise actual session; canvas renderer receives selected ID.
- [ ] Tests: cases present, all solutions rescue, actual DOM event wiring, labels in bounds, multitou​ch ignored, noninterference.
- [ ] Observe RED, implement 16+ comparison scenes, official art, predictive split marks, stage selector/help, retry/Undo, render tests to PASS.
- [ ] Browser QA plus npm test and old naopoyo suite; compare old/new action counts without claiming subjective feel.

### Task 4: Review and delivery
- [ ] Fresh whole-branch review; fix material findings with RED→GREEN tests.
- [ ] Commit/push only new branch, create Draft PR, verify remote HEAD/tree.
- [ ] Package new owner-private Site with immutable official art, publish, verify response/content, record URL and limitations.
- [ ] Final report including all rulings and migration evaluation.
