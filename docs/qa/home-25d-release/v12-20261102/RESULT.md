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

## Full-text follow-up (2026-11-02, supersedes the prior real-text gate)

The owner selected full text at once, not paging. No paging, truncation, new images, queue-priority changes, or timer changes were introduced.

- The former blocker used a synthetic sentence repeated 15 times. It is not an authored runtime conversation. Arbitrarily long injected text remains a physical size constraint; its failure is retained as a diagnostic and is not described as fixed.
- Landscape rail width is now min(400px, 60% viewport width). All nine meters use three columns in 62px; all 5+4 buttons remain 34px high. The notice and comment share the available text height according to their actual rendered content. Portrait text grows into the character viewing window without changing the reserved world or fixed meter/button coordinates.
- The optional partner information row uses its natural height, rather than a scrollable 40px panel. Selection labels follow the adjusted presentation window. Asset load and content changes remeasure the presentation.
- The real 80-character save-error notice plus a real 29-character character statement were tested together. This is a representative long runtime case, not an exhaustive proof over every interpolated string or user name.

|Viewport|Notice height|Comment height|Document scroll size|Result|
|---|---:|---:|---|---|
|844×280|46|34|844×280|Both texts entirely visible; nine meters/buttons retained|
|568×320|46|74|568×320|Both texts entirely visible; no meter text overflow|
|320×568|74|80|320×568|Both texts entirely visible; character window becomes 112px with one actor|
|375×667|57|80|375×667|Both texts entirely visible|

The final 28-actor 844×280 check retained all 28 actor nodes, natural-height partner information, a 129px character viewing window, and all nine meters/buttons. The centered choice overlay remains x242/y88/w360/h104 and closes after clicking an actual answer. Existing tap/drag handlers and world code were not edited; physical iPhone touch and every actor's drag have not been revalidated in this session.

Final local checks: **72 runtime tests (69 previous + 3 focused V12 geometry additions), 11 package guards passed**. Original iPhone Safari expression-edge symptom remains **unreproduced/unconfirmed**, not claimed fixed. Existing symbol substitutions and unresolved character/egg glyph inventory remain as previously recorded.

The measured runtime cases are ready for the owner-private V12 preview. Extreme synthetic text / smaller character viewports remain explicit limitations; no claim is made that all possible text lengths can fit without scrolling. Draft status and main/Pages protections remain mandatory. Deployment result is recorded in the PR after the hosting service confirms it.
