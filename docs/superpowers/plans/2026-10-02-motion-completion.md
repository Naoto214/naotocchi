# Motion v2 completion implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline with one final independent review.

**Goal:** Complete Home motion layers without changing game outcomes, assets, layout or saves, then publish through a tested PR.
**Architecture:** Preserve cast-motion.js public calls; add scoped special recipes, sparse idle families and metadata personality modifiers. Keep recover and clean as protected recipes. Event adapters in script.js pass actual actors, never infer ownership from prose.
**Tech Stack:** JavaScript, Web Animations, Node tests, existing real Home browser tests.
**Spec:** User's 2026-10-02 Motion v2 completion request; prior docs/qa/motion-system-v2-design-20261001.md.

## Global constraints
- Base 67aed86039731cad091c5d4285a56525edc9f068 / tree 6d3e70df81427377897803b843e706c7c1729d87; branch feat/motion-v2-completion-20261002.
- No images, Expression resolver, Relationship owner/layout, save/progression/balance or meguru changes.
- No additional aesthetic approval gate. Fresh tests, independent review, CI required before authorized merge.
- Recover output is frozen, including legacy per-id parameters. L2 recipes/meaning and clean GROUP remain compatible; only bounded personality modifiers may vary them.

## Review focus
- Stage change currently speaks age: route motion separately without altering dialogue/game state.
- Recruitment must carry the actual joined id; never guess random companion.
- Relationship render callbacks must not cancel an active special celebration.
- Late speech/callbacks must not restart special or clear newer care.
- Actor transform budget must remain bounded at small sizes and dense counts, with no extra idle loops.

### Task 1: L3 and event adapters
Files: cast-motion.js, script.js, tests/motion-v2-test.cjs.
Interfaces: reactionPlan(event,text,kind,primaryBeat); controller.special(event,target); speak accepts target; recipe names evolve/transform/welcome/union/marriage.
- [ ] RED: semantic recipe single major peak/rest/budget; 26 actors target-only; secondary beat no replay; new care cancellation.
- [ ] Implement scoped recipes with 16px ceiling, explicit target resolution, active priority tags. Frozen recover path.
- [ ] Route stage changes and actual recruitment through existing speech clock; no new timers or saved fields.
- [ ] GREEN: node --test tests/motion-v2-test.cjs tests/cast-motion-test.cjs tests/motion-l2-test.cjs tests/emotion-integration-test.cjs; commit.

### Task 2: Sparse L1 and persistent coexistence
Files: cast-motion.js, script.js, tests/motion-v2-test.cjs.
Interfaces: existing idle({excludePet}), same one Home idle timer.
- [ ] RED: breathe/sway/look/posture families, one actor per turn, no loops, no idle during reaction/speech/rest; persistent priority.
- [ ] Implement bounded families and deterministic actor/family phase, no synchronous cast loops.
- [ ] GREEN: motion + emotion regressions; commit.

### Task 3: Personality metadata and modifiers
Files: character-world-master.v1.js, cast-motion.js, script.js, tests/motion-v2-test.cjs.
Interfaces: metadata motionPersonality default/families; actor personality; motionFrames options personality.
- [ ] RED: every canonical actor assigned valid class; soft/bouncy/heavy/float/quick/slow/rigid differ in L1/L2/L3 but keep rest, one peak and ceiling; recover byte-equivalent.
- [ ] Implement reusable family classification and minimal stage overrides, applying tempo/translation/turn/squash before final safe budget. GROUP remains common.
- [ ] GREEN: dedicated and existing scope/state tests; bump changed asset tokens; commit.

### Task 4: Integration and delivery
- [ ] Run browser viewport/26actor/relationship/reduced cases, image unchanged audit, Home/Relationship/assets/save/release tests and fresh npm test.
- [ ] One independent whole-branch review; valid fixes get RED/GREEN and fresh full suite.
- [ ] Draft PR, inspect diff, Runtime/Home/required CI, ready, merge, fresh main/tree, postmerge major regression, Pages and deployed runtime equality.

## Inventory and decisions
L2 recipes meal/play/ticklish/wake + clean GROUP already implemented. Legacy bounce/wiggle/shy/love/droop/settle/shake/munch/hungry/sulk/doze/stretch/nod/curious/tick remain public compatibility moods. Persistent emotion-state.js priority/profiles remain unchanged. Recover remains its own frozen focused L3 path. Existing minigame/negative legacy GROUP responses are compatibility behavior, not new GROUP assignment. Evolve/transform/companion_new/partner_new/marriage replace generic bounce/love only for their primary semantic beat. Court remains existing L2 RELATIONSHIP.

## Execution ledger
- Remote main unchanged; PR373 merged; postmerge Runtime36964589154 and Home36964589093 success. No relevant open Home motion PR; previous L2/design branches retained.
- Clean working directory, new branch from freshly fetched main. Baseline 86 PASS / 0 FAIL.
- User explicitly waives intermediate design/beauty approvals; implementation proceeds inline.
- L3 RED9 cases (missing recipes/controller) → GREEN95 incl baseline. L1 RED5 → GREEN106 with emotion-state. Personality RED2 → GREEN108. Ring RED1 → GREEN189 incl Relationship. Speech-owner RED1 fixed by preserving speaker while softly clearing prior motion. Runtime recruitment/cancellation and critical/sleep cases pass.
- Recover 56-combination SHA256 matches baseline: 49377d52e34cfc656ac0d48f0c85c957bf9421a23bbcd5978ebde386798eeb30.
- Home/assets/save/release fresh regression360 PASS/0 FAIL. Full npm test started. Browser bootstrap blocked by invalid download ZIP, not an application assertion failure.
- Evolution dialogue compatibility RED→GREEN: reuse age dialogue keys (including partner and follow-up lines) while passing evolve only to motion. Dedicated116 PASS/0 FAIL; Relationship80 PASS/0 FAIL.
- Git CLI push lacks credentials; use authorized GitHub Git-data connector transport and verify identical tree. Remote work branch created from base main. Browser download is unavailable locally even using CI-pinned Playwright; Home CI will execute browser tests before merge.
