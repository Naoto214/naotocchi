# Rescue execution ledger
Base a037b3abe4f97b6e9bfb4838e854161c53ece6ba. PR405 a3df3cad7bd8ff70d00460045f0b808cacaca260 remains untouched.
Ruling: fixed grid + interpolated Canvas chosen over physics; predictable touch/Undo. Cost: no freeform motion.
Ruling: downward gravity with supported 1-step climbing; rotation deferred. Cost: prototype tests only this movement rule.
Root baseline: npm test fails ERR_MODULE_NOT_FOUND character-3d/runtime.mjs in sparse checkout; not a green full suite.
Task 1 complete: pure engine, 8 rule tests green; tests originally failed missing module before implementation.
Task 2 complete: all ten saved solutions replay legally, clear and conserve mass each move.
Task 3 complete: pointer interpolation/store tests + Canvas UI; 390px layout and drag/Undo/reload observed in cloud Chrome.
Review: fresh reviewer found save index coercion / gate boolean / impossible occupancy. Reproduced with failing tests; fixed boundary validation. 24/24 now pass.
Minor deferred: renderer reuses animation positions across stage/retry; brief visual easing only, logical position correct.
Pointer cancellation and multi-touch remain iPhone real-device QA items; cloud drag, Undo, save/reload checked.
Existing regression: 95/95 growth-clear + slide08 tests after checking out growth-chain dependency.
UI update: plan UI-PLAN.md. Shared condition contract, one-cell guardian/gate vs hexagonal rescue exit. Stage/input/save files unchanged.
UI tests: 81/81; existing 95/95. Fresh review: no important blockers; minor overlay/reduced-motion live changes documented in UI-REPORT.md. No new gameplay/legacy changes.
Release migration design saved in RELEASE-PLAN.md; public hub/allowlist/save keys read, no writes to these files.
