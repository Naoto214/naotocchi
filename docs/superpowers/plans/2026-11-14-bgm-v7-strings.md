# V7 B string quality Implementation Plan

> Execute inline with superpowers:executing-plans; independent review before delivery.

**Goal:** Improve recorded-string quality and musical joins without changing the user's preferred B arrangement.
**Architecture:** Immutable V7-B score/piano; source analysis and pinned CC0 recordings; separate performance articulation map; A original/B1 native processing/B2 verified alternate sources; additive comparison.
**Tech Stack:** Python/numpy/scipy/soundfile/FFmpeg, existing WebAudio speaker-check-1 player.
**Spec:** prototypes/bgm-v7-strings-20261114/DESIGN.md

## Constraints / review focus
- Preserve every original score event and all metadata; no new string voices. Check piano stem hash and V7-B MIDI.
- Sample octave naming varies: measure pitch, not only filename/SFZ labels.
- Short join tails must reduce phrase dips without swallowing rests or adding long dissonant overlap at harmonic changes.
- Check used recording length after trim/resampling; fail rather than loop/stretch.
- Same baseline mix levels/LUFS and preserved piano dynamics; no louder-is-better comparison.
- Source licenses pinned; do not claim subjective beauty from numerical tests.

- [x] 1. Diagnose V7 used strings and VSCO viola; pin and measure alternative raw cello; save per-note and per-recording evidence.
- [x] 2. Test phrase continuity/rest preservation/native-length failure, implement performance map and sampler, render only8 home variants; retain originalB by reference.
- [x] 3. Check artifacts/3158 notes/50placements/audio peaks/mono/loops/piano/phrase seams; document exact sources; save independentDraftPR.
- [x] 4. Build additive A/B1/B2 full+climax comparison inheriting speaker fix, run browser/byte/scope checks, independent review, publish URL and wait for user's quality selection.
