# iPhone interaction latency follow-up

User reports that the QA Site remains heavy, especially after pressing play-with.
Baseline remote HEAD: 4a226232b175c242db9a1cd8458c54b68e2c77a5.

Confirmed QA defect: runtime-hook temporarily replaced global Math.random with zero during the entire real click handler. This fixed the representative, but also guaranteed checkStoryEvents and every probabilistic dialogue branch inside that handler. The story flash lasts 4,200ms and was unrelated to the intended Relationship reproduction. This is a demonstrated unintended stimulus, not proof of the entire iPhone performance root cause.

Fix: temporarily wrap only the production Relationship module companionPositiveIds entry point to supply its existing optional random argument. Preserve its real implementation, threshold rescue rule, and restore the original entry point in finally, including exceptions. Global Math.random is never replaced. The production click, Home renderer, cast layout, save isolation and 2,500ms reaction remain intact. Ordinary unrelated events may still occur at their normal probability.

Add QA-only double-requestAnimationFrame timing after a button click, displayed outside Home when returning to QA controls. It measures click dispatch to a subsequent rendering opportunity, not guaranteed presentation, FPS, total animation duration or network time. Nested synthetic clicks share one measurement. No persistent logging, network telemetry or save access.

Validation: failing regression reproduced global random override before fix. QA 17 PASS, existing Relationship 62 PASS; combined 79 PASS / 0 FAIL. Existing full-repository baseline remains 2,851 PASS; no full rerun for QA-only edits. Image hash audit: 3,430 unchanged, including Relationship 88. Production source changes: zero. Actual iPhone responsiveness is still unmeasured here; do not claim Home GREEN or root cause fully resolved.

Deploy to the existing owner-private QA Site, no main merge/PR:
https://naotocchi-relationship-home-qa.kerzion214.chatgpt.site
Human follow-up: reload once; use one rescue case; if still slow, report whether the whole page freezes or animations stutter, and the timing shown after QAへ戻る. Do not require console or replay of all 12 cases.
