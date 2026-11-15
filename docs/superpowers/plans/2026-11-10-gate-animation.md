# Gate A animation Implementation Plan
> Execute inline with executing-plans; final independent review.
**Goal:** Approved A arch with shared 280ms open/close presentation.
**Architecture:** Optional opening/glow on original painter; visual-only GateTransitions; common paintGate entry across prototype and atlas. Engine and saved board data unchanged.
**Tech Stack:** ESM, Canvas2D, node:test.
**Spec:** ../specs/2026-11-10-gate-animation.md
## Global constraints
Owner-only PR535, no merge/Pages. B preserved. Unmodified default paint operation trace. No animation wait in physics. Reduced motion snaps, no flashing.
## Review focus
Rapid reversals continuous; Undo/reset clears stale motion; selected vs mismatched actor does not authorize passage; occupancy doesn't alter rules; 36px/48px digits stationary and readable.
## Tasks
- [x] Pin original painter traces, test 280ms/reverse/reduced/occupancy and instant physics; implement shared transition and opt-in painter.
- [x] Wire presentation/render and all atlas gate surfaces to A; keep B archive comparison; add 3-state interactive 36/48px preview with condition controls.
- [ ] Run regression, inspect browser, review, document, update PR and same owner-private Site.

## Verification ledger
- 204 Node regressions pass after the independent review fix pass.
- Original default painter traces match; gate source is the sole intentional reference hash update.
- Reviewed fixes: atlas RAF lifecycle, book redraw, outward membrane panels.
- Chrome UI: 320/375 widths, 36/48 tiles, condition toggles, stage 07 split/pass/Undo, atlas A. iPhone Safari remains a real-device check.
- Evidence: docs/naopoyo-100-v2/GATE-ANIMATION.md and gate-animation-preview.png.
