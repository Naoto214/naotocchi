# Response input safety — 2026-10-19

## Stage 1 checkpoint

Base PR #398: f3c7e9fdd807b09e4fc6cfc10ca7a2c7a4eb5f49 / tree e44f638e170d8e09d16095af2a90c669a8203ffe.
Remote main: fe6fd8a308df5ff0147d00bc0b6abd2ff0fceca7. No merge or Pages changes.

The document click handler formerly looked up actions from the current projection, without binding the initiating gesture to its rendered UI. Response and normal end-turn both used kind=pass in the same visual slot.

- UI-local generation + session object + revision + viewer tickets; disconnected nodes are rejected.
- Capture pointer/keyboard start before click; consume once; reject retargeted and pre-render gestures.
- New accessible clicks remain available; browser multi-clicks cannot activate end-turn.
- Response (blue, left) and end-turn (gold, right) have permanently separate slots. No timer or confirmation added.
- Existing engine revision validation remains the final boundary. No state/schema/engine/CPU policy changes.

Evidence: cpu-evidence/response-input-20261019/. New tests fail before the fix (5/5), then pass (5/5). Full CARD GAME baseline: 313/314 pass. Stage 1: 318/319 pass. The only failure in both is `regeneration is deterministic and read-only in check mode`: existing `Cannot find current array FUN_ITEMS`. No audit originals changed.

Browser/Safari touch geometry has not been validated in this environment. iPhone portrait/landscape rapid-tap QA remains required.
