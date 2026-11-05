# V3 restoration plan
Goal: preserve official behavior except D split; remove unapproved restrictions.
Scope: PR504 only; main, production saves, official 01–20, PR494/503 unchanged.
1. Compare 30 functions against current main; pin sources. Audit engine delta and stage08 support/corners.
2. Add failing tests for unrestricted existing exits and partner control, then remove session policies/cage/learning locks. Preserve board and witnesses where legal.
3. Import official chapter1/world CSS; reuse stage-grid/victory markup from official app with ChapterProgress adapter. Remove actor selector and touch-irrelevant text. Keep V2 shared motion/input helpers and replay/save contracts.
4. Check all witnesses, stroke Undo, V2 save replay, formal suites and browser viewports/operations. Preserve original code in Git history.
5. Review diff, push only PR504, await CI, build same owner-private Site V3 and verify delivered hashes.
Review focus: interrupted gestures, completed-stage replay, old saves without unlock loss, demo isolation, small landscape controls.
