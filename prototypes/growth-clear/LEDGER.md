# Execution ledger — PLAN.md

- Base verified: main cee3e872, tree 97d9a836. PR380 merged; PR381/383 Draft open. Fresh clone on dedicated branch.
- Task 1: complete. Bag/resolver core tests RED (missing modules) → 19 PASS. Exact 6000-seed constraint/marginal check. Initial commit tree 6f971dd4.
- Task 2: complete. Session tests RED → 24 total PASS. Old transaction semantics reused; original movement, gravity and item enumeration imported.
- Task 3: complete. Measurement tests RED → 27 PASS. 400 primary matched-seed trials, then survival/long-horizon/low-cost beam followup. Every record replay checked.
- Ruling: age jumps saturate at08, no lifetime clear on overflow — consistent with existing behavior and explicit pure08 connection goal. Different overflow interpretation would change difficulty.
- Ruling: B ties use higher id; new falling cells take priority, then changed IDs, then A fallback. This resolves unspecified simultaneous landing order; fallback retains measurable left asymmetry.
- Ruling: C decisions are per evolving component and per wave; whole action remains atomic. Human decision time is unmeasured; extra decision count is reported.
- Ruling: primary 160-drop horizon is an exploratory cap, not a game time limit or human difficulty target. Supplement640 checks censoring and held-out seeds check screen overfit.
- Ruling: old comparator with identical new supply isolates rule effects. Actual old all01 supply is a separately labeled context arm, not a same-supply causal contrast.
- Independent review: no reproduced important engine/session defect; gaps were actual-old-supply and mirror controls. Added original generator comparator with RED→GREEN test, and exact resolver mirror controls. Player-policy full mirrored trajectories remain untested; no causal directional advantage claim is made.
- Review caveat: primary ends at first any-species success; mainSuccess is success before that competing endpoint, not eventual main success. In all primary observed successes, the main species was the winner.
- Task 4: focused31 PASS, source mutation20/20 detected, old prototype130 PASS, baseline full3144+80 PASS. Final full regression rerun tracked in QA report.
- UI: DOM functional smoke (72 cells, NEXT3, C choice, AI, old mode, atomic invalid item, sample5-chain replay) passed. Chromium missing and download archive invalid; actual browser layout/iPhone QA not claimed.
- Git transport: shell push lacks credentials. Connected GitHub Git-data tools save identical trees; fetch reconciles local commits to remote object IDs. No force update, main update or publication.
