# Revised merge gate / technical audit — 2026-10-11

The latest user directive removes fine293 Human art approval as a pre-merge condition. Overall quality is accepted, Naoto/deer remain approved and frozen, and minor differences belong to a post-merge Quality Pass. No individual293 PASS is invented. Technical safety and actual iPhone basic operation/27-native-actor performance remain required. Ready/main merge still require explicit final approval.

## Verified source and reuse

Fresh Character HEAD `7d2200e04a5200ce5e937d81bc77a1db5cfac354`, main `0b0a6b30e8e098472b2fa965604f4901874942e3`. Complete history proves main is already an ancestor; `git merge-tree --write-tree` returns the exact unchanged Character tree. Resident Expression368 and Motion375 are merged and included. There are no non-doc changes since runtime source00a83a4. Its Character38140123557, Runtime38140131275, Home38140131288 were freshly confirmed SUCCESS;3022+80 full-regression PASS is reused only for this source.

`meguru.js`, Expression and life-stage files match main. The only script.js difference is URL-only Character renderer parameters/player-key callback. Existing2D selection and per-actor fallback remain. Shared Character production files and both frozen models are unchanged by this audit.

## World dependency findings

World PR374 is still Draft/unmerged, fresh head `ebec89db9add8d0de28dbf07d8416f61868dc9e3`. Its latest increment is documentation/diagnostic tooling, but the accumulated renderer/simulation lane differs substantially. A disposable isolated merge finds conflicts in index.html, meguru-3d.mjs, meguru.js and package.json. Neither lane was overwritten or published as a combined implementation.

An important semantic conflict exists: World’s billboardVisible checks the2D player board; Character3D intentionally hides that board when a3D instance is successfully presented. A textual combination would report healthy3D as missing. Active-representation visibility must be designed/tested before combinedWorld safety can pass. Preserve Character presenter wiring, endFrame/despawn cleanup, scene reset, Expression QA APIs and animation-level propagation while integrating World ghost cleanup/adaptive DPR. Both test lists must survive; cache tokens must describe actual resulting assets.

This is a combined-candidate blocker, not evidence that the current Character-only source loses characters. The full World Draft must not be silently imported merely to make a conflict check green. Final dependency handling must identify whether376 lands with currentmain first or follows a separately approved integrated World candidate; existing PRbase remainsPilot.

## Remaining required evidence

- Resolve and validate the combinedWorld contracts, including visibility diagnostics, fallback, cleanup, region lifecycle and save boundaries; run affected dedicated/mutation/browser/CI checks on exact final source.
- Actual physical iPhone basic operation and27-native-actor performance remain NOT_RUN. Existing [device record](../batch-human-qa-20261011/iphone-device-record.json) and verified [1/5/27 fixtures](../batch-human-qa-20261011/iphone-fixtures.json) are reused. Desktop/SwiftShader/URLs cannot pass this gate.
- Report final result and await explicit final approval. PR376 stays Draft/open/unmerged. This audit does not certify readiness.

## Fresh targeted verification

109/109 related tests PASS,0fail/0cancelled/0skipped. Runtime integration mutation29/29 detected, exact bytes restored, focused GREEN restored. All11 protected hash groups match the unchanged fixture. These results apply to currentmain-containing Character source, not an unresolved combinedWorld candidate.
