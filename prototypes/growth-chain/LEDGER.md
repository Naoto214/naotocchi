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

2026-10-13 mobile implementation (user-approved play baseline, not formal rule selection):
Fresh remote/local 5d8d554c/tree6ed78822; PR380 Draft/unmerged. Preserved engine/session/rules and results archive checksum f45cba1a...9db.
TDD: new hold/phase module tests failed before modules existed, then passed. Mobile DOM failed on absent tool cards, then passed. Review regressions (hidden editor, tool cancellation at lab exit, manual animation leakage, focus retention) observed RED then GREEN.
Added ready/falling/animation/tool UI states; only ready allows items. Auto mode does not skip intermission. Preview uses existing session; commit remains one action. Hold controller and animation snapshots are presentation-only modules.
Mutation discovered a false-negative setup: jsdom default document.hidden prevented timer execution. Enabled pretendToBeVisual, then all 6 deliberate defects were detected with clean controls passing.
Final dedicated50/50, DOM3, targeted mutation6/6 PASS. Installed Chromium headless shell134 runs normally; self-hosting test HTTP server resolves separate-process loopback isolation. Four desktop/mobile sizes pass real pointer/touch gameplay and tool preview/confirm. QA-only Noto Sans JP makes Japanese layout inspectable; no new runtime font dependency.
Fresh-context reviewer reported three P2 issues; fixed with regressions and independently re-reviewed mobile DOM PASS. No remaining blocker in that focused re-review.
Code saved via expected_sha/nonforce Git Data API: abd87644222013afa69cfe20e7bad387ebd5716e, tree9deed232122cde15e18f4fb493ad026ef8f6b519. Fetched and matched staged/remote tree, synchronized local HEAD and verified clean before documentation updates.
Final QA report and evidence: MOBILE-QA-20261013.md and qa-mobile-20261013/. Human Safari/device/game-feel QA remains pending; no production integration or formal rule adoption.
Final full-checkout root npm test completed exit0: smoke/dialogue/visual QA and 3130/3130 + 80/80 PASS, no failures/skips. Raw log compressed under qa-mobile-20261013/root-regression.log.gz. Protected-path diff outside approved prototype/design/plan scope is empty.


## 2026-10-14 — Final rules integration
- Baseline9479e7e7; fresh main095fe36f. User final twelve-section specification accepted as authority.
- Red/green: final score/growth/reward rules, canonical roster/selected bag, live tools and reviewer-found regressions.
- Legacy48conditions/3840trials/554528operations replayed with matching hashes and summaries. Fixed verifier rerun bug: prior verification.json contains numeric trials, not a trial array.
- New fixed-seed200trials/36005actions replay verified. New measurement is separate from old consumed-gauge results.
- Full repository regression started with all assets hydrated; final result pending checkpoint.

- Final: 77/77 dedicated; five DOM harnesses; 12/12 mutants; Chromium4viewports; full root3130+80 PASS, exit0. Root log compressed after completion.
- Reviewer fixes: egg pre-merge collision, fixed canonical replay IDs, selection retention on restart/editor; false-active imported no-legal-placement state also rejected.
- Raw new200trials archived separately in results-final-20261014.tar.gz with SHA256 file; sixteen constructed probes remain explicitly artificial.
- Remaining: iPhone real Safari/Human QA, final gauge price/score coefficients, natural egg supply assessment; no main integration authorization.


## 2026-10-14 最終バランス検証

[BALANCE-REPORT-20261014.md](BALANCE-REPORT-20261014.md)を参照。576試行、自然卵獲得は初期0でも成立。ただし自然な卵由来の再獲得循環は未確認。8／24推奨はユーザー決定待ち。確定ルール・本番挙動は変更なし。旧0/200と今回の探索的結果を混同しない。

## 2026-10-14 なおぽよ進化卵改訂
Plan/authority: EGG-REVISION-20261014.md; baseline5ffa4999, fresh main095fe36f, PR380 Draft/open/unmerged. Full task-only clone restored after workspace cleanup. User authorizes inline implementation through safe GitHub save.
Task1/2: evolution egg contract and animation inventory RED→GREEN; existing death tests explicitly pin old mode, old absent-field logs stay byte-compatible. Standalone rebuilt from existing images. New titleなおぽよ; no other application files changed.
Task3: race comparator RED→GREEN; actions/slots are explicit experimental clocks, same clock/wave death draws, both genuinely ended needed for score fallback. Capped/partial logs unresolved. Reviewer found fabricated ended initial flag; regression observed RED then comparator-local check GREEN. Shared import semantics unchanged.
Ruling: frozen prior measurement source/manifest remains frozen at5ffa4999. Reproduction uses that checkout; added verifier replays stored old logs on revised engine without rewriting provenance. Cost: old generation tools intentionally refuse current changed-source hashes.
Minor deferred: importing legacy rules without eggReward lacks mode selector until starting a new standard game; old replay serialization stays unchanged, new standard lab supports both modes.
192 paired-seed trials complete; replay/analysis and fresh full regression pending. No iPhone Safari hardware QA claim.
