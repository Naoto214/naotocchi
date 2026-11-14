# SDD ledger — plan: docs/superpowers/plans/2026-11-14-bgm-production-library.md
User authorized native execution, independent integration PR and production merge/publish after passing verification.
Pre-flight: Task1 catalog32 supplies Task2 frozen library; Task2 generated runtime exports must retain Task1 catalog behavior; Task3 package uses only approved assets; Task4 merges exact tested head.
Design builder check: approval fingerprint, cache failures, pipeline exclusion, source lock, loop boundaries and async jingle cancellation incorporated into spec before implementation.
Task1: started; latestmain105dba5; #540 integration delta reviewed; #54901a5591 and #550bea117b pinned. No full legacy branch merge.

## Checkpoint: runtime and library implemented
- Latest-main selective BGM hooks;21 runtime/SFX tests and9 game-scope tests pass.
- Exact32 master adoption;3158 melody events and50 rows protected;32 existing quality receipts reused after hashes checked;no regeneration.
-12 library tests pass including isolated33rd registration/revision/resume/approval/export and immutable32.
- Pages package4319 files/293648325 bytes, within350MB budget.
- Full game suite, packaged browser checks, independent final review and production deployment remain pending. This checkpoint does not authorize ignoring any failed check.

## Independent final review / corrective pass
Fresh gpt-6-astra review identified five Important issues. Each was reproduced before correction:
1. Visibility return after cancelled held jingle: resume now starts wanted loop when no current source.
2. Delayed result jingle crossing scene selection: scene generation invalidates obsolete request.
3. Pending replacement cancelled active cleanup: active-source identity owns onended independently of request generation.
4. Empty/incomplete receipts: separate complete native/imported schema validation; incomplete cache reanalyzes and incomplete publication fails closed.
5. Future additions failed fixed-count tests: protect original32/50/100 subsets; derive extension/fixture totals. Tests ran against an isolated33-track registry and its additional34th fixture.
All five regressions RED→GREEN. No reviewer minor findings deferred. Review did not establish physical iPhone audibility or musical preference; no such claim is made.

Browser validation uses actual packaged runtime and real AudioContext graphs in Chromium/WebKit. All32 AAC decode; home clock boundaries;home+3 subapps .36;scene transitions,voice/SFX duck,toggles,rapid changes and result jingles verified. A separate temporary33-track library is routed through actual audio.js and the native A/B preview; no test song enters official library.

Release gate still pending: GitHub Home selected name test fails in crowded scene. Pinned-main control comparison is running. No production merge or publish while any relevant failure remains.

Full npm test completed successfully (exit0); all Node test groups and standalone smoke/dialogue/visual checks passed. See full-game-suite.json. The separate Home selected name browser failure remains an explicit release blocker; main-control Chromium passed once, so cause is not conclusively assigned. No game/UI/save logic changed to bypass it.
