# VERSION 6 checkpoint ledger

Baseline: 0cf8100d3ad85888f5e32f670a56631ecb4e82ce (PR #544).
Plan: docs/superpowers/plans/2026-11-14-bgm-v6.md.

- Setup: dedicated sparse clone, codex/bgm-v6-expression. No AGENTS.md in baseline Git tree. Source sample SHA-256 verification in progress.
- Design: explicit per-track expression, selective existing voices; no newly generated notes. User already authorized implementation, batch pushes, Draft PR and playtest publication.
- Preflight: arrangement -> score -> renderer -> receipts -> comparison. All use unchanged IDs and durations. Old audio protection checked by immutable Git blobs, avoiding a 6.3 GB unrelated checkout.
- Pending: preservation tests, home batch, four groups, comparison, playtest, final review.

## Home checkpoint
- 32 explicit score profiles and nine-aspect analyses authored. New notes: 0.
- Preservation tests RED (missing V6) -> GREEN; fingerprint and FFmpeg compatibility regression tests GREEN (4 tests total).
- FFmpeg 7 emits progress after loudnorm JSON. V6-only raw JSON decoder added; V2–V5 sources unchanged.
- Home render/verify: 4/4 OK, -23.00/-23.01 LUFS, TP -5.40..-4.04 dBTP; clipping 0; mono loss -1.31..-1.17 dB. Main melody matches V1 and V5 MIDI.
- Pending: independent night continuity comparison, remaining 7×4 renders, browser comparison/playtest publication, final review.

## Group 2 checkpoint
- poyo-1, koro-1, card-2, game-1, explore-1, event-2, event-1 rendered and verified (7/7).
- Home-night V5→V6 continuity: median dip 12.2→12.1 dB, 90th percentile 20.1→20.0 dB; no measured regression.
- Comparison page initial implementation saved; browser checks in progress.

## Group 3 checkpoint
- kisetsu, ohayo, bgm-game, bgm-race, bgm-farewell, poyo-2, game-2 rendered and verified (7/7).
- V5 original 64 audio hashes verified. Chromium mobile viewport player tests passed; WebKit dependencies being installed.
- 32-track nine-aspect score analysis exported to ANALYSIS.md; 18 rendered-pair measurements in VALIDATION.md/measurements.json.

## Group 4 checkpoint
- explore-2, board-b, fishing-a, lullaby-a, jingle-achieve, jingle-card-lose, var-poyo-clear rendered and verified (7/7).
- System WebKit libraries are unavailable; required Debian packages extracted to task-local work/ only for browser validation.
