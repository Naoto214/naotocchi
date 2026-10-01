# Motion v2 L2 implementation plan and ledger

Authority: user's 2026-10-02 handoff, including continuous execution unless a new specification ruling is required. Existing recovery is approved and immutable. Latest remote main verified as ebffaad921da29bf2b8b42e1bdccc97c922db280 / tree 492ea3b8e88e6eea3318fcf13b336fa892469eac; PR370 merged. No open L2 PR. New isolated clone and branch feat/motion-v2-l2-20261002.

Design: retain cast-motion.js API/mood aliases. Add event recipes with scope and a focused budget (10px, below recovery's 16px). Keep existing ambient frames and personality entries unchanged; new L2 recipes have common timing and shape, no personality. SELF care is large only on the first pet beat; later speech/listening is quiet. GROUP cleaning translates castResponse once upward, with no per-actor scaling or horizontal movement. Preserve Relationship target pulses and owner DOM. Keep recovery frames and handling unchanged.

1. Baseline npm test; add feed tests that fail for group lift / insufficient focused travel. Implement recipe selection and feed munch→satisfaction (no assumed forward direction); overfeed stays negative. Verify cast/emotion.
2. Add play tests: readable hop/wiggle, fatigue/annoyed negative, no group and no duplicated celebration. Implement play recipes and negative text precedence. Verify cast/emotion/Relationship.
3. Add cleaning tests: one shared peak, primary beat only, coexist with positive targets, exact rest and unchanged placement. Implement GROUP recipe; preserve non-clean legacy behavior. Verify Home/Relationship.
4. Add wake tests: compressed preparation→held upward stretch→soft rest; first pet only. Implement wake recipe. Verify relevant suites.
5. Add real-Home QA fixtures and browser runner for 390x844/320x568, solo/pair/few/26, equipment, positive/lonely, reduced motion and menu interruption. Run required suites and full npm test, asset diff/hash integrity, fresh-context final review once, then save branch without main merge.

Review focus: primary/secondary beats; interruption continuity; GROUP plus target-owned positive; bounds versus existing floor reserve; new recipes must not affect recover/ambient/personality or save/gameplay.

## Ledger
- Pre-flight: all four steps share recipe selection and controller speak; mood aliases remain stable. Cleaning must not inherit SELF's group cancellation. Recovery remains separate.
- Ruling: use fresh clone + new branch as isolation; no additional worktree needed. User explicitly authorizes continuing routine implementation choices.
- Task 1 complete: feed tests RED (insufficient focused lift, repeated secondary munch) → GREEN; cast/emotion combined 75/75. Kept 1000ms meal duration to retain existing afterglow clock; shape includes satisfaction lift. Existing conditional gentle afterglow remains.
- Task 2 complete: play RED (ambient-size travel) → GREEN; cast/emotion/Relationship 156/156. Updated old tests explicitly expecting happy sleepy pet and GROUP annoyed to the user's new negative/SELF requirements.
- Task 3 complete: cleaning RED (two peaks) → GREEN; common one-peak 10px group translation, no local squash; positive owner pulse no longer cancels cleaning parent translation. Existing overfeed quiet listener retained.
- Task 4 complete: wake RED (ambient-size travel) → GREEN; combined 158/158. Hold 7px stretch, shared 10px L2 cap, exact rest.
- QA fixtures RED (missing l2_feed_solo) → GREEN. Dedicated suite now 12 cases, focused total 85. Added positive/group coexistence, reduced motion, menu cancellation, corner-envelope interpolation checks.
- recover output compared with remote baseline: 56 size/id/gentle combinations identical. No asset path changes.
- Browser limitation: Playwright package available, Chromium absent; installation returned invalid/truncated ZIP. L2 real-Home runner attempted and failed at browser launch. No browser GREEN or Safari claim.
- Final independent review: one Important/P2 interruption issue. Real clean→feed first starts clear(false)'s 140ms group return; SELF beat cancelled it. Actual-button non-rest-pose regression RED→GREEN; SELF now preserves existing return. Recovery cancellation remains unchanged. Focused 86/86 after fix.
- Final minor (deferred): browser runner covers the standard 32 action/density/viewport cases, not rescue/lonely/reduced/interruption browser automation. Those are covered by Node contracts and the explicit human checklist, but browser verification remains outstanding. No second review commissioned.
- Full-suite execution note: initial and pre-review full npm runs were interrupted (exit130) after the review fix; neither is claimed GREEN. Final full npm test was restarted against the corrected code, log /tmp/l2-final-verified-npm.log. Baseline cast/emotion contract had completed 73/73 before edits.
