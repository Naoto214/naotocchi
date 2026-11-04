# V4 official minigame preflight — not an adoption report

Inspected main: `81c044a9977dbd013f1632372a72785b540fb463` (2026-11-03).
`quick.js` blob: `2906c37fe9086726085f9b98a7c8d43300b13cc6` (identical to V3 checkout).
`games.js` blob: `fdcf8c5ce6ee7211a28d729bd08af7e1e7a20548` (different from V3 checkout).
No official source was changed or copied into a replacement simplified game.

## Normal-game candidates verified in current source

| Name | Registry ID | Factory line | Base time |
| --- | --- | --- | --- |
| たこやきやさん | takoyaki-grill | 10155 | 24 seconds |
| ライツアウト | lights-out | 7684 | 45 seconds, 5×5 / 3 rounds |
| エアホッケー | air-hockey | 6122 | 30 seconds, first to 4 points |
| かえるのおうちがえり | frogger-road | 5918 | 28 seconds / 3 homes |
| パイプつなぎ | pipe-connect | 7095 | 50 seconds, 6×6 / 2 rounds |

Times are arguments to the official `mgDuration` helper, not measured total handoff/animation time. All factories use live DOM/canvas, animation timers, callbacks and closure state. Source presence and base duration are not evidence that any candidate satisfies V4 adoption requirements.

## Quick candidate architecture

`installNaotocchiQuick(S)` exposes `QUICK_GAMES`, `QUICK_RULES`, `makeQuickRun`. Individual definitions expose official `create(g)` / update / draw / input callbacks; many expose `target()` for testing. `makeQuickRun` owns cues, pointer handling, judgement and result animation. The default solo run is 10 trials and may exceed 30 seconds; do not assume solo defaults satisfy the V4 limit. Reuse the complete official host where possible; any bounded run options must preserve individual game rules and be recorded.

## Remaining adoption gates

1. Isolated host with actual official canvas/symbol assets, input controls, audio, cues and result effects.
2. Same starting seed, fixed difficulty and elapsed-time policy for all participants.
3. No calls to main save/achievement/育成 writers. Do not load `script.js` with a normal main-game localStorage context.
4. Deterministic input/timing journal or equivalent supported snapshot/replay for closure state; preserve pending outcomes after reload.
5. CPU plays the official rules; do not award random pretend scores. Calibrate real score distributions against human QA.
6. Rank ties, one-time rewards, quick-money vs game-growth separation, and resume the original landing player's turn.
7. Browser QA and current-source hash verification before adoption.

Adopted and playable in V4: **0**. The unfinished engine enters `v4-game-request` deliberately; no legacy independent game is selected. The published V3's three games remain intact for its saves and current deployment. Full V4 integration/removal is not complete.
