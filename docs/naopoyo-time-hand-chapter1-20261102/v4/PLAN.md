# VERSION 4 — residual restoration

Carry forward V2/V3 audit and fixes; do not repeat the 30-item audit.
Start: PR504 15153527c228b090e630cfbfefa6ab82bb8ac120, main/base aafe4abe7842b2fcf57060b207500e5b24f6c7a0.

- Extract existing formal chapter1 actor/effect painters and chapter2 motion-frame construction without changing their default output. Import these into the D adapter. Preserve chapter1 1.2 selection geometry; use the formal contact trajectories, queue, gate occupancy/pulse, timing and rescue completion order.
- Keep tap-selection priority and empty-cell taps. Separate remembered tap target from held visual state; release capture/redraw on end, no initial automatic selection.
- Preserve complete move results for replay (including overflow); show animation before post-move state, no next-actor enlargement during replay.
- Restore explicit completed-stage revisit to retry, without resetting restored history on startup. Keep board/solutions/engine/save schema and key unchanged.
- Restore formal example dialog layout/control placement using shared formal markup/CSS with D session adapter; keep approved removal of coordinates/selection rectangles.
- Regress all 10 witnesses, V2/V3 saves/Undo, numerical drawing output, motion timing, selection release, completion order and replay isolation. Browser access failure from V3 remains a limitation; do not bypass access control.
- Push only existing Draft PR504 with expected HEAD check. Publish same owner-private Site as V4, verify delivered hashes. No main merge/production Pages update.
