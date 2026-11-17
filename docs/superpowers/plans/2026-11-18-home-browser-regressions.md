# Home browser regressions implementation plan

> Execute natively with systematic debugging, TDD and verification-before-completion. The user explicitly authorized implementation and conditional deployment; retain the prior native execution choice and do not repeat design approval.

**Goal:** Preserve V5 movement and repaired conversations while eliminating the growth displacement and investigating forest browser instability.
**Architecture:** Keep all geometry formulas and contact/movement decisions. Avoid committing a position correction against a new resident envelope and an obsolete camera presentation. Let the existing presentation update complete before applying measured bounds.
**Tech Stack:** Existing JS controller/model, Node tests, Playwright Chromium/WebKit, GitHub Actions/Pages.
**Spec:** User's VERSION 5 remaining browser regression repair request; prior records in docs/qa/home-v5-dialogue-fix.

## Constraints and review focus
- No changes to V5 bounds, body scale, collision coefficients, dialogue, assets, save format, or yielding.
- Keep existing seeds, timeouts and movement/dialogue assertions. Verify authored frame dimensions at the original 1/64 CSS px threshold and independently check exact native layout quantization (see measured WebKit failure evidence).
- Verify first hatch, subsequent growth, item/region changes and dense casts; a deferred update must not strand a resident or permit unsafe movement.
- Preserve legal world feet, but still correct genuinely unsafe positions once the new presentation is ready.
- Release only after all important checks pass; otherwise retain Draft.

## Task 1: Growth lifecycle
- [x] Confirm current CI: 40 success, 2 birth failures; Home layout passed.
- [x] Trace current 320px growth: transient new ink/old camera top=335.9507 clamps foot156.6456; settled top107.6820 would preserve it.
- [x] Add controller regression exercising the real envelope event and subsequent camera update; prove failure before fixing.
- [x] Apply smallest controller ordering correction. Keep model/social and all numerical geometry unchanged.
- [x] Run unchanged birth browser tests on main/pre-fix/current for the known case and full Chromium/WebKit after correction. Verify saved adult entry.
- [x] Update only relevant cache identifier and allowlist hashes; save code commit.

## Task 2: Reach and full validation
- [x] Reproduce forest movement with current test fixture, compare main/V5/current if needed; log actual accepted operation and final feet.
- [x] Run 448 pointer endpoint comparisons against V5 and multiple population/equipment/region conditions, unchanged dialogue browser suite.
- [ ] Run all npm test stages and Pages tests/package/HTTP checks. Preserve failed logs separately.
- [ ] Independent review of final correction; save report, inspect exact-head CI.
- [ ] If green, merge approved PR #561 and verify Pages deploy + live code/home/save. Otherwise report blockers without merging.

## Additional measured browser issue
- [x] Trace V18 frame .016907px discrepancy to native 1/64 quantization before camera transform; preserve production CSS/camera.
- [x] Add red/green measurement tests; reject exact-phase .017 drift and real authored .02 resize. Independent re-review completed.
- [ ] Finish full stable-tree test rerun and full Chromium/WebKit browser matrices; use exact-head CI for conditional release.
