# Relationship iPhone Home QA implementation plan

Goal: prepare twelve reproducible, disposable real-Home cases for the owner's iPhone without changing production files, saves, images or game design.
Authority: the user's full 2026-09-30 iPhone QA handoff; continuous implementation and dedicated preview publication are authorized. No repeated design approval gate. Existing clean checkout is on the requested non-main branch; fresh fetch matches remote 88c8042 / tree 4adc73d.

Architecture: reuse tests/visual-qa.cjs fixtures and the exact production HTML/CSS/scripts/assets. A static QA builder emits an isolated game document whose original scripts are inert until memory localStorage AND sessionStorage have been installed. The generated script.js copy only appends a narrow QA bridge; checked-in production source is unchanged. QA freezes the autonomous age loop (not animation or the 2500ms reaction timer). Fixed positive is explicitly held by retriggering the existing reaction; real transition cases use existing play handlers or a labelled QA reaction stimulus.

Controls live outside a full-device-viewport iframe; they never subtract from Home's layout height. Select, previous/next, reload and replay use only synthetic fixture data. Parent controls never access browser storage. No normal index is published at the preview root: root is the QA selector.

## Task 1 — cases, isolation and generated Home
- [x] Add failing tests for twelve cases, partner identity/values, selective rescue 20/25/60, memory storage isolation/fail-closed loading, exact renderer sources, no production writes.
- [x] Implement tools/relationship-home-qa/{build.cjs,cases.cjs,bootstrap.js,runtime-hook.js,page.html,controls.js} and tests/relationship-home-qa-test.cjs.
- [x] Run tests through RED -> GREEN; verify production handlers produce representative-only positive and rescue/expiry behavior in the existing runtime harness.

## Task 2 — verification and handoff
- [x] Run QA-specific, relevant Relationship/save/Home Node tests and full npm test; no Work Chromium launch.
- [x] Verify all 3430 image hashes against saved manifest; verify all existing production files and runners unchanged.
- [x] Independent final code review focusing on storage fail-closed, source fidelity, frame timing, selective positive and artifact contents.
- [x] Reuse established static dedicated Site hosting pattern in a NEW isolated owner-private QA Site, because repo has no branch preview workflow and the prior Site targets a different approved Expression task. No existing Site or production Pages overwritten.
- [x] Publish only verified generated output with a source manifest; save sources/tests/report to the requested branch; fresh verify HEAD/tree/main/ahead/behind/PR and actual deployment URL.

Review focus: denied Storage property replacement must prevent every game script from running; full frame viewport must survive browser toolbar/rotation; user clicks must not be auto-replayed more than once; unsupported case must fall back safely; no unmodified game index exposed at root; generated hook anchors must fail closed when production source changes.

Execution complete: code c074bb9, QA tests 13/13, related subset 151/151 (overlaps), npm test 2851/2851, all3430 image hashes unchanged. Independent review return-navigation and output isolation findings resolved with RED→GREEN tests. Dedicated owner-private deployment succeeded; see result and usage documents. Browser/iPhone validation remains human pending.
