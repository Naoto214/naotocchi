# V6 implementation ledger
Spec PROPOSAL.md A approved, including F1/F2 and D1/D2 as experiments only. Work from a6e0248. Stage1 complete. Latest remote matched a6e0248 at start; Draft/base unchanged.
Decision: use unchanged V5 CSS/terrain/catalog and canonical gameMove for editor; candidate labs are isolated. No repeated approval requests within approved scope.

Stage2 complete: explicit inspect/apply UI, material-specific typed parameters, stable instance identity on move/update, V5 CSS/render/input reused. Settings tests RED missing module → GREEN 2; full regression 252 passed. Experimental/species expansion follows in stage3.

Stage3 complete: 31x8 canonical image/crop registry (four original species crops identical), actual species IDs passed to unchanged movement functions. Extended-ground ruleset clearly labelled; salmon does not inherit fish swimming. Typed actor editing, stable new IDs after moving old objects. 256 regression tests passed. Asset manifest prepared independently; no PNG edits.

Stage4 complete: canonical solver/search in cancellable Worker, explicit placement-error/possible/impossible/unknown, ruleset labels, shortest playback and instance/pair-specific effect-ban witnesses. Cap is never impossibility. 259 regression tests passed. Results invalidated after physical edits/Undo/restore; callbacks use job tokens and captured workers.

Stage5 complete: editing Undo/Redo separate from PlaySession gesture Undo; named 30-slot local library, title metadata, strict schema/import validation and explicit V5 copying. Incomplete placement can save but cannot play/solve. Test fixture initially mutated a board without updating its signature; corrected to use real erase edit (implementation correctly reset stale progress). 262 regression tests passed.

Stage6 complete: isolated F1/F2 lab UI, current-species/stage candidate flight, wind route and landing checks, cooperative latch map, transform-loss test, separate experiment journal/storage/Undo. Fixed-stage movement search and ground-switch-ban proofs saved in flight-results.json; transform controls excluded from shortest claims. 265 regression tests passed.

Stage7 complete: D1 dig+enter and D2 dig separately, experiment-role tuple rechecked after transforms, indestructible rock, irreversible soil opening, supported crate gravity, teammate-order puzzle. Both shortest movement/dig witnesses 17 steps; support-ban and early-support-removal graphs exhausted without solution. Terrain/boxes/actors restored by journal Undo/save. 268 regression tests passed.

Stage8 implementation/QA complete: 276 Node tests passed; actual editor and all four lab handlers passed synthetic-DOM checks. Native Canvas: 248 assets loaded, 496 renders, 12 V5-exact boards, eight exact lab Undo roundtrips. V3 fresh 100 shortest searches (167616 expanded), 600 world replays, eight picture pages x six. Independent review: five important findings fixed with regression coverage; legacy implicit IDs and V5 import-progress preservation also checked. Public allowlist and V5-source hash protections passed. Supplemental whole-Pages suite: 15/21 passed; six blocked by absent historical checkout files, explicitly not a successful full suite. Browser/CSS/Safari real-device unavailable. Final GitHub CI and owner-private update follow this checkpoint.
