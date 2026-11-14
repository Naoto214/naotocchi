# VERSION 3: late-stage design and evidence

`prototypes/naopoyo-100/v3/late-stages.mjs` exports four complete replacements with stable internal IDs 93, 98, 99, 100. Original top-level field shape, 8×8 boards, actor species, movement engine and save contract are preserved. All coordinates below are zero-based. No shared engine, render, input, UI, session, tutorial or formal asset was edited by this work.

## Before and after

| ID | Baseline weakness | VERSION 3 reasoning |
|---|---|---|
| 93 | The toggle stayed on, and the supplied solution never used the advertised permanent latch. | The small actor must hold a remote plate while the larger actor crosses the ice and activates the permanent latch on the far side. Only then can the holder leave. The two inputs now have different necessary jobs. |
| 98 | The lower corridor bypassed the advertised door, and the wave could be skipped. | Two floor cells are closed. The wave cell can only be entered on its active third phase; both fish must experience it. The exit clock has a different two-phase period. |
| 99 | The hint said to send the large actor first, but the supplied solution sent the frog first and included extra split/remerge work. | The frog occupies the one-way transport destination. This deliberately prevents the first dog from teleporting, letting it reach the local latch beyond the entrance. The frog then clears the destination; the two dogs cross separately and merge afterward. |
| 100 | Another split → key → door → eventual merge sequence, with a phase gate adding turns. | No spike. Preserve the dog1 until the left owl meeting; form 3 from 1+2; push the weight2 crate upward onto its plate; send the frog through its species-specific burrow while both dog3s use their exact3 corridor; complete a second owl meeting before merging3+3 into6. |

93 retains an established split at the start, but its essential inference is transferring a temporary obligation to a permanent one. 99 and100 use no split, removing that repetitive late-stage template.

## Exact verification on final replacement boards

All movement and state transitions use the shared `gameMove`; solutions are produced by the official `solve` / `findWitness` and checked by `replay`. No alternate physics was implemented. `findWitness` was used during development of100; the delivered final solution was subsequently proven shortest by breadth-first `solve`.

| ID | Official result | Moves | Expanded / discovered | Search settings |
|---|---|---:|---:|---|
| 93 | shortest | 12 | 725 / 883 | limit30000, maxDepth90 |
| 98 | shortest | 15 | 9672 / 11424 | limit30000, maxDepth90 |
| 99 | shortest | 13 | 363 / 397 | limit30000, maxDepth90 |
| 100 | shortest | 21 | 90987 / 94308 | limit200000, maxDepth90 |

The following searches explore legal moves using shared `gameMove`, rejecting transitions with the named event. `exhausted` means every reachable state under that restriction was visited, not merely that a search cap was reached. These tests establish necessity within the implemented rules; they do not prove human difficulty or fun.

| ID | Forbidden transition | Result | Expanded states |
|---|---|---|---:|
| 93 | latchP activation | exhausted | 764 |
| 98 | any wave effect | exhausted | 10986 |
| 98 | latchT activation | exhausted | 2226 |
| 99 | latchL activation | exhausted | 66 |
| 99 | any merge | exhausted | 325 |
| 99 | eastward entry into the burrow while its destination is occupied | exhausted | 51 |
| 100 | left owlO companion event | exhausted | 33112 |
| 100 | right owlQ companion event | exhausted | 79418 |
| 100 | any crate push | exhausted | 7984 |

The occupied-target test for99 tests the non-transport action, not just whether a successful transport appears in the supplied solution. The stationary frog is therefore a necessary physical blocker in at least one action on every winning route. It is an ordinary movable frog, not an owl.

The100 owls are `npc.owl` tiles at(3,3) and(7,3), never actors or selectable units. Each requires the specified dog visitor and a cardinally adjacent frog. Both companion events are essential by exhaustive exclusion. The final solution contains both meetings, one upward crate push, the frog's burrow event, a merge into3, and a later merge into6.

Two deliberate wrong choices in100 were also checked. Taking the legal initial dog3→dog2 contact creates5; official `solve` exhausts7912 states without a win. Moving the initial dog3 right twice legally pushes the crate right into its dead corner; official `solve` exhausts22830 states without a win. These are real irreversible planning costs, not longer detours. Those post-choice probes reconstruct the unchanged board with the resulting actors/crate position; both choices precede any control activation, so no flag state is omitted.

During design, a previous100 plate position was adjacent to the doorway and allowed an actor to replace the crate. A no-push probe found the bypass. The final plate is at(3,1), and the final no-push proof above supersedes that discarded arrangement. Earlier witness counts and probe limits for discarded boards must not be reported as final evidence.

## Human difficulty assessment

100 is the strongest of these replacements by the number of interdependent irreversible decisions, not by its21 moves: retain the first visitor, select the1+2 combination, choose the box push direction, use species-specific routes, preserve the second visitor, and postpone final6. The correct large-scale order is only partial: box preparation and frog transfer can interleave after the first meeting. The design does not falsely claim one unique full move sequence.

99 has a compact13-move solution but a substantial reversal of the usual teleport rule: success first requires transport *not* to happen. 98 asks for two periodic conditions and a forced chain;93 asks for a handoff rather than a permanent toggle. Suggested relative placement is93 below98/99, with100 last. Exact relative human difficulty of98 versus99 is provisional.

The eight-axis editorial suggestions, on1–5 scales in the project's order (discovery, inference, split/merge planning, combinations, foresight, uniqueness, clarity, busywork), are:93 `44344441`,98 `44344431`,99 `55445441`,100 `55555531`. These are author judgements, not measured player scores. The low clarity score of100 acknowledges its dense combination; the concise hint explicitly identifies the role transitions.

90–92 and94–97 were inspected and their supplied solutions replayed. They were retained to avoid replacing a functioning puzzle with an unverified redesign. 94 already has necessary strength creation and box assignment;97 already defers the final merge until its sequence is complete. The more transport-focused90,91,95 should not be described as definitively harder than every earlier puzzle merely because of their numbers. A complete monotonic human-difficulty claim still requires playtesting. 97's numeric hint labels can be read as sequence steps rather than actor levels; a clearer editorial version is:「番号1の板には1、番号2には3、番号3には1。合図を終えてから二人の1を2にする。」

## Reproduction and limits

Development utilities are `v3/scratch-late.mjs` (authored candidates), `v3/scratch-probes.mjs` (event-restricted reachability through shared physics), and `v3/scratch-export-late.mjs` (exporter). These scratch utilities are not a production runtime dependency. The exported replacement module contains literal final boards and solutions and imports nothing.

Final legality, shortest-path and exclusion results above completed without hitting their limits. Browser layout and render review belongs to the main integration pass; the98 wave/phase shared cell uses existing layered rendering and introduces no new art or engine rule. Real-player uniqueness, readability and enjoyment have not been experimentally established.
