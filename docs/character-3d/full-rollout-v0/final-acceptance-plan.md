# Full Character 3D v0 Final Acceptance Implementation Plan

> For agentic workers: use superpowers:executing-plans for remaining implementation tasks. User-authorized work proceeds without intermediate permission requests; explicit Human decisions, physical-device evidence and final merge approval remain separate required gates.

**Goal:** 全293体の一括Human QA、iPhone実機QA、最新統合候補の検証を完了し、最終結果を提示してユーザーの明示的最終承認を待つ。

**Architecture:** 既存Character 3Dのspec/archetype/builder/runtimeとQA Gallery・撮影・native fixture・証跡回収を再利用する。原画と既存画像を比較し、例外だけを修正する。最終統合は隔離候補で行い、main、他lane、既存セーブを試験の作業場所にしない。

**Tech Stack:** Existing JavaScript/Three.js, Node test/mutation tools, GitHub Actions, commit-pinned rawcdn Safari previews.

**Spec:** User directive 2026-10-11 22:12 JST; [batch review record](../../qa/character-3d-full-v0/batch-human-qa-20261011/review.json), [existing approvals](../../qa/character-3d-full-v0/human-approvals-20261011.json).

## Global Constraints

- PR376 remains Draft/open/unmerged, base currently `feat/character-3d-pilot`. No Ready/main merge now. The user's directive approves the eventual merge policy, not its execution.
- Final target is main only after all gates and a new explicit final approval. Pilot PR372, World PR374 and their dependency/base handling must be named in that final proposal; this instruction does not authorize merging either PR.
- Whole roster is 293: 248 player stages +26 companions +18 partners +1 author. Batch acceptance is allowed; 291 individual approvals are not required.
- 2D originals are the sole character-design authority. Only clear defects or material mismatches become repairs. A triage candidate is not itself a rejection or permission to redesign a whole family.
- Naoto E plus side layers and deer legs stay frozen absent a confirmed defect. Preserve faces/clothes, other characters, shared architecture, fallback, save/schema, Expression and Motion contracts.
- Save through Git Data API with expected_sha and force=false; never git push. Verify remote/local HEAD and tree and clean state. Consolidate evidence saves and reuse unchanged source-specific PASS results.

## Review Focus

1. Batch approval must name the covered source/roster and exceptions. Missing feedback is not approval; assistant image inspection is not Human approval.
2. Historical image labels or screenshot perspective can mislead: inspect original-size views before opening a repair. Legacy composites need the rightmost four current tiles.
3. A loaded URL, desktop WebKit, Chromium or SwiftShader is not physical iPhone evidence. Counts must match real active native actors, with fixture identity and restoration.
4. Clean textual merges can still double-apply Expression/Motion, break role lookup or leak 3D state into saves. Exercise those semantic boundaries on the combined candidate.
5. The source can change during review: pin all results, recheck remote main/World/Expression/Motion at integration, and rerun affected evidence instead of inheriting unrelated CI PASS.

## Task 1 — Current evidence and batch Human QA

Files: `docs/qa/character-3d-full-v0/batch-human-qa-20261011/{README.md,manifest.json,review.json,*.jpg}`; existing coverage and full-gallery are reused.

- [x] Fresh remote6007baa/tree984c787 and PR376 Draft/unmerged confirmed.
- [x] Source00a83a4 Character38140123557, Runtime38140131275, Home38140131288 all SUCCESS. Runtime log confirms3022 +80 tests,0fail; local source-specific24/24 mutations and protected checks retained. Previous5b85Home FAILURE remains historical, not erased.
- [x] 293 original asset hashes match, all original/four-view paths exist. 23archetype boards reuse879 source records; no recapture.
- [x] Inspect all293 original/front/34 comparisons; legacy boards also enlarged. Inspect priority ghost05/starfish07/dragon08 in four views. Frog04 apparent missing tail rejected as a thumbnail false alarm.
- [ ] Obtain explicit batch Human decision for the roster or named groups with exception keys. Existing two repair approvals persist. Proposed ordinary batch:288 targets; priority3; frozen repair2. The user may instead approve all293 together.
- [ ] Repair only confirmed exceptions with existing parameters/attachments; compare before/after with original and affected views/ordinary distance. Run changed-family tests, relevant mutations/regressions, restore exact bytes, save one meaningful batch. Reopen frozen Naoto/deer only with documented concrete defect.

