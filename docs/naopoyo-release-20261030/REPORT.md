# Chapter 2 release evidence — in progress

Initial main: e33ec25a334217227f0708b452a8be91fa4d1e60
PR436: ab937a22e2ae246b87b58932815dad2c4e8a2d87
PR482: 79981ddee5772a0b301da8a06a63faa6ca4d9661
PR483: 809c1f8b5153b7f0f5ab125192ca5a3d8f4773a0
All three open Drafts, API mergeable=true at start. PR482/483 final documentation heads have no workflow runs; integration must run fresh CI.

Release gates: all source features preserved; contact-v2 physics and motion; unchanged 11–20 boards; 312-step examples (20=97,16/16); example controls/cursor rule identity; moves/stroke Undo/no white cover; safe read-only migration of old progress with old board/history retained; chapter1/Runtime/CARD regressions; Pages manifest/HTTP; integrated CI; real browser representative interaction before merge. Native iPhone Safari is unverified until owner tests.

Baseline: node --test chapter1/tests/*.test.mjs v2/tests/*.test.mjs = 244 pass, 0 fail/skip/cancel.
PR436 merge into latest main: automatic, no conflict. Source branches unchanged.
Browser setup: installed Playwright package exists, Chromium download returned invalid ZIP. Alternative runtime being investigated; no browser pass claimed.

Status: NOT released. main untouched.

## Integration decisions
- PR482 and PR483 merged without text conflicts. session.mjs automatic merge retains both unpaused Undo and contactVisualActors. All source commit histories remain ancestors.
- Release chapter2 stages select contact-v2; stage geometry and difficulty unchanged. Legacy explicit contact-v1 fixtures remain to test backward behavior. Tests deriving current stage rules now expect contact-v2/new key; no test was removed.
- New normal/QA key: naopoyo.komorebi.contact-v2.20261030.v1[.qa]. RECOMBINE_KEY (V10–V12) remains read-only. Only clears, unlocks, hints/read flags migrate; no old board or Undo is restored. Malformed old summary still recovers append-only progress markers.
- Example cursor key v2 includes stage in key, exact canonical operations and contact rule in identity. Old v1 cursor keys are untouched. Example motion uses normal session timing and respects reduced-motion.
- Root portal continues to chapter1; chapter1 ending and dialog link lead to chapter2. Existing chapter1 save code is unchanged. Chapter2's own sequential access guard remains active.
- Pages exact allowlist adds only chapter2 runtime + ten examples; QA/comparison paths excluded. Dynamic example loader's ten numbered JSON files were explicitly reviewed.
- Integration found transient split children disappearing instantly on absorption in new contact presenter. Preserved the existing failing visual regression and added post-contact opacity interpolation; related25/25 pass. Legacy V9 timing tests explicitly select their original contact-v1 rule.

## Verification so far (not release approval)
- Full puzzle before last two defensive additions:1524/1524 pass,0 fail/skip/cancel.
- Release-specific tests:17/17 pass, including312-step normal/replay/save/Undo equivalence and20=97/16 rescued, corrupt legacy summary and same motion timing.
- Pages unit16/16. Earlier integrated package HTTP4087/4087 hashes match,213694021 bytes,7 entrypoints,452 cards/904 images. Final candidate will be rechecked.
- Sparse local checkout initially omitted historical Runtime/CARD documents; failures are recorded, dependencies restored. No source test deletion or weakening for missing files. Full integrated CI remains required.
- Browser153.0.8010.0 obtained from npm chromium distribution; verified launch. Initial harness failure was an invalid test assumption (chapter1 has no numeric number property), then fixture cleanup saved a synthetic board on pagehide; harness corrected. Neither counted as a browser pass.

## Independent review
A fresh independent reviewer found2 Important migration edge cases,0 Critical: malformed chapter1 summary concealed valid final-clear marker; stale tab could overwrite future-version board from latest summary. Added3 reproducing tests (all RED), fixed only chapter2 reader/write guard, focused tests GREEN. Chapter1 save implementation remains byte-identical. Future board protection checks both summary and separate slot before writing. No deferred findings.
