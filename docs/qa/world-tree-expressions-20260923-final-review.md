# World tree bounded addition — independent code review

Review date: 2026-09-23. Baseline: local `bc8f98a2bcdaea7d142d4da3a4a46a4b917e7000`. Reviewed the working diff, latest approved spec, QA acceptance records, scratch placement candidate, and scratch search versus unchanged repository generator. Read-only repository review; no commit, push, deployment, or repository edit performed by reviewer.

## Assessment

No actual critical, important, or minor code defect identified in this bounded change. Code/spec QA accepted after final regression and independent composite evidence review. Suitable to proceed through Site publication and GitHub save gates; **not an overall completion, deployment, or merge approval**. PR278 must remain Draft/open/unmerged; do not merge main or repair its existing conflict.

## Evidence personally checked

- All 2301 baseline character PNG files compared byte-for-byte against git baseline: unchanged.
- Existing 200 placement objects deeply equal baseline. Exactly world_tree/01–08 added. Applied placement table deeply equals scratch candidate.
- All 25 old anchor and stage-name records deeply equal baseline; world_tree is their only added key.
- All 80 independent PNG acceptance records have unique paths and ACCEPT verdicts; SHA256 of every current PNG matches its acceptance record.
- Runtime change is stage asset allowlist plus eight placement records. Resolver, reaction rules, SVG artwork/colors, sweat implementation, gameplay, save code, and growth/romance conditions are unmodified.
- Preview rare-line achievement addition stays inside disposable preview fixture. Existing unsupported-species checks moved from newly supported world_tree to ghost, without dropping fallback assertions.
- `index.html` changes only the pet-expression cache token, to `20260923-b99aef14`; SHA1 of current runtime begins `b99aef14`.
- `git diff --check` clean at review.
- Scratch placement search differs from repository generator only in input/output path plumbing and sick angle candidate enumeration from [60,65,70,75] to integers 60–89. Collision masks, margin, sweat exclusion, minimum horizontal offset, right-head cap, radius, and canvas checks remain. Repository generator itself unchanged. Existing entries are retained by the same previous-placement branch.

## Test quality

The changed parameterized tests provide meaningful world_tree coverage: all 8 stages × 10 runtime states/reactions, original bounds/transparency/distinct raster assertions, all routes, face-relative direction and sweat assertions, preview isolation, canonical stage names, and save-state stability on render. Fallback tests still exercise an actually unsupported line. Existing geometry checks extend to world_tree without relaxing assertions.

Reviewer independently launched the four expression/preview test files, then cancelled this optional duplicate run at coordinator request in favor of the mandatory final full suite. The run had produced no result; no PASS is claimed. No repository code was changed by cancellation.

Coordinator reports 34 targeted cases passed, all 2080 mark checks and 1248 sweat checks have zero issues, 2080 Site PNGs match source, and Site selection/memo/copy/dialog/navigation VM checks passed. These are reported evidence, not a real-device browser review by this reviewer.

## Declined-to-judge items and remaining gates

- This code reviewer did not repeat PNG visual adjudication. Acceptance relies on independent recorded 80-image review with verified hashes. Its small-face readability and non-face pixel variation limitations remain; no claim of pixel-identical regeneration.
- Composite visual gate is now satisfied by the independent 80-cell report read in the final follow-up below. Exact geometric conditions remain separately supported by the placement checks and diagnostic, not by visual inspection alone.
- Full npm suite gate is now satisfied by the final log read in the follow-up below. Coordinator confirms it ran after final PNG/placement/cache/composite acceptance, with no subsequent runtime/PNG changes.
- Same owner-private Site publication and post-publication identity/access/content verification remain required. VM DOM checks do not establish live or real-device behavior.
- Git Data API save to the existing PR branch, exact remote SHA/tree verification, and final PR278 Draft/open/unmerged checks remain required. No remote state has been independently fetched by this reviewer.
- Final QA record must distinguish passed checks from pending ones and preserve the original readability/non-face variation limitations.

## Final spec/code QA follow-up

Read `/workspace/scratch/0e1d599677f2/world-tree-npm-test-final.log`: it is the repository full `npm test` command, including initial smoke/dialogue/visual QA chain and the complete node test list. Final result: **1644 pass; fail/cancelled/skipped/todo all 0; duration 296942.937331 ms**. Coordinator tool-exit evidence is 0. No additional test run was performed for this follow-up. The earlier optional duplicate run remains cancelled with code 130, not passed.

Read `/workspace/scratch/0e1d599677f2/world-tree-composite-review.md`: all eight individual stage sheets and all 80 cells reviewed, all accepted, critical/important/minor all 0. It explicitly accepts 04 sick's near-vertical upper-right placement as a canopy-avoidance result and records static-composite limitations. This is independent reviewer evidence, not a claim that the code reviewer personally inspected those images.

Read the independent placement diagnostic: 04 sick has valid 79.5, 79.75, and 80-degree candidates; the 80-degree candidate is exactly [-12,-21.5], matching applied output. The updated repository QA accurately distinguishes actual-alpha geometry from nominal SVG centers, notes 02's approximately 80.95-degree placement, and does not claim every sick angle falls inside 55–80 degrees.

Current runtime SHA1 remains `b99aef14189bd37623be8ad6ed0b81bb6905c101`; `git diff --check` remains clean. Latest QA documents the full-suite result and unchanged runtime/PNG after it. **Final spec/code QA: accepted, no unresolved critical/important/minor findings.** Original image readability and static-composite/VM limitations remain.

Remaining task-level gates: publish and verify the same owner-private Site; save via Git Data API to the existing branch; verify exact remote SHA/tree and PR278 Draft/open/unmerged. No main merge, conflict repair, or further species work is authorized by this review.

## 公開ゲート完了（主担当の最終証拠）

同一owner-private Site deployment appgdep_6ab35b023d64819181fa2aa23807a3fa succeeded。公開ソース7786fab34d8a09dcd6e54d1e62dd06c4c4108bba、全2700ファイルのarchive内容とGit blob一致、gzip全体読了、別コマンド再読込も一致。全体1644PASS後runtime/PNG変更なし。GitHub保存HEAD/tree/PR/CIの最終値はPR278本文へ追記する。