## Task 2 — Physical iPhone gate

Files: `batch-human-qa-20261011/iphone-device-record.json`; reuse `character-3d/gallery.html`, `tools/character-3d/meguru-qa.cjs` native composition/fallback/restore mechanisms and existing QA adapters.

- [x] Select23 named representatives, one per actual archetype, plus tadpole/adult frog and mermaid morphology edge cases. Provide source-pinned live links.
- [x] Prepare native1/5/27 NTS1 codes using unchanged existing makeSave/codec. Verify all3 round trips and schema5/dog04/native composition with the production LifeStages module preloaded into the generic test harness VM (as index.html does); no production/harness edits. Existing profile import is the no-PC entry.
- [ ] Observe physical-Safari fixture import and actual counts/camera. Provide/verify device execution of existing char3dHooks isolated fallback and restoration. Desktop/page.evaluate evidence is insufficient; no personal-save overwrites or new runtime architecture.
- [ ] Record device/iOS/Safari, viewport, source SHA, power/thermal conditions and exact fixture/actors. All current entries are NOT_RUN.
- [ ] Check every archetype representative,8 canonical emotions, idle/walk/reactions, reduced-motion, growth/archetype changes, supported region transitions, repeated2D↔3D and background/return.
- [ ] Check1/5/27 actual native actor compositions, one-actor fallback without whole-renderer failure, counters/cache cleanup and exact save/actor restoration.
- [ ] Run a proposed30-minute sustained-play interval; record elapsed duration, crashes/reloads, memory pressure/heat/responsiveness, frame distribution and visible hitches. Compare2D sequentially with the same fixture/camera. Report limits; do not invent a universal FPS PASS threshold.
- [ ] Attach actual observations and Human device acceptance. Blocked/not-run/fail are distinct from PASS.

## Task 3 — Final isolated integration audit after Human/device gates

Files: subsequent integration manifest/evidence under existing `docs/qa/character-3d-full-v0/`; candidate-only code changes as required. No production/main merge is authorized.

- [x] Read-only dependency snapshot: main0b0a6b30 (Resident Expression PR368 merged); Motion PR375 merged via cc4dce9e; World PR374 still Draft/head0e0ccfd2; Pilot PR372 still Draft/headd12ad705. This is not final integration approval.
- [ ] Fresh-pin main, World, Resident Expression and Motion, identify dependency order/Pilot inclusion and prepare an isolated combined candidate. Do not silently merge another lane's Draft into main or treat a changing World head as frozen.
- [ ] Resolve mechanical conflicts with exact parents and diff evidence. Resolve semantic conflicts: resident emotion→canonical mapping, one Motion owner/reduced motion, role/stage/fallback selection, regional3D↔2D lifecycle, visibility/cache/disposal, no actor/save mutation, identical save/schema and migration behavior. Record every resolution and affected check.
- [ ] Run dedicated suites, scoped mutation controls with restoration, full npm/Relationship regression, Runtime/Home/Character CI on that same combined candidate. Audit protected2D/Expression assets and save/schema hashes. Reuse unaffected archived images with exact source/content proof.
- [ ] Recheck affected visual/device cases and actual-device performance on the final combined source. A pre-integration iPhone result cannot by itself certify post-integration behavior.

## Task 4 — Final decision package; no automatic merge

- [ ] Present final source/tree/parents, Human batch coverage and exceptions, actual iPhone matrix, CI/test/mutation results, performance/appearance/save protection evidence, and every unresolved item with severity.
- [ ] If any required case remains NOT_RUN/FAIL/BLOCKED, report it openly; do not state all conditions are met.
- [ ] Wait for a new, explicit final approval naming the merge result/dependency handling. Keep PR376 Draft and unmerged until then. Do not auto-Ready, auto-merge or change Pages.
