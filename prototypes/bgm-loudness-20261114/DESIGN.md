# Final playback loudness optimization

User explicitly authorizes correction of the proven0.9/0.36 BGM route mismatch, full32 technical analysis and preview publication without further listening/approval. Existing PR549 and all music are immutable. Individual track gain stays0dB. No compressor/limiter/eq/synthesis or save/selection changes.

Implementation choice: pass level:.36 at the single bgm-subapps.js forPage call, so the three callers match audio.js parent chain0.9×0.28×(0.4/0.28)=0.36. Prefer this over changing generic forPage defaults or track gains: it isolates the authorized3pages and preserves custom/generic player behavior. Cache-bust only the three HTML script references. Production integration is not in PR549's root; reference files are pinned to preview0433a39, and this folder carries the deployable patch and analysis. Do not overwrite production audio.js.

Investigate full graph (loop, jingle, speech duck, SFX and explicit user settings). Real browser instrumentation and offline rendering validate constant scale, fades, stale requests and route changes. Reuse existing iPhone output implementation unchanged; never equate headless/WebKit output with physical iPhone audibility.

Detailed audio analysis: existing AAC/FLAC EBU R128 timeline plus frequency-energy, mono measurements and3 hypothetical small-speaker filters. Generic sensitivity models only, no device-specific measured claims. Preserve source hashes; analysis streams/output only. Analyze steady-state transitions plus actual audio sum with existing linear fade envelopes, jingle duck/delay and navigation nonoverlap. Report event positions/model assumptions; don't turn one transition into a universal subjective prediction.

Changes to state/lifecycle only if a concrete duplicate-playback defect is reproduced and minimum fix is necessary; otherwise no scope expansion. Deliver independent Draft PR, preview-only update, full reproducible reports and objective/physical limitations.

## Reproduction and evidence

Pinned music: PR549 commit01a55914244b8cf74f3cd467ef9b83beb23f8e13. Pinned runtime: playtest0433a39d2b75a3a7931d095dd18127958b0bb89a. `reference/` contains the latter files; `preview/bgm-subapps.js` is the only runtime patch. `prepare_playtest.py` applies this and three cache references to the preview checkout.

Python3 with numpy/scipy, FFmpeg7.1.5; `tools/analyze.py`, `tools/transitions.py`, then `tools/report.py`. The preserved `analysis/baseline-measurements.json` contains all64 source SHA256 and100ms ebur128 M/S/I/LRA traces from the preceding audit. Its full-file measurements use `ffmpeg -i INPUT -af ebur128=peak=true -f null -`; this pass adds playback-period/mono/filter/transition measurements without rewriting sources. The original file hashes must match before reuse.

Run `verify_preservation.py` and `verify_scope.py` against the source and preview checkouts. Node with Playwright and Chromium/WebKit: `test_gain.cjs`, `test_routes.cjs`, `test_lifecycle.cjs`, `test_subapp_states.cjs`. The local preview server is port8772; use the paths/environment recorded in test sources. Also rerun unchanged PR549 `tools/test_output.cjs` and `test_output_loading.cjs` with `COMPARE_URL=http://127.0.0.1:8772/bgm-v7-complete/`. All archived audio paths must be hydrated when using a sparse checkout. These tests observe digital graph/media state, never physical speaker audibility.

Test input distinctions: actual HTML documents establish the route; controlled scene/DOM states exercise the unchanged selection logic; OS speech is stubbed; sink/audio-session interruption events are synthetic. Raw snapshots and logs are in `verification/`. Save compatibility is supported by unchanged save/schema code plus sentinel persistence, not an exhaustive migration test of every historical save.
