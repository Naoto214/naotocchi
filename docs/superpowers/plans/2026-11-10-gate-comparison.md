# Gate comparison implementation plan
Goal: Restore verifiable original art and compare without gameplay changes.
Spec: ../specs/2026-11-10-gate-comparison.md
Architecture: original painters → shared display adapter → atlas comparison page. Dedicated selection storage never feeds runtime rules.
- [x] Add tests for empty/corrupt storage, A/B history and export/import, default A and unchanged condition objects.
- [x] Implement shared adapter and selection storage. Keep original painter files unchanged.
- [x] Add responsive comparison page: three states, both sizes, actual board, conditions and selection controls. Add atlas/100-stage links; extend packaging.
- [x] Run focused regression, source hashes, package, browser validation. Review changes and update Draft #535 and owner-only preview.
Review focus: storage failure, malformed imports, narrow display, old numeric-only labels, misidentification of V2 game art.

Review: corrected per-file provenance for new shared modules and 100-stage imports; original painter files remain unchanged. Minor limitation: corrupt browser record requires importing a valid exported JSON; no reset control added.
