# V12 safe-UI follow-up — 2026-11-03

Base: d604642e5a05f17beb373ec0b6398204577cd09c, Draft PR #490.
Status: partial fixes saved; private Site is NOT updated.

## Retained changes
- V12 production notice text now goes through the existing parameter-delta filter at the common renderer. The earlier renderCareNotice path filtered text, but ordinary story/event notices bypassed it unless environmentMoment was set.
- The filter retains natural growth prose (e.g. せいちょうした), removes named parameter +/-/arrow deltas including fractional computation values, and retains age, counts and milestone numbers.
- Speech and character action quotations retain their text. V11/default homeText behavior and original event payloads remain unchanged.
- Landscape retains the saved 6% zoom-out. Freeze measured screen height/min-height before scaling the frame; otherwise the frame's enlarged unscaled height feeds back through min-height:100% and stretches the native stage. Existing style restoration removes these overrides before portrait measurements.
- Prior passive-notice/speech interaction and exact formal-icon reuse fixes are retained. No game state, walk model, navigation, formal artwork, background asset, font-size rule, central choice, meter or button changes.

## Focused checks
41 tests passed (V7 comments; V8 viewport; V10/V11/V12 layouts and queues; V12 icons/interaction; 3 new notice-text tests). Syntax checks passed.
New tests cover each notice target, fractional deltas, age/count/milestone preservation, quotation/V11 protection, and the real story-event route with its original payload unchanged.

Browser local QA, 28 actors:
| View | Notice | Comment | Native stage | Other UI |
|---|---|---|---|---|
| 375x667 | y92..134, 42px | y392..468, 76px | 380px | 9 meters / 9 buttons, no document overflow |
| 320x568 after landscape rotation | y92..134, 42px | y293..369, 76px | 380px, height overrides restored | 9 / 9, no document overflow |
| 568x320 retained overview | right rail | right rail | 380px, displayed about209px | left pane187.2x312; 9 / 9, no document overflow |

## Unresolved conditions
1. Portrait full clearance remains unresolved. The UI-free vertical gap is258px at375x667 and159px at320x568, before margins/effect envelopes, versus the unchanged380px stage. Bottom-only translation from the prior saved revision makes the stage top4px / -95px respectively. Upper actors overlap the reserved notice even when no notice is visible. Translation alone cannot fit the entire current stage between both fixed lanes. No forced shrink, clipped-head concealment, world-coordinate restriction or save change was introduced.
2. A full-artwork landscape experiment was checked and rejected. It could fit all28 actors after freezing native height, but at844x280 the displayed380px stage became about86px high, leaving very small actors inside the unchanged384px left pane. The production code retains the earlier modest zoom-out rather than this excessive reduction.
3. The reported purple line was not reproduced or positively identified; no arbitrary meter/selection colors were removed. Removal is not verified.
4. Of28 distinct weather/time/region-event symbols passed through the actual story renderer, the unresolved icon was 🪼 (deep-sea glowing-jelly). Existing explicit frog/butterfly mappings and companion/partner art were retained. No unapproved asset or arbitrary jellyfish growth stage was added. This is a targeted event-path check, not an all-screens emoji audit.
5. iPhone Safari itself was not available in this browser environment; actual-device clearance is not claimed.

## Preservation / publication
PR #490 stays Draft. Main, production Pages, formal images/backgrounds, other games and save data are untouched.
No large duplicate checkout or deployment archive was created. The existing sparse source and QA were reused.
Existing unchanged private trial: https://naotocchi-home-490-20261031.kerzion214.chatgpt.site
