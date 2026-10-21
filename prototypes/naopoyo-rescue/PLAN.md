# Rescue Implementation Plan
> Use superpowers:executing-plans. User authorized design choices and continuous implementation.
Goal: independent playable 10-stage rescue prototype.
Architecture: pure engine, declarative stages and solutions, Canvas renderer, pointer input and isolated store.
Tech: buildless ES modules; node:test; Sites owner-private.
Spec: SPEC.md
Constraints: only prototypes/naopoyo-rescue added, no main merge or existing save access.
Review focus: pointer cancellation, blocked fast swipe, corrupted saves, gravity cascade, Undo after clear.

1. Engine: engine.mjs exports createState(stage), move(state,id,dx,dy), release(state), mass(state), complete(state), validState(stage,state). tests/engine.test.mjs pins merge, split, collision, gates, gravity, mass. Run RED then GREEN.
2. Levels: stages.mjs exports stages; solutions.json contains per-level [{id,path:[[x,y],...]}]. Replay uses exact engine moves/release; all ten must clear and conserve mass on every move.
3. UI: index.html/style.css/app.mjs + input.mjs/store.mjs. Test path interpolation and store validity first. Canvas interpolates actors separately from logic. Pointer capture, multitouch exclusion, cancel, keyboard arrows, undo/retry, hints, progress/save. Browser QA at mobile viewport.
4. Verify: regression growth-clear/slide08 tests, root baseline limitation recorded, full new tests, fresh review. Save branch/Draft PR through GitHub; package/deploy private Site, record HEAD and evidence.
