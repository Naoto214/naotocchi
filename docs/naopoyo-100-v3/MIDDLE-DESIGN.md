# VERSION 3: authored middle replacements

Legacy stage ids and board ids stay stable. The root build may change display order. This change owns only `prototypes/naopoyo-100/v3/middle-stages.mjs`; no engine, input, render, session, tutorial or shared files were edited.

## Board decisions and provisional cognitive placement

Shortest length is verification, not a difficulty score. Human difficulty remains provisional.

| Legacy id | Distinct reasoning | Shortest | Provisional placement |
|---|---|---:|---|
| 03 | Crossed species exits make an actual exchange necessary. | 5 | Introductory: one rule, one spatial conflict. |
| 20 | Place the frog where exchange is blocked by the dog-only gate; the dog stops on ice and takes the downward branch. | 6 | Intermediate: infer a failed exchange as a useful brake, then sequence rescues. More demanding than its length suggests. |
| 42 | Activate toggle on the outward trip, obtain the latch, return around the toggle to preserve the conjunction. | 9 | Lower intermediate: route memory and state preservation. Does not require a second toggle activation in the shortest solution. |
| 51 | Push weight-2 east and weight-1 west onto separate exact-weight plates. Both boxes must remain assigned. | 8 | Intermediate: push-side access, distinct assignments and a simultaneous condition. |
| 54 | Current and wave cross synchronized clock cells within one committed turn. The other fish cannot supply the missing clock tick after a failed crossing. | 5 | Lower intermediate conceptual demonstration, suitable earlier than late-game 54. No claim that five steps is hard. |
| 70 | After splitting, the child activates a latch and each actor supplies clock ticks for the other. Rescue itself can be the final useful tick. | 11 | Upper intermediate: role separation, timing, order and the cost of rescuing the helper too soon. |
| 78 | The dog uses a temporary floor as support and crosses the held door; the collapsed floor becomes the frog's downward passage. | 7 | Upper intermediate: irreversible order and two uses of the same cell. |
| 83 | The small key-holder must eventually leave its latch and traverse the same door as the parent. | 14 | Intermediate: retained state and temporary roles. Walking length alone does not justify very late placement. |
| 89 | Conditional wind sorts the small child into a directed key route while the large parent stays on the upper route. | 11 | Intermediate: conditional routing and role allocation. Wind is encountered on every actual winning route; deleting it creates a different, slower walking puzzle. |

## Verification evidence

All nine replacement witnesses were recomputed by breadth-first search using the existing `gameMove`; each search returned `shortest`. Every witness passed normal replay and replay after the existing serialize/deserialize round-trip. Search cap: 50,000 expanded states, maximum depth 40 for shortest and deletion searches. None reached either cap.

| id | Expanded states to shortest | Event / operation forbidden | Result, fully exhausted states |
|---|---:|---|---:|
| 03 | 17 | Any species swap | exhausted, 10 |
| 20 | 31 | Any frog move before dog rescue | exhausted, 3 |
| 42 | 24 | Toggle A activation | exhausted, 4 |
| 51 | 111 | Push crate A / push crate B | exhausted, 60 / 48 |
| 54 | 10 | Wave effect | exhausted, 18 |
| 70 | 413 | See clock counterfactual below | — |
| 78 | 31 | Hold activation / crumble event | exhausted, 31 / 8 |
| 83 | 2637 | Latch A activation | exhausted, 780 |
| 89 | 204 | Wind effect | exhausted, 174 |

The forbidden-transition searches used unmodified game physics and rejected transitions only after an event / operation predicate matched. They deduplicated using the existing `stateKey`, with a 50,000-state cap and no depth cap; every listed result exhausted its reachable state graph.

Existing owl boards 73 and 81 were also checked without changing them. Forbidding the `companion` event exhausts 40 and 324 states respectively: both already require the owl interaction. No NPC was added.

## Counterfactual interpretation

Removing a feature is a different question from banning its use on the actual board. Removal can unlock a route, change the available clocks, or remove a forced movement. We report both without treating every counterfactual as a formal necessity proof.

| id | Deleted tiles | Result |
|---|---|---|
| 54 | `field.wave` | exhausted, 48 states; no solution |
| 70 | Both `fixture.phase` tiles | shortest 10, 230 states, versus actual 11; actor interleaving no longer has the same clock constraint |
| 78 | `fixture.plate.hold` | exhausted, 33 states; no solution |
| 83 | `fixture.latch` | exhausted, 1000 states; no solution |
| 89 | `field.wind` | shortest 13, 395 states, versus actual 11; wind is a forced routing interaction, not required for solvability after deletion |

The formal engine event named `phase` denotes a condition-gate crossing, not a clock-fixture timing event. Clock reasoning above is derived from `fixture.phase` board state and transitions, not that event name.

No uniqueness, human enjoyment, or calibrated difficulty guarantee is claimed. These are finite-state bypass checks and design judgments. Fixture overlays are limited to supported different layers (for example water + wave + clock, or ice + species gate); directed-route arrows and latch fixtures are on separate cells.
