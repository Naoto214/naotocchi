# V7 Complete Soundtrack Implementation Plan

> Inline execution with superpowers:executing-plans; final independent review.

**Goal:** Preserve approved home4 exactly and finish remaining28 in four resumable groups.
**Architecture:** Immutable home lock; unchanged V6 musical scores; per-track performance policy, native-sample rendering and provenance receipts; additive final playlist and preview-only runtime assets.
**Tech Stack:** Existing Python/NumPy/SciPy/FFmpeg, GitHub, WebAudio speaker-check-1, Playwright.
**Spec:** prototypes/bgm-v7-complete-20261114/DESIGN.md

## Constraints / Review Focus
No home regeneration (hard failure). No melody/vel/metadata/placement changes. Native takes only; register before velocity when no matching layer. Rests and harmony boundaries preserved; fast-game articulation distinct from slow lyrical music. Per-track source cache and deterministic resume. Verify whole group before push. No runtime/save behavior edits or production merge.

- [x] Inspect PR refs, isolate branch, copy approved home4 and lock IDs/titles/hashes.
- [x] Diagnose all28 event/source requirements; pin source set and write musical policies; reviewer design check.
- [x] Red tests for high-register woodwind selection, short→long source cache, finite release/phrase boundaries and home refusal; implement renderer/sampler/guard.
- [x] Preflight all28 performance/source lengths; render/verify/push group1 (7 tracks), create separateDraft.
- [x] Render/verify/push group2 (7 tracks); resume skips validated group1.
- [x] Render/verify/push group3 (7 tracks).
- [x] Render/verify/push group4 (7 tracks); full32 preservation and sound checks.
- [x] Playlist32 + V6 comparison for28; audio output and next-track/end/loop tests; prepare preview runtime32/catalog only.
- [ ] Independent final review, publish preview, live hashes and scope audit, save finalDraft records.
