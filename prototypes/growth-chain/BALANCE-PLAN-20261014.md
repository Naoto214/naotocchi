# Final balance measurement implementation plan

> Execute inline with executing-plans/TDD. User authorizes tooling and measurements, not gameplay changes.

Goal: Separate policy limitations from egg supply constraints, using paired unseen seeds and unchanged standard rules.
Architecture: New measurement-only policy imports existing placements/itemActions/publicView/applyAction. Existing engine, rules, UI and old evidence remain byte-identical. New runner records legal replay histories and resource/event accounting.
Spec: user's final game balance request, 2026-10-14; fixed rules in FINAL-SPEC-20261014.md.

## Fixed design before results
- Seeds40..71, all previously unused in final-rule comparison. Training/debug fixtures are artificial and excluded.
- Limit1000 drops,10000 total actions. Record truncation separately from gameover. No infinite retries.
- Conditions: ordinary drop-only baseline, chain-priority drop-only; life/active/cycle policies × gauge8/12 × initial eggs[0,0,0,0]/[1,0,0,0]. 14 conditions,448 trials.
- life: stage-weighted board value, nearby high-stage partners, strong death reward; reserve gauge for bulk except productive high-stage single transforms.
- active: same target scoring, all productive tools eligible.
- cycle: same target scoring, egg inventory valued and productive egg use favored; two-action beam over top3 candidates once stage6 exists. NEXT only; seed/bag hidden from policy.
- Fixed deterministic tie order; no policy RNG. Max8 consecutive tools then force a drop is a measurement cap, not a game rule. Record cap hits and resource-positive item streaks.
- Tools evaluated at spawn using live transaction legality. This is not a human speed/gesture measurement.
- Initial ordinary egg is a scenario only, never made the game default. Other improvement proposals remain unimplemented.

## Tasks
- [ ] Tests RED: death over holding08, public information only/determinism, eggs outside chosen bag, pure decision, first/repeat egg metrics and score/gauge accounting.
- [ ] Implement balance-policy.mjs with existing engine; no production imports of new policy.
- [ ] Implement balance-run.mjs and independent balance-verify.mjs; immutable manifest and per-trial resumable files.
- [ ] Run fixed cohort; replay every action; summarize paired differences, censoring, event ranks, time to first egg and actual earned-spend-reward cycles.
- [ ] Test resource budget invariant: total earned gauge <=4*(drops*2+eggsUsed+initialOccupancy-finalOccupancy); report net-positive tool streaks with occupancy loss.
- [ ] Review evidence and preserve old77/DOM5/mutation12; no repeat full-root suite unless protected runtime changes.
- [ ] Non-force checkpoint and final GitHub save with remote/local tree/HEAD equality and Draft state.

Review focus: no future bag leakage; no initial-stock-as-earned error; no censored-as-ended error; no artificial witness as natural success; identical rules/config across paired policies.

## Adaptive follow-up and attribution correction
First fixed cohort completed with zero eggs. Separately created life2-v1 (reserve policy + two-action lookahead), fixed new seeds72..103, gauge8/12 × initial ordinaryegg0/1 =128 further trials. This is an adaptive exploratory follow-up, not preregistered with the original448. Keep its manifest/results separate.
Reviewer found temporal cycleRewards is not causal: relabel it as a later reward following earned-egg use. Independent replay now tracks the inserted earned-egg ID through merged anchors to death. Separate tests reject unrelated08 deaths and accept a constructed true ancestry cycle.
No standard rule or UI changes. Budget bound sharpened in the implemented metric: gained gauge <= introduced creatures - surviving creatures (not merely four times that bound). New tools are measurement-only.
