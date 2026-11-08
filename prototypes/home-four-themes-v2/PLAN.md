# VERSION 2 implementation plan

Approved scope: user request dated 2026-11-08. Base #529 c3508ff; separate stacked Draft PR and a new owner-private Site. No edits to V1 or any production files.

## Decisions
- Reuse exact V1 original songs/engine/fixture. A and B use fixed-source CC0 VSCO CE instrumental samples, rendered offline. Do not claim a new live performance.
- A: sampled warm piano, sparse complementary accompaniment. B: morning flute/harp, day piano/marimba/pizzicato bass, evening piano/harp/strings, night gentle piano/bells/strings. Melody notes, starts and durations are immutable; accompaniment may change.
- Pre-render compressed playback plus lossless masters and MIDI. Load three versions only for selected song; Web Audio phase-aligned transport, gain-only level matching, local ratings/notes with JSON export. V1 remains accessible separately.
- Build copied official home fixture and 52 original backgrounds without altering original runtime assets. Manual clock slots and13regions. Selected version sequential morning→night.

## Tasks
1. Pin sample provenance and licenses; build event-level arrangements and MIDI exports.
2. Offline render eight arrangements; verify melody, duration, peaks, loudness and seams.
3. Comparison UI, synchronized switching, scoped cache, notes, exports, iOS unlock.
4. Tests, browser QA, independent review, source commit/Draft PR and owner-private deployment.

## Verification limits
Physical iPhone listening requires the owner. Report objective audio measurements separately from subjective quality; never label synthetic or sampled rendering live performance.
