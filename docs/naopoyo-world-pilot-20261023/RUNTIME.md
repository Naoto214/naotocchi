# Runtime contract / decisions

## Dependency and protected assets
Base #428 `f8094cd70be7eae052a84e228c4e0f9dadfef2cc`. Main observed `3d7a9e0812deb41eb7c2bb5196af1d14dbf01d81`. #418 merged; #422 open Draft at `88ab41e1fd1fdd8f4b1b33528e157b7e96fba444`, #428 open Draft. New branch only. No prior PR ref or Site is updated.

Reuse: import v2 move/enter/splitCandidates/settle. New branch adds optional policy and exported externalMove/externalSplit entry points to v2 engine (19 added / 6 changed lines). This is **not a byte-identical v2 engine in the new branch**, but v2's default calls and 156 tests are retained. Do not claim that the new branch changes only new files. Existing #428 engine remains untouched on its own ref. No second additive/split/gravity engine exists.

## Clock and ordering
- Integer game time milliseconds. advance(0..60000) is explicit; wall-clock, random, Date.now are never consulted by rules.
- Each millisecond: waves ordered by ID; each wave processes actors front-to-back along force vector, ID tie-break; each accepted move performs v2 enter/merge/spike/exit and gravity to completion. Then beam IDs, then actor IDs; split and gravity to completion.
- Player input uses the current game time. Pointer event arrives before/after a frame according to browser event delivery. Replay requires the recorded game time, not just wall-clock delay. If events share a time, autonomous advance is completed before the following explicit player command.
- Wave phase: warn, on, off. One push per wave onset and initial actor. No new child re-enumeration in that wave. Rock, gate, guest, water restrictions apply; eligible contact merges. Active actor ID is preferred by v2 merging even when pushed into by another actor.
- Beam phase: warn, on, off. Active tiles are checked during advance and after accepted player moves, allowing mid-beam entry. Per-irradiation actor IDs and children prevent immediate duplicate splits. No death/HP.
- Fish water eligibility is a stage policy used by enter and split BFS. No nonfish push, fall, or child allocation into water. Future aquatic species can be added to stage aquatic list; engine's known-species validation must also be extended when adding a new principal species.
- Current is a separate terrain-trigger proposal, not implemented. Wind can share the force event API but is not shipped.

## Continuous input
Reuse v2 chamfered enteredCells geometry. Keep pointer-cell cursor separate from actor logical position. Wave/beam update actor position without consuming pointer cells, clearing pointer capture, or ending the gesture. The next intended pointer cell gives one relative direction from the actor's new position. High-speed paths pass through the same cell-intent filter. The enlarged character is lifted above its logical foot ring.

## Undo, pause, restore
A held drag snapshots the entire state + time + fired cycles + irradiation hits. Every autonomous event between pointerdown/up belongs to that one gesture. Idle mutations have their own snapshot. Undo restores all fields then **pauses**, so an event at t+1 cannot instantly undo the Undo. Resume explicitly with ▶. Retrying restores the initial state/time. UI dialogs, page hidden, pagehide, user pause, layout comparison pause time. Hidden duration is not accumulated. A visible stall contributes at most100ms per frame; this is intentional slowed game time, not catch-up.

Save key `naopoyo.world.pilot.20261023.v1` and version1. It stores current and last80 snapshots; save during drag also preserves the pre-drag snapshot. Restore validates v2 invariants, fixed water/guests/events/aquatic settings and actor eligibility. Storage failures show a message; play can continue in memory. Retry does not touch any original key.

## Review rulings
Independent read-only review reproduced three Important issues, all fixed with tests failing before fix and passing after: automatic event replay after Undo; deferred chamfer pointer entry; impossible terrain/changed aquatic rules in save. No cosmetic work was required by review.

## Deliberate limitations
E is a comparison prototype with nonoperable official guests, not a completed large boss battle. Guest moving/rescue-goals/two-actor switches are design-only. No current/foam/ice/wind/warp yet. All five shipped levels currently use no gravity; gravity interactions are verified in synthetic runtime tests and existing v2 scenes. Eight-by-six control is a static cropped layout comparison, not a conversion of existing levels. iPhone Safari device behavior, address bar/safe area transitions and enjoyment require user QA.

## Parallel work observed
Open PRs include #429 Conversation postgame Pilot, #426 living Home, #425/#424/#423 quick games, #408/#409/#407 CARD GAME, #427 earlier v2, #422 expansion. This branch does not import or alter their work. Three unrelated untracked postgame files appeared in the local checkout; they were left untouched and never staged. Remote main remains outside this task's write scope.
