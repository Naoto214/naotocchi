# Naopoyo Chapter 2 release implementation plan

> Execute inline with superpowers:executing-plans. User has approved implementation, GitHub writes, merge and publication after all gates pass; no additional planning approval is required.

Goal: integrate PR436/482/483 onto current main and publish 11–20 only after integrated verification.
Architecture: preserve source commits with merges; enable contact-v2 only for chapter 2. Separate new normal-board storage, migrate only progress, include rule in example cursor identity. Preserve chapter 1 and unrelated game code.
Tech: JavaScript modules, node:test, Python Pages packager, Playwright, GitHub Actions.
Spec: user's 2026-10-30 release instructions, recorded in REPORT.md as release gates.

## Global constraints
No force push, source branch edits, stage redesign, existing private URL overwrite or old save deletion. 312 steps total; stage20 97 steps/16 rescued. One cell = one move; one stroke = one Undo. No normal pause UI; example pause retained.

## Review focus
Old board/Undo data must remain byte-identical; corrupt new save must retain evidence; stale tabs must not lose clear markers; same answer with new rule must reset cursor; chapter1 save area must remain untouched.

## Tasks
- [ ] Merge source histories into isolated integration branch. Audit conflict decisions and record all SHAs and changes. Baseline chapter1+v2: 244/244 pass.
- [ ] Add release tests in prototypes/naopoyo-chapter2/tests/release.test.mjs for contact-v2 default, cursor rule identity, read-only old board migration, corrupt data, all312 solution steps and Undo/restore. Run RED before changes.
- [ ] Modify stages.mjs, progress.mjs, example-position.mjs/example-ui.mjs to activate rule and safe storage. Preserve session.mjs changes from both branches. Update only obsolete rule expectations, retain explicit legacy coverage. Run release tests GREEN.
- [ ] Make official routing and Pages allowlist include chapter2 runtime, contact-motion and example-position; exclude QA-only entrypoints. Verify normal sequential unlock and both chapter routes.
- [ ] Run full puzzle, Runtime, CARD GAME, Pages suite; build and HTTP/hash verify distribution. Run Playwright gameplay/example/layout/storage QA. Save commands/results/screenshots.
- [ ] Commit/push candidate, create integration PR; require integrated-head CI success. Fresh branch review; resolve important findings with regression tests.
- [ ] Re-fetch main and source heads; merge only if verified tree remains valid. Verify main CI/deploy and live Pages hashes/basic browser behavior. Record original PR states, candidate SHA/tree, main SHA, distribution manifest and remaining iPhone-only QA.
