# VERSION 3 minigame audit and isolated adapter

Audit date: 2026-10-30. This document distinguishes official rules, shortened adaptations, and independent games. It does **not** claim that the three old Naokoro games were the latest official games, or that full official games have been embedded.

## Audited source

| Source | Revision / object | Relevant implementation |
|---|---|---|
| Latest inspected `origin/main` | `851cf09a80c7ed41ba7293888084272917e4582c` | Release #484; read using `git show`, no merge |
| Official `games.js` | blob `fdcf8c5ce6ee7211a28d729bd08af7e1e7a20548` | Lines 3069–3287 real fishing; 7675–7730 Lights Out; 8181–8236 memory cards |
| Official `script.js` | blob `43303e7e023b40184173e5a81d4cbefae48d6fb9` | `mgDuration` 2945; record 15866; session wrappers around 16955; finish 17115/17165 |
| Naokoro audit baseline | commit `07c583b8912795585ea7a6ec38265955db0e52f7` | `engine.mjs` lines 51–70, 100–111; `main.mjs` lines 73–85 |
| Baseline `engine.mjs` | blob `0a090d6c9f923fdedc0b97c9ff2aff4648c470d1` | Independent rules, CPU score and snapshot validation |
| Baseline `main.mjs` | blob `cf408b5bcce7d59c96135ff484ccb567150d593a` | Presentation, host timers and controls |

Line numbers above refer to the pinned versions, not moving working-tree line numbers. `games.js` differs between baseline and current main (376 additions/169 deletions). Its shared duration policy, timer HUD, participation and versus scoring helpers have changed. In the two relevant puzzle factories the inspected diff adds the timer HUD; their core score formulas and pair/toggle rules are retained. A wholesale copy of baseline `games.js` would therefore not be a latest-main synchronization.

## Current three games versus official games

| Baseline mode | Baseline behavior | Latest official relation | V3 decision |
|---|---|---|---|
| 0 `ひかりをキャッチ` | Wait 1200–3400ms, one green-signal tap; early=0; `round(100-ms/10)` clamped 0–100 | No equivalent one-tap reaction game found in official registry. `real-fishing` has reaction as one part of cast/wait/hook/reel, tension and fish-value scoring | Preserve explicitly as **なおころ独自・反射ミニ**; never label official fishing |
| 1 `おぼえて、ぽん！` | Show five symbols simultaneously for 4s; recall their order; each correct position=20 | No Simon/order-memory factory found. Official `memory-cards` is pair matching, not sequence recall | V3 changes to an explicit 4-pair short adaptation of official memory cards; V2 saves continue sequence recall |
| 2 `まどあかりパズル` | 3×3, one board from three distinct presses, 20-move cap; clear=`100-5*max(0,moves-3)-floor(elapsed/5000)`; unsolved=0 | Official `lights-out` has same cross-toggle operation, but 5×5, three boards, duration and minimum-press efficiency score | V3 retains short 3×3 but computes actual par and applies official-derived efficiency scoring with a disclosed one-board normalization |

The current three games are **independent simplified variants**, not imported official game instances. V3 contains two **shortened rule adaptations** plus one independent reaction game. This is the accurate release language.

### Official reaction-nearest game is unsuitable as a drop-in

`makeRealFishingGame` (3069) has ready/cast/wait/fight phases, hold-to-charge cast, bait depth and fish movement, strike windows, reel tension, escape conditions and multiple catches. Its default duration is `mgDuration(round(lerp(28000,24000,difficulty)))`. Its score is rounded `clamp(18 + fishPoints*1.2 - escaped*4,10,100)`. A single green-signal tap would discard almost all of this game. The historical comment at 1105 about waiting/reaction is not the authoritative implementation. No fishing code or identity is claimed for V3 reaction.

### Official memory cards

