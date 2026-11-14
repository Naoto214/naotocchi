# なおころ。150ゲーム対応 実装計画

> Execution: superpowers:executing-plans. User authorizes implementation, independent Draft PR, staged pushes and a new owner-private preview. No merge or production publication.

**Goal:** 正式150種を再利用し、検証済みのみ抽選へ追加する。
**Architecture:** 現行60種のランタイム、Canvas観測、入力ジャーナル、対戦・報酬処理を再利用。新CPUは表示情報からpointer入力だけを出力する。正式本体・物理・採点・保存schemaは変更しない。
**Tech Stack:** ES modules, Node tests, browser iframe, static owner-private Sites.
**Spec:** `docs/life-sugoroku/MINIGAMES-150-REQUEST.md`

## Global Constraints

- Baseline main: 408c72e6ebef71da3eab33cfb268c7494117aaaa. #511/#516 merged; #510 remains Draft.
- Baseline registry: quick45/50 + normal15/100. Historical audits describe older source; current source hashes are authoritative.
- Main/Pages, Swiss branch, existing PRs, board/home/relationship/CARD GAME/naopoyo excluded.
- Same game seed, fixed official difficulty, four seats, tied rank, 15/10/5/0 rewards, no record writes.
- Quick <=1800 frames; normal <=3600. Longer official games remain deferred, never shortened.
- Existing minigame-adapter.mjs is legacy V3; leave it unchanged.

## Review Focus

- Restore while pointer held, with pending input, and after last success: journal and score must match.
- Wait intentionally emits no input: all100 ties are correct; never fabricate variation.
- New CPU must not read target(), hidden answers or closure state.
- Native input in opaque iframe and narrow screens must use logical coordinates.
- Registration must follow evidence; trial implementations and untested games stay excluded.

## Task 1: Quick five

Files: new `official-quick-cpu-v7.mjs`; runtime/host integration; `tests/life-sugoroku/expansion-v7.test.mjs`; score/audit tools and docs.
Interface: `createQuickCpuV7(gameId,difficulty,random)` consumes `{frame,current,visible,send}`; only public trial identity and rendered data. Runtime retains old CPU branches for existing IDs.
- [x] Add failing tests: actual official completion, both levels, mid-drag/replay, four seats, exact once rewards, input-free wait100.
- [x] Run `node --test tests/life-sugoroku/expansion-v7.test.mjs`; expected unsupported new IDs before integration.
- [x] Implement count stop, circular drag, slow transport and rhythm prediction; wait consciously waits.
- [x] Verify 16 seeded trials per level, <=30s, idle/human replay and no formal-source changes.
- [x] Add isolated QA selector, human/CPU controls, pause/restore, four-seat results and widths320/375/390/430.
- [x] Run dedicated regression/browser QA; register only evidenced games; commit/push and Draft PR.

## Task 2: Normal groups, independently admitted

Use V6 audit's complete100 list; classify official controls/visible geometry/end times before each batch. Build small strategies on shared observations. For every candidate run both-level score sampling, human legal input, exact restore, four-seat rewards, browser and narrow-screen checks before admission. Existing15 unchanged. Long games stay deferred with source-derived duration/reason. Repeat commit/push/PR update per user's seven stages. Do not label an unimplemented strategy supported.

## Task 3: Private preview and handoff

New owner-private Site, separate source/URL/storage origin. QA only in development package, never production allowlist. Report precise registration counts vs outstanding hardware/manual validation, score distributions, CI for actual HEAD, remaining IDs/reasons, and commands to resume. Persist all work to independent Draft, do not merge.

## Execution ledger

- Task1: implementation complete, final validation/publish in progress. Dedicated325/325 before final gesture lifecycle assertion; new14-test suite includes both cancellation and gesture sequencing regressions. Full strict Chromium suite passed before final gesture release; rerunning after final change.
- Ruling: wait intentionally remains100 and tied; formal abstention is success, no score synthesis.
- Ruling: new quick CPU reads Canvas instead of legacy target helpers; current.startedAt is used only to reset per-trial reaction state.
- Ruling: user explicitly requested staged delivery and handoff; this checkpoint delivers quick5. Normal85 remain unimplemented and excluded, next stage puzzle group.
- Review: independent reviewer found cross-engine float coordinates, inadequate save-key sentinel, QA4-seat restore loss, incomplete held-pointer coverage, Node cancel event.type mismatch. All addressed with checks; final gesture lifecycle fix follows failing duplicate-down regression.
- Hosted helper scripts are absent from this workspace. Used native Sites registration, ordinary Git with credential in memory/stdin only, and standard static tar packaging. New Site identity retained.

- Task1: software validation complete. Final326/326 Node tests;160 CPU trials; strict Chromium10 CPU,5 native-human,4 widths,5 four-seat matches with restore all pass after final pointerup change. Official scores/end frames unchanged. Hardware Safari and manual difficulty calibration remain unverified.
