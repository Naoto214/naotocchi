# Execution ledger — 2026-10-12-growth-chain-prototype

Start HEAD 59ef60ec; base main e98b35e1. User approved written design and continuous implementation.
No AGENTS.md/CLAUDE.md found in tracked tree. Isolated task-only clone on requested branch.
Interfaces: engine → session → UI/policy/experiments. All use one resolver. Configs and seeds travel with replay.
Ruling: executable baseline values are explicitly labeled experimental; comparison alternatives remain supported. No production rule is selected.
Ruling: advance without another plan approval because user explicitly authorized implementation and asks only Human QA at end.

Task 1 complete: 22/22 engine tests, missing-module RED then GREEN; remote aeb0d26.
Task 2 complete: 33/33 combined tests after session/policy missing-module RED. Public-information policy deliberately has no bag access.
Task 4 partial: runner/metrics RED→GREEN; combined 35/35. Benchmark seed0 strategic 83 drops / max3 / no08, 0.15s. Not a population result.
Git push unavailable (no HTTPS credentials); use connected Git Data API non-force expected_sha writes and fetch to synchronize local history.
Existing npm test baseline attempted: stopped in tests/dialogue-test.js on missing assets/characters/author/naoto.png because sparse checkout excludes assets. Not a full-suite PASS. Existing source files unchanged.
Ruling: primary strategic policy is exact one-action lookahead with chain/height/setup evaluation; beam2 (top two immediate candidates, one further public piece) is supplementary. Neither is an optimal or human policy.
Ruling: item policy permits at most two item actions between ordinary drops, solely to bound policy loops; manual game does not impose this limit.

Task 3: browser runner authored before UI; Chromium launch blocked by environment socket EPERM (not a product test failure; no browser PASS claimed). Socket-free jsdom integration verifies real UI events.
DOM regression found idle finishWave reset falling pose: RED→GREEN guard. Items disabled once fall motion begins; preview and stale timer tests pass.
Fresh-context whole-branch reviewer: two Important findings, settled topout and incomplete imported configs; both fixed with failing regressions then GREEN. Re-grade two minor robustness findings as Important for uninterrupted play/import: long legal paths could never lock, and false active spawn imports freeze play. Both RED→GREEN fixed.
Ruling: settled alternative now ends only on blocked spawn after resolution; explicit hidden rows may remain in off-spawn columns. Reran affected sensitivity-settled results; no other config affected.
Imported sessions require all explicit rule fields (no hidden defaults); seed and active spawn validation included.
Supplemental exposure experiments declared after observing zero baseline egg acquisition; their seed0..39 sets are fixed before outcomes and reported separately as exploratory.

2026-10-13 continuation: fresh remote/local 323e94b8, tree cc2d6d39, main e98b35e1; PR380 open Draft unmerged. Read all five requested documents; archive hash matches.
Full sparse checkout hydration completed. Earlier temporary copy run was interrupted because Git metadata was absent; not counted. Reran npm test in original complete checkout: exit0, smoke/dialogue/visual QA PASS, 3130/3130 + 80/80, no failures/skips. Prototype 45/45 PASS. Logs committed under qa-20261013/.
Browser launch remains blocked by socket EPERM before page load. Human QA pending; instructions in QA-20261013.md. No implementation or experiment changes; no rule selected.
