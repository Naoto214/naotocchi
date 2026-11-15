# Gimmick review implementation plan

Goal: one review entry per existing material ID, retaining PR532 history and separating approval, runtime support and unadopted appearance candidates.
Architecture: independent v4/atlas-review page; imports existing 76-entry catalog, canonical engine/render/input/session and V6 isolated labs. No formal/editor changes. User specification is the 2026-11-15 gimmick review request; authoring/comparison and private update are authorized, adoption is not.
Tech: existing buildless JS/Canvas, Node tests, Native Canvas/JSDOM. Existing dedicated prototype checkout retained; latest535=5737620, base532=fce9067. No AGENTS.md found.

## Design decisions
Keep all 76 IDs as a single material index; retain 64 PR532 proposal numbers separately as history, not new materials. Current engine support is not approval. Preserve nine catalog-adopted entries and user-adopted V5 appearance; show remaining supported items as improvement candidates and unsupported items as held unless their historical proposals were rejected. Mixed historical decisions remain explicit.
Compare selected material on an existing cloned 8x8 stage where possible; unsupported mechanics are static historical exhibits, never simulated as working. F1/F2/D1/D2 stay separate examples. Tap-to-read mode and formal play mode are explicit, avoiding inspection taps moving a character.
Preserve good art. Reuse V6 minimal candidate annotations only on the selected material's cells; for other items candidate is a clearer external explanation, not a new drawing. Keep necessary conditions visible. Native single-tile crop uses same board rendering. 36/48px real-size overflow stays inside scroll areas.
Historical necessity evidence comes from V4 audit, labeled historical, main-only and bounded. Do not claim a new exhaustive search or human fun/readability proof.

## Tasks and interfaces
1. Catalog/research: review.mjs exports reviewEntries (76 unique IDs), history (64 proposal records), symbolGuide, evidence summaries and per-entry priority/meaning/always-visible/details/difference/design. source.mjs generated from PR532 JSON and V4 audit; verify source consistency, counts, approval boundaries, evidence limits, protected hashes. Generate INVENTORY.md. Tests then commit/push.
2. Comparison: scenes.mjs exports sceneFor(id,variant), returns cloned draft/optional existing LabPlayback plus witness/target cells; paint.mjs uses unchanged renderers, selected-target overlays and drawTile crop. index.html/ui.mjs show list/filter, old/candidate, single tile36/48, board, inspect/play/Undo/reset/witness, live conditions and history. No persistent mutation. Tests for all76 scenes, valid witnesses, no new IDs/rules, retained old pixels and candidate isolation. Commit/push.
3. QA/release: native image sheets and synthetic DOM actual handlers at320/375/390/430 widths; full regression, one fresh final reviewer, fix Important RED/GREEN, preserve package bytes, private Sites update. CI/HEAD/limits recorded and commit/push. Browser/Safari only if supported tools available.

## Review focus
- Historical 'existing' or proposed status incorrectly becomes formal approval.
- Held NPCs/mechanics accidentally playable or candidate diagrams treated as physics.
- Tap inspection triggers movement; style/size resets play; moving crate crop stale.
- Overlapping target tile annotations hide approved arch/exit/character.
- Exhausted/limit/null audit statuses aggregated misleadingly; no-main evidence called useless.

## Ledger
Skills: brainstorming/writing-plans, inline executing-plans/TDD. User explicitly requests comparison implementation now; no further formal-adoption approval inferred. Tools/scripts from cloud skills not mounted; this tracked ledger is the equivalent resumable record. Baseline clean dedicated branch, no parallel implementers. Final reviewer only.
Task1 complete: 76 unique IDs + unchanged64 proposal records, field-specific semantics and priorities, historical necessity summaries. RED missing module → GREEN4 tests; full290/290. Key finding: hold/weight use the same current predicate; preserve both IDs and flag overlap rather than silently unify physics. Unsupported current-engine mechanics remain held even when PR532 says 'existing'.
Task2 complete: all76 entries have shared-renderer single tiles36/48 and8x8 views, inspect/play modes, actual witness animation/Undo; held entries are read-only. F1/F2/D1/D2 are explicit separate variants. RED scene/render/UI missing → GREEN; combined-door OR wording and matching connection endpoints also RED→GREEN. 297 Node tests; native152 preview checks/18 sheets and synthetic76-entry UI/four widths/warp+four lab witnesses pass.
Task2 design clarification: include the selected device's connected switch/door cells in correspondence comparisons; only annotating one endpoint fails to explain the pairing. Unrelated cells and protected fixtures remain unchanged. No formal-source edits. Package/CI include the new isolated folder; existing V6 comparison gets a navigation link only.
Final review: fixed adopted floor/wall fallback descriptions and sign display-coordinate inspection via3 RED→GREEN regression tests (third covers appearance details). Reviewer marked appearance omission Minor; regraded Important because this task promises per-material tap details, and reading a decoration as only floor fails that central requirement. Reused effectiveMaterial instead of inferring a new appearance mapping. Full300/300 +152 native previews +actual UI smoke pass. No re-review.
Review scope decisions: browser/Safari and human understanding remain explicitly unverified; historical necessity is bounded/main-only; deployment verified separately. Reviewer independently ran11 focused tests, while author ran full suite. No approval/physics policy changes or deferred code minors.
Task3 complete: all300 tests/152 previews/76 UI cases passed; one final review's3 issues fixed. Owner-private version16 deployed successfully, sourcec801720.616 non-comparison files preserved. CodeHEADf39fe3f CI3success/2in_progress at2026-11-15 14:00JST. Draft/base unchanged. Final docs-only commit records release; workspace retained per user instruction. Safari/human readability remain owner verification tasks; no new formal rule or adoption.
