# 朝昼夕夜4大テーマ・2.5Dホーム試聴 VERSION 1

## Scope and implementation choices
The user's complete brief is the specification. Independent branch from main e0120c58; Draft PR only. New files only. No main merge, prior-PR updates, composition, arrangement, source-note changes, background changes, or production-runtime changes.

Use the original V1/V2/V3 song objects and V2 sound engine brought byte-for-byte from PR #528's pinned tree 740225ef. Display metadata alone supplies the four official titles; retain both deferred songs in the original objects.

Build a separate private site containing an unchanged runtime snapshot. An isolated generated home document loads production HTML/CSS/renderer and a sample resident fixture. Presentation-only NaotocchiDaypartsQA selects region/time. The fixture runs in ephemeral storage on a separate origin. Controls live outside its frame, so original home layout, movement and occlusion remain unchanged.

Existing audition sound modes are reused (piano default). Render the original engine into audio buffers; one gesture-unlocked AudioContext plays them through per-source gains and a master gain. Time changes crossfade over four seconds; stop cancels pending work. Manual, device-local clock, and accelerated-day modes are mutually exclusive. Four-song sequence plays each complete original rendition. Loop repeats a selected track or the sequence. Background changes reuse production four-second fade.

## Plan
- [x] Verify source blob hashes, original home data, 52 backgrounds and preserved deferred songs.
- [x] Test boundary times, sequence/repeat behavior and async stop/switch races, then implement controller/player.
- [x] Build responsive audition controls and production-home fixture; package only required runtime files.
- [x] Validate original-data identity, audio events, static asset closure and existing audio regression. Inspect browser layout and controls; disclose no physical iPhone available.
- [ ] Review diff, save independent Draft PR, publish owner-private URL and record validation.

## Review focus
Rapid switching while rendering; stop during loading/fading; audio interruption/hidden tab; midnight and exact boundaries; narrow portrait and landscape layouts. No claim of physical iPhone or subjective listening verification.
