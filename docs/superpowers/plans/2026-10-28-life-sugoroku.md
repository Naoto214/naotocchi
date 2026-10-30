# 人生すごろく implementation plan

Goal: iPhoneで最後まで遊べる、本人専用の独立人生すごろく。
Architecture: buildless ES modules; deterministic command/state engine; 48-node explicit graph; master-backed read-only character adapter; isolated versioned localStorage. UI uses the same commands as CPU simulation.
Spec: ../../life-sugoroku/SPEC.md (user's 24-section request is binding).
Execution: inline, user explicitly authorized design decisions and all work through private publication/Draft PR; no intermediate approval. Final independent review.

Global constraints: no main merge, Pages deployment, main save writes, existing runtime edits or changes to other PRs. Four participants with1–4humans,10/15/20rounds, stage1–8, score0–100, no debt, rank sodachi then money.

Review focus: pending action double submission; corrupt/restored saves; cross-origin import; hidden CPU knowledge; mobile narrow view/reload during minigames.

- [x] Task1: asset audit/spec and tests for board,46events, invariants, snapshots, time operations. Run tests RED before engine.
- [x] Task2: engine.mjs/data.mjs implementing createGame/dispatch/cpuAction/rank/serialize/restore. Pure deterministic state with pending movement/event/minigame, command revision guard. Verify all modes/seat counts,graph traversal,item/time boundaries,round order.
- [x] Task3: adapter.mjs and main.mjs/style.css/index.html; import identity only,75master choices; board pan/zoom,branch,events,3real minigames,result/history. Add adapter/storage tests before implementation.
- [x] Task4: fixed-seed100smoke then≥1000matches; frequency and rewind comparisons; collect stats and tune within user policy. Run full repository suite.
- [x] Task5:320/375/390/430QA,independent review,fix critical issues,GitHub commit/push/Draft PR,owner-private Site publish.

Interfaces: data exports BOARD/EVENTS/ITEMS/SCHEDULE; engine exports createGame(options),dispatch(state,command),cpuAction(state),rank(state),restore(json),serialize(state); adapter exports catalog(master),importPet(text,master),imageFor(character,stage).

## Execution ledger
- Resumed existing isolated worktree work/life-sugoroku-20261028 at main85a59bb3; no new project or discarded prior code.
- Task1–3: prior RED logs retained in previous workspace; expanded event/time/item/input/storage/minigame/render tests in current session.
- Ruling: native inline execution continues under user blanket authorization; no intermediate permission gate.
- Ruling: retire daily +1; initial100matches had30.5% cap. 20round growth normalization addresses45.25% pre-adjustment cap.
- Ruling: CPU easy fixed parity made routes predictable; changed to seeded public-state hash; reduced mini skill gap.
- Final review: independent reviewer completed. Both P2 findings reproduced RED and fixed GREEN; see REVIEW.md.
- Visual QA blocked by browser transport timeout, including a reset attempt. Node render tests are not visual QA.

- 2026-10-28 follow-up: cloud Chrome recovered. 44 width checks, pointer input for all3 minigames, pending event/result reload, rewind and album UI verified. QA harness now uses one iframe. Screenshots and browser-layout.json retained. Actual iPhone Safari and human full-match duration remain unverified; QA.md distinguishes them. Published game source unchanged.
