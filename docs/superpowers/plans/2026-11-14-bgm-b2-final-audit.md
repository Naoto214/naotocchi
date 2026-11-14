# B2 Final Audit Implementation Plan

> Execute inline with superpowers:executing-plans; final independent review.

**Goal:** Protect B2 and validate only demonstrated quality improvements on home4.
**Architecture:** Frozen B2; source audit; isolated piano cache correction with frozen mixing; separate comparison only after gate.
**Tech Stack:** Existing Python, NumPy, SciPy, FFmpeg, speaker-check-1 player.
**Spec:** prototypes/bgm-v7-strings-20261114/final-audit/DESIGN.md

## Constraints and review
No original/master/score edits; no production or other28 render. No new dynamics curves or reverb. Cached long notes equal fresh notes; short-note samples unchanged. Original mix gains/EQ frozen; no balance recalibration. Source lengths, pedal ends, stereo/mono and artifact hashes checked. Never equate measurements with subjective beauty.

- [x] Pin user-selected B2 audio/source to tag and hashes.
- [x] Audit home piano and all32 instrument inventory without regenerating masters.
- [x] Review alternative source licenses and representative raw piano recordings.
- [x] Red short-then-long regression; isolated full-source piano cache; green fresh-note equality, unchanged short notes and release.
- [x] Reconstruct old piano and freeze mix parameters; measure correction and decide whether comparison is warranted.
- [ ] If justified: home4 only, output verification, additive B2/B2+ page, browser regression and independent review.
- [ ] Save report, GitHub checks and candidate status; wait for final approval.
