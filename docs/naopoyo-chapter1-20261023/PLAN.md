# Chapter 1 implementation plan
Spec: user request 2026-10-23, all design/implementation/deployment preauthorized.
Goal: 10 progressively unlocked dog puzzles, isolated from all existing products.
Architecture: immutable #432 base ac9b441c; import WorldSession, v2 engine/input, existing renderer/sprites. New chapter controller, progress store, stage data and UI only. No changes to dependency files.
Tasks:
1. Tests then persistent-ID progress model: monotonic union across tabs, separate boards/hints/story, independent QA key; malformed-save recovery retains progress where parseable.
2. Ten 8x8 stages and engine witnesses: validate mass, all rescue, required gates/merge/split/overflow, Undo and restore, timed input equivalence. Bounded searches distinguish proof from unproven.
3. Chapter UI: existing render/input reuse, story skip/read-once, stage map and next unlock, no wraparound, effect overlay. Private QA page separate from player key.
4. Official 31-family ability inventory and optional isolated spike, no chapter rule changes.
5. Regression, fresh review, push new Draft PR, private new Site packaging/verification.
Review focus: cross-tab stale write; corrupt/unknown saves; reordered stage display; QA contamination; pointer cancellation/reload.
Ruling: User explicitly opted out of intermediate approvals; implement existing approved spec inline.
Ruling: Disk full; use /dev/shm isolated shared clone (source repo read-only), no deleting other work.