- A 4×4 board, eight pairs, default `mgDuration(45000)`; two cards open, matching pairs remain, mismatches close.
- A third card cannot open during either pair outcome. A match resolves after 350ms; mismatch visual closes after 800ms and the input lock ends after 900ms.
- Official deck uses randomized sort with `Math.random`; the short adapter instead uses seeded Fisher–Yates for deterministic replay.
- Official finish formula: `eff=clamp(1-max(0,tries-PAIRS)/(PAIRS*1.6),0,1)`. All pairs: `clamp(round(42+eff*50+max(0,60-elapsedSeconds)*0.13),42,100)`. Incomplete: `clamp(round(10+matched*7),10,45)`.
- V3 has eight cards/four pairs, four columns/two rows, 30 seconds of active play. It uses that formula with `PAIRS=4`, so an incomplete board can score 10/17/24/31, while completion is at least 42. Perfect quick play can reach 100. This is not a claim of score equivalence to playing eight official pairs.
- V3 keeps mismatched cards visibly open for the entire 900ms lock instead of a separate 800ms close animation. All delayed outcomes are state transitions, not hidden closures. At the exact timeout, an unresolved pair does not count. These are intentional, documented timing differences.

### Official Lights Out

- A 5×5 board, three rounds, default `mgDuration(45000)`. Center and valid orthogonal neighbors toggle; diagonal/wrapped neighbors do not.
- Each round begins dark, then receives distinct random presses, count `round(lerp(3,6,difficulty))+roundIndex`. It rejects an all-dark generated board.
- The official 5×5 minimal-press calculation uses null-space masks `0x15a82b5` and `0x1b06c1b`. **These constants cannot be applied to a 3×3 board.**
- Official finishing efficiency is `solved ? clamp(1-max(0,totalMoves-totalPar)/max(6,totalPar*2),0,1) : 0`; score is `clamp(round(10+solved*24+eff*18),10,100)`.
- V3 enumerates all 512 3×3 press sets to find an actual shortest solution; generator draws three distinct indexes without replacement, terminating even with a constant RNG. It preserves the orthogonal operation, uses one board, 20 moves, 30 seconds active time, and retains the official efficiency denominator.
- The short score explicitly treats the completed short board as the three-round completion quota: `10+72+eff*18`; unsolved/move exhaustion=10. Therefore par-clear=100 and par3/moves5=94. This is a **normalized short score**, not the score of clearing one official round (which would be 52 at par). Time is a deadline, no additional time deduction. `mini-pass` remains a host-owned 0-point action.

Official easy duration adds 20%; official “short” length multiplies duration ≥20s by 0.7 unless a game is designated turn-based. Memory and Lights Out are not exempt. V3's fixed 30s active timer is a local hotseat contract; it does not read or change main difficulty or duration settings.

## Adapter implementation and integration contract

`prototypes/life-sugoroku/minigame-adapter.mjs` is pure ESM. It imports no main module, uses no DOM, wall clock, `Math.random`, storage, RAF or callbacks, and mutates no passed snapshot. Its metadata pins the official commit/blob above.

| Export | Contract |
|---|---|
| `MINI_RULES[kind]` | Display name, honest origin label, official ID or null, duration and grid metadata |
| `makeMiniChallenge(kind,nextInt)` | Caller supplies deterministic `nextInt(exclusiveMax)`. Returns reaction `{delay}`, memory `{deck}`, Lights `{cells,par}` |
| `startMiniAttempt(kind,challenge)` | Fresh serializable `{phase:'play',elapsed,done,score,...}`; V3 memory has no show/ready phase |
| `applyMiniInput(kind,challenge,attempt,command)` | Returns `{attempt,score}`. `score===null` means ongoing; non-null means terminal. Rejects operations on a terminal attempt |
| `validateMiniAttempt(kind,challenge,attempt)` | Validates V3 shapes, balanced deck, unique card indexes, matched pairs, lock bounds, counters, score/terminal state, Lights par. `attempt:null` means not started |
| `toggleShortLights`, `solveShortLights` | Pure 3×3 cross operation and shortest solution |
| `scoreOfficialLights` | Pinned official score formula, separate from short normalization |
| `scoreShortLights`, `scoreMemoryPairs` | Declared short scoring; memory supports optional `pairs:8` for reference calculations |

