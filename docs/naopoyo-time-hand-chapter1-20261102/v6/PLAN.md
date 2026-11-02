# VERSION 6 implementation plan

Goal: user-specified ten-lesson dungeon, with required mechanics established by exhaustive no-mechanic reachability, not only example paths.
Spec: 2026-11-03 user request (PR504 V6). Preserve D, input, selection, motion, formal chapters, main/Pages, old saves. No mechanics or gates added.
Architecture: existing engine and controls; compact boards and short visible instruction. DFS/BFS observes real engine events; it never modifies gameplay or adds learning flags.

- [x] Task 1: Write no-mechanic reachability test; demonstrate V5 failure. Redesign stages and generate solutions. Require rear spawn, multiple collinear births, clockwise turn, merge, fall, companion support, diagonal spike entry, falling merge; stage10 combines split/turn/merge/fall. Exhausted search only proves impossibility; state cap is failure, never proof.
- [x] Task 2: Surface goal and rule mark in existing information region; remove wall overlay; version new-board saves without deleting V5. Keep all input/animation code identical; compare app with only render text adapter removed.
- [x] Task 3: All witnesses, no-mechanic proofs, state validity/mass, Undo/save/unlock/example DOM, phone viewport/labels and regression. Update same Draft and same owner-private Site. No merge.

Review focus: diagonal alternative approaches; repeated partial splitting; exchanging companion to bypass support; stage starting unsuspended; old save/example positions; short phones and replay layout.

Decision: use a fresh sparse checkout (13MiB initially); no existing Work modified. V5 is git commit f63f463ad1d5aa8b57a0b613206949e1ff0406a1. Read-proof is impossible to infer from play: prove the mechanic is necessary, not that the person read text. All eight directions and repeated moves remain available.

Verification ledger: V5 baseline80; V6 red confirmed09 bypass and hidden badge/black overlay; final98 and DOM pass; formal1529 via targeted missing-fixture reruns; Pages16; browser70/70; independent review clean after02 wording fix. Added exact PR505 tools to satisfy inherited new CI, no runtime changes. Direct Git push lacked credentials; connector commit tree verified equal to local tree. Integration choice was already supplied by user: same Draft and owner-private preview, never main.
