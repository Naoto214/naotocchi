# なおぽよ。第1章正式公開 Implementation Plan

> Execute inline with superpowers:executing-plans; independent final review before merge.

**Goal:** Publish the approved ten-stage chapter, protect v1 saves, and canonicalize flight only in the independent lab.

**Architecture:** Merge the ancestry of #434 into an integration branch based on latest main, retaining development sources but shipping only an exact runtime allowlist. The portal opens chapter1; the v1 runtime remains accessible for existing records. No conversion of old stages or saves.

**Tech Stack:** Existing ES modules, node:test, Python Pages allowlist, GitHub Actions.

**Spec:** User's 2026-10-24 release instructions; docs/naopoyo-chapter1-20261023/REPORT.md and docs/naopoyo-v2-gravity-20261023/SPEC.md. User explicitly authorizes implementation, integration, conditional merge and production deploy without interim approval.

## Global Constraints
- Initial stage01 only; permanent IDs and append-only unlocks; separate QA key.
- No #422 stages 13–24, flight, QA page, world/insight/v2 pilot UI in Pages.
- Existing v1 store, stages and save keys remain byte-identical.
- Dialogue strips only a full stop immediately before closing quotation marks.
- Flight candidates: butterfly/cicada06, beetle/stagbeetle05; spike occupancy supports the body, air above an empty spike does not.
- Main merge only after integrated CI, full regression, ten engine replays, save/progress checks and review pass.

## Review Focus
- Existing saved v1 boards remain reachable after changing portal.
- Clearing or reloading final/earlier stages never relocks progress.
- Dynamic imports and style/asset dependencies all ship; no lab import is reachable.
- Flying split immediately settles all grounded children, retains active ID, and conserves mass.
- Current main conversation integration must not lose chapter completion signals.

## Tasks
- [ ] 1. Audit PR HEAD/base/checks/reviews and integrate #434 ancestry into isolated branch; confirm no #422 diff and preserve main changes. Run existing puzzle suite baseline.
- [ ] 2. Test official portal, complete runtime dependency closure, old saves and launch paths, punctuation and trial isolation; implement minimal chapter release wiring and exact Pages allowlist. Retain v1 fallback link and adjust release contract tests.
- [ ] 3. Test four flight thresholds, all entry directions, on-spike vs above-spike support, immediate settle after loss, reentry, merge/overflow and deterministic placement/mass. Keep all changes in lab and documentation; use existing shared engine unchanged unless approved bug needs independent reproduction.
- [ ] 4. Run puzzle suite, full package regression (CI if local asset capacity is insufficient), CARD GAME regression, Pages packaging/hash/HTTP and browser flow. Review branch independently, fix important findings with reproduction tests.
- [ ] 5. Save integration PR; verify latest main and exact HEAD CI. Merge when all conditions met, verify Pages deployed files and public flow. Record final commit, included/excluded PRs, results and real-device limitations.

## Progress / rulings
- Latest audited main e7fef44b92233ebcbdcee5b7e9bebb97d3b790e7. #418 already merged. #422 excluded. #434 5a0983d9 includes #432 ac9b441c → #430 599fcb48 → #428 f8094cd7.
- Git merge of #434 ancestry into latest main succeeded without conflicts, despite stale #428 mergeability metadata. Existing PR refs remain unchanged.
- Local checkout is sparse because full repository assets exceed available disk. Production assets will be hydrated; full regression additionally runs against complete GitHub checkout. No missing-asset failure is counted as passing.

- Task1 complete: integrated baseline 505/505 PASS.
- Ruling: preserve v1 runtime through a chapter dialog link, not a save conversion. This protects original board/Undo/clears byte-for-byte.
- Ruling: canFall policy added as a default-no-op shared seam after reproducing flight-via-canEnter incorrectly blocking split placement during gravity merges. Formal chapter never supplies this policy.
- Ruling: light-split body may stop above its split child (normal support), so test asserts settled support rather than requiring the bottom row.