`command` is one of:

```js
{type:'input', ms:200}             // reaction; ms:-1 = early
{type:'input', index:3, elapsed:80} // memory / Lights, active delta milliseconds
{type:'settle', elapsed:350}       // advance memory pending-pair lock
{type:'tick', elapsed:250}         // active elapsed and timeout; also settles pair locks
```

Every `elapsed` is a **delta since the prior delivered command**, never total time since start. Time advances only when the host delivers a command. The reducer does not run its own timer. Memory has `open` and `matched` arrays of **card indexes**, `tries` counting two-card attempts, and `lockRemaining`. Lights has `cells` and `moves`. Pair and timeout results resolve at most once; the host must additionally enforce the match revision guard and award the result once.

Recommended engine integration:

1. Route only `rulesVersion>=3` through this adapter. `rulesVersion:2` and old snapshots without a newer marker retain the entire old generator, attempt, input, validation and scoring paths. Do not reinterpret a saved five-symbol sequence as a deck, or an old Lights score as a new score.
2. Generate the challenge with the existing saved RNG (`n=>int(state,n)`). Generate separately per seat as before; do not give later hotseat players the same exposed answers. Generation is only at the existing challenge boundaries, never during render or restore.
3. `mini-start` stores `startMiniAttempt`. `mini-input` maps to `input`; a dedicated revision-checked `mini-tick` or `mini-settle` maps to `tick`/`settle`. Save the returned attempt. If `score!==null`, call the existing local `miniScore` exactly once. Keep `mini-pass` outside this reducer and at 0.
4. Run `validateMiniAttempt` in restore for V3. Keep the match's validation of four scores, current seat, revision, pending kind and result rank. The adapter is not an anti-cheat validator or a replacement for whole-match validation.
5. Local rank/rewards remain the existing system: score order, equal scores share rank, local growth `[4,2,1,0]`, money `[8,5,3,1]`, existing long-mode adjustment. This task does not modify these tables or main scores.

Recommended UI integration:

- Use the V3 name and provenance label; 4-pair memory should not retain the old “5つを同じ順番に” explanation or `おぼえて、ぽん！` rules text.
- Before play, show a device-pass/ready button. Memory: “2枚ずつめくって、同じ絵を4組そろえよう。30秒。少ない回数で高得点。” Render hidden-card labels that do not expose underlying symbols to screen readers. Disable all cards while two are open; matched cards remain visible but disabled. Show pairs, tries, seconds.
- Lights: show “3×3・1問・30秒・20手まで”, current moves and actual `さいてい` par. Explain center and orthogonal toggles. Show remaining seconds without relying on color.
- Draw from official symbol art if the host has that safe independent helper. A cosmetic symbol mapping never changes integer card identity. The adapter does not import main art/lifecycle globals.
- Bind input and tick handlers to the exact snapshot revision. Use one clock owner; re-render must not leave old interval/timeout callbacks able to score a new player. Freeze/cancel timers before menus, page hide, switching screen, and stale-tab handling. Resume from persisted active elapsed/lock; never store a `performance.now()` origin across reload.
- A tick can resolve a pair and may finish a seat. Check the returned state/score before scheduling another timer or accepting the old pointer handler.

## CPU, restoration and isolation

CPU remains the existing saved-RNG stochastic skill model (easy45–85, normal55–95), not an official game's AI and not physical taps. It must never inspect hidden memory cards, reaction future timings or a puzzle solution to manufacture human-like input. This adapter intentionally exports no answer-reading CPU. CPU score resolution remains host-owned and uses the existing one-shot match revision guard. The ranges do not establish parity with human performance on the new short boards; they are an explicit local balancing choice.

The main official game instances hide live state in closures and use `Math.random`, `performance.now`, RAF and timeouts. Their common main session wrapper suppresses stale callbacks after leaving a game; copying only `.start()` does not bring that protection. `finishMinigameInner` writes main records, lifetime minigame counts, growth/decline, energy, happiness, money, daily rewards, stickers, companion progress and `saveState`. Therefore **do not call the main start/finish/record/save flow**, even if the visual game registry itself receives dependencies through `installNaotocchiMinigames(S)`.

