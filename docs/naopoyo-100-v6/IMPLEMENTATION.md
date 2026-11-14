# VERSION 6 Implementation Plan

> For agentic workers: use superpowers:executing-plans task by task. User approved proposal A and F1/F2/D1/D2 on 2026-11-15 JST; do not request design approval again.

Goal: extend the accepted V5 editor and add isolated ability comparisons.
Architecture: V6 imports V5 art/catalog/styles and canonical engine/input/presentation. A strict V6 document adapter validates 31-species stages without aliasing unknown species. Separate experimental lab modules never enter formal play or storage.
Tech: buildless ES modules, Canvas, Node tests, existing BFS/Worker, owner-private Sites.
Spec: PROPOSAL.md, approved A by user; this plan resolves implementation details within that approval.

Global constraints: preserve V5 hashes, 76 IDs, 8x8 CSS geometry, official engine/input/save/assets, V3 100+8, Draft/base. No merge/public Pages. Stage commits/push only after tests.
Review focus: editing incomplete linked stages; moving instance IDs without dangling links; validation/import bypass; stale async solve results; Undo/Redo/play-history isolation.

- [x] 1 Research, a6e0248.
- [x] 2 Settings. v6/settings.mjs exports fieldsFor, cellItems, updateItem; model.mjs exports createDraft/edits/structuralErrors/validateDraft. editor.html uses V5 CSS and unchanged header geometry; editor-ui.mjs adds explicit inspect/apply controls. settings.test: crate weight separate, ignored params rejected, stable links, invalid move atomic. RED then implement then full regression/commit/push.
- [x] 3 Characters. characters.mjs registry31x8; character-art.mjs loads canonical PNGs. render.mjs draws formal actors through V5 renderer and extended species through the same layout metrics. model validates 31 actual identities; no proxy species. Tests: accepted four use formal validation, all31 retain IDs/paths and no abilities. Commit/push after regression.
- [x] 4 Verification. validation.mjs + solver-worker.mjs use canonical solve/search; status mapping plus selected effect ban. editor shows ruleset, witness playback and cancels/discards old results. Tests: solved/exhausted/limit/invalid and bypass witness. Commit/push.
- [x] 5 History/storage. history.mjs with apply/undo/redo; storage.mjs versioned named drafts and safe V5 explicit import. Structural validation permits incomplete legal-edit states; play validation remains strict. Tests: branches, play isolation, malicious imports, incomplete save roundtrip. Commit/push.
- [ ] 6 Flight. flight.mjs immutable F1/F2 moves and transform using candidate current species/stage; labs common render/history; same-board two-actor cooperation, wall/wind/landing. Tests and BFS witnesses/bans for both methods. Commit/push.
- [ ] 7 Dig. digging.mjs immutable D1/D2, role-qualified digging, rock/soil/crate settling/order. Reuse lab history and V5 art. Tests + solution/bad-order witnesses; persistence/Undo restores topology. Commit/push.
- [ ] 8 QA. Add native Canvas and synthetic real-handler checks; use browser only when supported tools exist. Fresh V3 shortest audit, Pages check with required files, whole-branch independent review, CI. Package preserves V3/V5 bytes, deploy existing owner-private Site, record results/URLs/HEAD. Commit/push.

Common test command: node --test tests/puzzle-*.test.mjs prototypes/naopoyo-100/tests/*.test.mjs prototypes/naopoyo-time-hand-chapter1/tests/*.test.mjs prototypes/naopoyo-100/v4/tests/*.test.mjs prototypes/naopoyo-100/v4/v5/tests/*.test.mjs prototypes/naopoyo-100/v4/v6/tests/*.test.mjs
