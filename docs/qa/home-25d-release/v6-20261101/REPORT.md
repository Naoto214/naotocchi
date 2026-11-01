# VERSION 6 notification QA — in progress

Start HEAD: `79f18b8a23669d0e980311eb530a1779aaa43019` (clean fresh checkout). Current main (git ls-remote): `aec03c20ae8b064c6c2f8aca5537f1938df6439f`; PR base snapshot: `7c1f18c77b902d06159157899c36104e5d8c4a8d`. PR open/Draft; no concurrent PR update at pre-push check. Existing V5 nine workflows success.

## Root causes and implementation
- renderCareNotice chooses eventText for the displayed prose but used the urgent care assessment for data-care-icon. Its float pseudo-element therefore attached hunger art to unrelated messages. Production terrain no longer emits this persistent state icon. Event-authored art remains; care recommendations and expressions are unchanged.
- Cascaded terrain CSS used centered max-content boxes, text-wrap:balance and overflow-wrap:anywhere. Short Japanese words could break at arbitrary glyphs. V6 uses the available lane width, left alignment and normal wrapping. Intl.Segmenter words plus short grammatical suffixes form bounded inline boxes. Every character is retained; boxes wider than the lane can wrap. This is a heuristic, not a claim of perfect Japanese syntax. Without Segmenter, full text still wraps.
- Speaker name was a pseudo-element under a 20px picture, restricted to an 11px line. V6 moves it into a real independent grid row. Icon, name and body have separate layout cells.
- Keep the existing 42px lane and ResizeObserver measured extension, 76px speech, birth gold decoration, stage geometry and controls. Do not alter queue/timers, state thresholds, assets, save schema or model.

## Evidence so far
- Added test first: hungry event incorrectly emitted `hunger`; helper missing. Both failed, then passed with the change.
- Focused 12 tests pass, fail/skip/cancel 0 (notice queue/layout, birth contract and new V6 assertions).
- Local cloud Chromium screenshots: forest 320px keeps 食べずに; desert 320px keeps しばらく; long name occupies its own row. Camera event art retained. These observations are not WebKit or iPhone proof.
- Authored corpus generator extracts 35 literal setMessage calls, all string events in STORY_EVENT_POOLS, all regional arrival lines, and long-name/long-token cases. New Chromium/WebKit CI checks full text, word line rectangles, bounds, 42/76 and restoration.
- Existing V5 tests and all 13-region/28-actor/rotation/birth/interaction suites retained without assertion changes.
- npm test and production lifecycle regression still running at first commit. CI not yet run on this commit. Not ready for publication.
- First HTTP verification was mistakenly run after QA-only files were added; strict inventory correctly rejected those extras. Re-run against a clean runtime package before release.

## Publication / protection
V5 remains live and owner-only (owner 1, groups 0, external 0). Recovery saved version: `appgprj_6ae5bc78994481919b5d33849da61d0f~appgver_7878e60e3eec819183a2908452a7f80a`, source `453ebfd76d6290a5c753ea6bf413add71ba40b46`. No V6 deployment yet. Production Pages and main untouched. QA namespace V6 is independent of normal and V5 QA saves.

## Forest / jungle
Shared central receding path and dark green mass dominate both compositions despite temperate waterfall/stream vs subtropical red earth/foliage. J2 should use open fern-covered forest floor with large tree ferns and broad leaves, no central path, preserving safe central space. J2 is deferred until notification release gates; no assets changed, no separate PR yet.

Pre-push: production contracts 365 passed (0 fail/skip/cancel), clean runtime HTTP verification 4123 files / 220210662 bytes, missing 0, mismatch 0, excluded 7 paths 404. Direct Git push unavailable (no credential); use GitHub connector non-force expected-HEAD update. Full npm regression still running.

Corpus review before CI: include action results, blocked-action lines, seasonal announcements and partner encounters. Empty-message literals are exercised by the explicit reset/expiry case instead of asserting a visible body for an empty notice. Production source unchanged in this follow-up.

## Review follow-up
- Full local npm test on 3b0bce5e: 3752 passed, fail/skip/cancel0. This precedes the following review fixes; final CI remains required.
- Reviewer found legacy32px event art in24px grid cell. Reproduced with actual Chromium at320px: art right49px vs body left47px. After constraining actual art, right41px/width24px vs body left47px (6px gap). Browser regression now checks all visible artwork descendants, not just wrapper.
- Added a defensive mixed-shell regression: shared renderer threw noticeChunks-is-not-a-function with a production-marked shell and legacy controller. Official retained comparison tooling normally strips the production flag; this is not an observed failure of that supported route. Optional helper invocation preserves fallback; the mixed-shell test failed first, then passed.
- Actual generated V6 storage shim preserves normal and V5 QA sentinels through V6 write/read/clear.
- A repeated package build rejected a nonempty output directory (intentional safety behavior); use a fresh directory for final packaging. No deployment occurred.

Review-fix focused tests15 passed (0 fail/skip/cancel). Fresh clean runtime HTTP check4123 files /220211154 bytes, missing0/hash mismatch0/excluded7 paths404. Browser CI must still pass on the final pushed candidate.