The pure adapter never calls those APIs, and its output only enters Naokoro's existing independent snapshot/reward flow. It has no access to main scores, achievements or saves. Keeping V2 continuation intact also avoids silently changing a player's challenge/RNG sequence during a saved match.

Baseline restoration limitations observed: reaction delay is newly scheduled in `bindMini()` after every render; memory's reveal timeout similarly restarts at 4s; Lights only accumulates elapsed on a tap and limits a single submitted delta to 60s. These are not exact clocks across reload or UI changes. V3 pair/Lights state can resume exactly at the last **persisted active delta**. Any fractional time since the last persisted tick is deliberately not recovered; paused/offline time must not count. The independent reaction game still needs host timing treatment and must not be described as exact elapsed-time restoration without that work.

## Safari and browser limits

The adapter uses native ESM, arrays, bitwise integer operations and JSON-compatible values, with no experimental browser API. Node tests verify the state machine, not physical Safari behavior. Actual iPhone Safari is not available in this subtask; Chromium emulation is not proof of Safari conformance.

Host verification still required: active-time freeze on `visibilitychange` and BFCache/page return; pointer cancellation; avoid `pointerdown` plus synthetic-click double input; keyboard activation for reaction; no stale callbacks after opening save/pause; 320/375/390/430px tap targets; safe areas/short-height scroll; VoiceOver labels that conceal hidden cards; clipboard fallback; persisted challenge and lock after reload. `performance.now()` is only a session clock, and background timers may be throttled. Keep reaction green-state timestamp separate from scheduling delay and from DOM text/class changes. UI timing needs browser tests in addition to this pure module.

## Evidence and remaining checks

- Before adapter implementation, the new suite failed with missing exported adapter behavior. After implementation: `node --test tests/life-sugoroku/mini-adapter.test.mjs` **11/11 passed**.
- Tests cover all 512 Lights boards and executable solutions, 80 seeds × three modes, balanced deterministic decks, true par, row-edge toggles, constant-RNG generation, early reaction, terminal duplicate rejection, original-state immutability, pair match/mismatch locks, JSON restoration mid-pair, exact timeout before unresolved final pair, 20-move exhaustion, canonical score reference values, malformed snapshots and invalid RNG.
- Intermediate shared-checkout run `node --test tests/life-sugoroku/*.test.mjs`: **59/59 passed**, at a point with nine adapter tests plus other concurrently added V3 tests. The final two adapter tests subsequently passed. This is not the final integrated checkout's total.
- `npm test` was attempted. Initial 29 tests passed; the following group had 23 pass/1 fail: `tests/social-expression-integration-test.cjs:22`, “presenter turns body and head only as presentation and reduced motion suppresses it”, fails with `ERR_MODULE_NOT_FOUND` for missing sparse-checkout `character-3d/runtime.mjs`. The `&&` suite stops there; remaining main tests were not run in this attempt. Log: `/tmp/naokoro-mini-audit-main-tests.log`. Final owner must materialize required baseline files and rerun; no full-suite pass is claimed here.
- This delegated task writes only this audit, `minigame-adapter.mjs`, and `tests/life-sugoroku/mini-adapter.test.mjs`. Integration with engine/UI, legacy-snapshot end-to-end checks and rendered browser QA are the owner's next steps. No main file, other game, save, remote branch or deployment was changed by this subtask.

## Safe future synchronization

For the next upstream update, inspect the pinned factories and shared helpers at a new explicit main SHA. Compare mechanics, input locks, scoring, time limits and lifecycle separately. Update provenance and adapt only pure rules needed by these short modes; never merge main to synchronize this feature. Add reference-value/transition tests before changing an adapter formula. Introduce a new rules version for incompatible saved attempts, preserve the old execution path until its saves are retired explicitly, and update every player-facing short-mode statement. A matching game title or old comment is not sufficient evidence of official-rule equivalence.
