# VERSION 12 — presentation candidate

Base: PR #490 V11 `266fd4beb56c2c97f133c3df4de10d4ff675e992`.
The four original runtime file Git blob hashes were checked against this exact remote commit before editing. Existing source reused; no full repository download. Free disk about 6.3 GiB.

## Changes
- Portrait: information at header bottom +3, then 42px centered notice; 76px comment with 8px gap before 80px meters; existing 5+4 controls.
- Landscape follow-up: 40px information remains upper left. Right rail is up to 350px wide and ordered notice, comment, three-column meters, 5+4 buttons. At 844×280: notice y49/h34; comment y86/h46; meters y135/h62; controls y200/h72. All nine meter labels/values and all nine 34px-high buttons fit, without meter text overflow. At 568×320 the rail has 88px meters with label/gauge/value stacked, and 60px comment height. No world sizing changes.
- Choices: temporary viewport-centered overlay, scrollable height limit; existing close/result logic and queues retained.
- Mark clipping candidate: expand the occlusion mask canvas 256px per side and compensate mask origin/size. Polygon coordinates, actor position, images and animation are unchanged. This addresses the rectangular edge of the mask image. Original iPhone symptom has not been independently reproduced; complete resolution on that device is not verified.
- Upper notification renderer explicitly uses existing catalog symbols. 93 literal pictographs found on script.js notification-producing lines: 69 existing symbol mappings, 24 animal/character identities deferred to avoid selecting the wrong growth-stage picture. See icons.json. No new art.

## Verification
- Related runtime tests: existing 69 plus one focused landscape lane test, 70 passed, 0 failed.
- Packaging guard tests: 11 passed.
- Managed Chromium: portrait 375×667 and 320×568; landscape 568×320 and 844×280; 1/28 actors; short/long comments; question displayed centrally and actual button closes it; 9 controls and all 28 DOM actors present; portrait document height equals viewport. Recorded stable 320×568 positions: info y49 h40, notice y92 h42, comment y289 h76, controls y457 h103. Landscape 844×280: info x26 y49 w524 h40; notice x558 y49 w260 h42; comment x558 y112 h76; controls x558 y192 h80.
- Explicitly unverified: WebKit/iPhone Safari, physical touch drag after rotation, original mark-clipping reproduction, all 28 actors individually dragged, full 13-region regression. No claim that these passed.
- No world model, navigation, collision, growth, save schema, background asset, character asset or other game edits.

## Publication gate
All nine parameters and 5+4 controls now fit the requested short landscape dimensions. However, the existing long-text QA fixture (the sentence 長い文章でも読むことができます。 repeated 15 times) needs 371px of content in the portrait 76px comment dock and still scrolls internally. The fixed right comment also cannot show this much text at once. No content was truncated or hidden to manufacture a pass. Thus the unrestricted no-internal-scroll requirement remains unmet; a separate long-text presentation decision (such as explicit paging) would be needed to preserve all text at readable size. Do not publish as completed V12.

The original iPhone Safari mark-edge symptom remains unconfirmed: sampled Chromium hungry expression has no reproduced crop; assets and animation are untouched. Notification substitutions are unchanged. The notification QA shows OS glyphs for unresolved animal identity (🐕) and egg (🥚); zero remaining OS emoji is not claimed. Existing icons.json is a source inventory, not proof of zero runtime glyphs.

Keep V11 live. PR remains Draft; no main merge or production Pages update. No new images or deletions. Normal disk remains approximately 6.3 GiB free.
