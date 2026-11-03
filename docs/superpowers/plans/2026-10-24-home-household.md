# 最大28体ホーム統合 Implementation Plan

> Execute inline with superpowers:executing-plans. User authorized design, implementation, tests, feature push and private preview without intermediate approval.

**Goal:** Acquired companions (26), current partner (1), protagonist (1) coexist in the shared terrain Home.
**Architecture:** Separate household rendering from the existing single visit event. Keep homePresent* as event/speaker eligibility and introduce homeResident* only for rendering. Reuse cast-layout alpha bounds and attachment frames, terrain navigation, official expression and Motion systems. Visual autonomy never emits gameplay/conversation initiatives.
**Tech stack:** Existing buildless JS, DOM 2D art, shared Meguru terrain, Node runtime harness.
**Spec:** User's 24-section handoff in this task; detailed decisions below.

## Global constraints
- No main merge/push, no Pages deployment. Continue Draft #426 and existing owner-private Site.
- No save/schema/recruitment/romance/conversation text, frequency, selection or event-budget changes.
- No invented residents; deduplicate canonical IDs without modifying source entities.
- Current 1–5 actor size retained where space permits. Larger households use depth bands and adaptive body size; overview reduces scale, selection has visual emphasis and a readable name.
- Terrain collision/pathfinding, environment animation, hidden pause and reduced motion remain active.
- Browser emulation is not iPhone Safari verification.

## Design choices
Old semicircles remain the non-terrain fallback; reusing their exact placement on terrain conflicts with obstacles. A camera-only zoom makes the whole world and UI harder to read. Choose terrain-aware seating with count-dependent scale and staggered depth bands, plus an optional overview. Keep all residents present in both modes.
Small groups keep existing autonomy. Medium groups have at most three ambient walkers, crowded groups two; other actors rest, look, turn or face a neighbour with staggered timings. Explicit player movement retains priority.
All conversation functions continue to see only the existing visitor. A visitor already in the household receives the existing reaction and banter, never a second actor. Visit end affects event eligibility, not residency.

## Review focus
Canonical aliases/duplicate old-save IDs must not duplicate DOM actors; departure while selected clears selection; visit expiry cancels banter without deleting resident; 320px short screen with 28 actors remains selectable; background return cannot advance autonomous time or visits.

## Tasks
- [x] 1. Record baseline and historical cause; add runtime tests for 0/1/5/13/20/26 companions, partner, departure and visit lifecycle. Run RED; implement homeResidentCompanions/homeResidentPartner render projection; run GREEN.
- [x] 2. Add crowded layout and autonomy tests (all widths, 60s/10min, no state writes, walker cap). Run RED; implement layoutTerrainCast depth seating and model pacing; run GREEN.
- [x] 3. Add overview and interaction regression; implement view control, selection name, bounded redraw work, retain masks/attachments and speech anchors. Run focused suites.
- [x] 4. Check unchanged rule modules; exercise real visit banter and all44 specific reachability, save/load, regional recruitment, romance, expression/motion suites. Run npm test and record all failures.
- [x] 5. Browser QA at 320/375/390/430 with real terrain, 28 actors, 60s and hidden return. Save images/metrics, compare old26 and v9. Fix observed issues with regression tests.
- [x] 6. Independent final review; refresh hashes/package; commit/push feature only, update existing private Site and Draft #426 with measured results and explicit device limits.

## Ledger
- Baseline f7f192ea / main e7fef44b confirmed remote. Focused pre-change49/49 pass.
- Cause confirmed in PR382 commit6a56ce9e (merged faeee72c): render functions replaced state.companions/partner with homePresent* filtering homeVisits.current. PR253 merge77b1ea5c supplied alpha-bounds/attachment-aware layout reused by current solver.
- Workspace: isolated local shared clone. Initial overbroad sparse checkout exhausted capacity; only newly cloned prototype copies removed, Git-tracked source reset before edits. Existing checkouts untouched.

- Final focused101/101, expressions/conversation192/192, protection191/191, cache integrity6/6 PASS. Broad initial suite2878/2901 passed; restored sparse QA inputs and reran failed suites with concurrency2 (680/681, final missing source metadata resolved in focused101). Logs retained.
- Independent review found/fixed short-stage scale, stationary speech offset and mask resize cache; RED/GREEN regression evidence recorded.
- Browser: actual forest28 over75 seconds, 320/375/390/430 layouts, actual v9 visitor2 after371 seconds, PR253 exact-solver reconstruction. No iPhone/WebGL performance claim. One earlier green-only background observation retained as long-device-QA risk.
