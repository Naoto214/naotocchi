# Growth-clear Implementation Plan

> Execute inline with executing-plans; final independent code review.

Goal: test whether mixed clearing supports growth without destroying high-stage lives.
Architecture: new directory importing immutable old helpers; resolver + bag + session + comparison + small browser UI.
Tech: ES modules, Node tests, browser DOM. Spec: DESIGN.md.
Global constraints: new files only; 6x12, five species, 20 pairs, exact 7/5/5/3; no main merge or publish.
Review focus: stage marginal bias, transient 08 counted before clear, C choices atomic across simultaneous groups, future tape hidden from search, capped runs distinguished from deaths.

1. Tests for exact categories/species, all six unequal stage pairs, reproducibility and stage marginals; RED then implement bag.mjs. Test mixed precedence, all group sizes, 08 distinctions, simultaneous waves, postgravity cascade, anchor A/B/C and invalid C transaction; RED then engine.mjs. Commit.
2. Tests for session queue NEXT3, seed replay, items and costs, full landing before resolve, no source-state mutation; RED then session.mjs adapting old session and importing movement helpers. Commit.
3. Measurement policy, runner and metrics: tested transient08, event counts and hidden-state independence; bounded known-NEXT beam, deterministic strategy/position variations; fixed manifest and raw per-run evidence. UI plays same action engine and replays waves, C choice dialog. Commit.
4. Run bag property sampling, comparisons and representative witnesses. Run mutation and old/full regressions; independent review with fix pass. Report actual results and limits. Commit and push dedicated branch; Draft PR; verify remote HEAD/tree and protected-path diff.
