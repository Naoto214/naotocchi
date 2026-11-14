# VERSION 7 checkpoint ledger

Plan: docs/superpowers/plans/2026-11-14-bgm-v7.md
Baseline: 146383829818fc986926c05700986705d7241858 / PR #546.

- Isolated worktree /workspace/work/bgm-v7, branch codex/bgm-v7-chamber. No baseline changes.
- User already specifies A/B approaches; this phase stops at their selection, not at additional design approvals.
- V6 diagnostic: 277 sustained auxiliary notes, 44 avoidable cache-induced artificial extensions (25 clarinet/16 flute/3 viola), 0 cello. Full source recordings generally 6–14 seconds; note demands are much shorter.
- Pitch diagnostic: solo violin G3 sample ~196Hz/MIDI55 (standard octave); cello E1 ~82.4Hz/MIDI40 (filename octave offset+2).
- Sample source candidates: VSCO CE solo violin p and cello section v1 (CC0); VCSL checked but no corresponding bowed string source. No unsupported premium-quality claims.
- Completed A/B4 scores; 3158 melody events and all piano events exact. Other28 unchanged.3 sampler/preservation regression tests pass.
- Full V6 mix reconstruction residual -117.48 to -117.73dB; piano stems verified by SHA. Native string source manifests verified.
- Eight variants measured: -23LUFS, clipping0, no limiter, mono and loop pass. NightA exactV6; nightB first half sample-identical.147 native string notes, artificial loops0.
- Chromium and WebKit:12 AACs and all3-way comparison controls passed. Screenshots saved. No physical iPhone test.
- Independent read-only review: no blocking findings. Ready for Draft checkpoint and additive playtest publication.
- Saved all8 variants to independent Draft PR #547, baseV6, headcodex/bgm-v7-chamber. Initial source/audio checkpoints646a72a +1e64c2a.
- Published additive-only playtest commit c6bfd8e984f7d51f483967c238aff54dabbef97c (12new paths). Existing file changes0, checked via git objects despite sparse checkout. Pages run43552522268 awaiting deployment completion.
