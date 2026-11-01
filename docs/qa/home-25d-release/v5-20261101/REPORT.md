# VERSION 5 — candidate, not yet deployed

## Starting evidence
PR #490 open/Draft at 508f50dd95530de84d0374dcd9f678a297ca35eb; main aec03c20ae8b064c6c2f8aca5537f1938df6439f. All nine starting workflows completed/success. Site owner-private, version 4; owner one / external zero. V4 rollback: appgprj_6ae5bc78994481919b5d33849da61d0f~appgver_7eed432cc29c81919456192af12a92e9; source f8dc1dc1948bc06092b52150d9bb82a2b0f469b5.
Fresh clone had three pre-existing untracked temporary files under unrelated card/character QA directories; left untouched and never staged. Ordinary Git push lacked interactive credentials; used GitHub connector with expected-head check and force=false. Connector tree matched local tree exactly.

## Root cause
The original fixed 42px reservation contains a maximum-40px panel and maximum-36px story text. Later CSS increases font to 15px and line-height to 1.4 (21px). Two lines plus padding cannot fit. overflow:auto makes partial lines scrollable rather than naturally fully visible. This is shared normal-notice styling, not specific to V4 birth decoration or backdrop painting. Before change, forest text measured scrollHeight 44 / clientHeight 40 at 390px.

## Implementation
The slot remains 42px; content uses natural height with unchanged 15px font. Its measured excess is reserved as normal-flow margin below the slot. It never covers a following lane. No body rewriting, line clamp, smaller font, queue reordering or timing changes. Speech remains 76px. Normal and critical message timers remain 4200ms / 8000ms; story remains 4200ms. Birth colors/stars and runtime remain unchanged.
An intermediate RAF-scheduled measurement delayed in a throttled iframe and failed the explicit-newline overlap test. Replaced it with a coalesced microtask before next paint; ResizeObserver and font readiness remeasure native wrapping. DOM unit checks cover expansion and reset without relying on RAF.

## Verification to date
- Reproduction: original forest text clipped 44/40; natural text after change 50/50, base reservation 42.
- Local Chromium rendered iframe matrix: 48 cases, zero clipping/overlap failures after microtask fix (4 widths x portrait/rotated landscape x 6 samples). Covers authored forest, travel and court pools, explicit newline stress case, short and cleared notices. This is not desktop WebKit or iPhone Safari evidence.
- Existing queue/birth/scroll tests: 14 pass. Production lifecycle/conversation/save contracts: 365 pass, fail/skip/cancel zero.
- Final focused queue/birth/layout/focus suite: 16 pass.
- Full npm regression: 3,750 pass, fail/skip/cancel zero; process exit 0 (five suites: 37 + 24 + 3,292 + 159 + 238). Final-head browser CI pending. Earlier HEAD 1476d675 includes the superseded RAF measurement; its CI must not be presented as final V5 validation.

Package HTTP integrity: 4,123 files / 220,206,186 bytes, missing 0 / hash mismatch 0; seven excluded routes return 404. See package-integrity.json. Local DOM measurements: local-notice-matrix.json (48). jungle-320.jpg shows the complete authored story notice and fixed controls at 320px; this capture fixture repeats the same notice solely to hold it for photography, and is not timing evidence.

## QA surface
Private artifact generator only: tools/home-production-v5-qa.cjs. Production allowlist excludes the generator and all generated QA pages. Reuses the existing release QA scene builder and exact adopted background, ground, collision, shadow and depth models. All storage access on the QA document is namespaced with naotocchi-home-v5-qa:, including backup and module markers. Region/count links deliberately rebuild only QA state; the resume link does not rebuild it. The normal game's special-region checks are unchanged.
The generated v5-review/index.html places special regions first and provides original background links plus 1/6/28 actor links for all 13 regions. v5-qa.html?region=star_stop&count=28 opened successfully in local Chromium. Public/private deployed URLs are NOT validated yet.

## Forest / jungle review; J2 deferred
Viewed both exact adopted runtime images. Forest emphasizes tall straight trunks, cool deep blue-green, mossy rock terraces, a left waterfall and stream. Jungle emphasizes curved broadleaf canopy, glossy large foreground leaves, tree ferns, warmer red-brown soil and a broader curved path. Both retain a dark edge frame and bright receding central/right route, which explains similar small-screen silhouettes. Jungle also includes stone-block shapes on the left; a future natural Yanbaru candidate should omit such architectural cues.
Keep forest unchanged. J2 should center an open, broad forest-floor clearing, with asymmetric umbrella-like tree-fern crowns and brighter yellow-green light; no central tunnel-like path, waterfall, ruins or fantasy flora. Its own ground/occluder/depth definitions must be authored after the image, never copied from jungle. No J2 image, independent branch/PR or deployment created in this session; notification release gates take precedence under the owner's explicit deferral allowance.

## Protection / remaining gates
No main merge, no GitHub Pages publication. No changes to script.js, adopted backgrounds, formal character assets, simulation, travel unlock rules or save schema. Draft retained. Existing successful tests retained without assertion relaxation. Need final CI (including Chromium/WebKit), artifact integrity, private V5 deployment and post-publication access checks, and owner iPhone QA. Extremely short landscape retains the pre-existing scrollable central pane; simultaneous visibility of every lane is not claimed without evidence.

Read-only code review found no critical/important source issue. Strengthened save-isolation browser test after its minor finding: seed the normal-save sentinel once on a non-QA page, never recreate it during resume, and inspect its raw value both before and after resume. Local Chromium also opened memory_lake with 28 actors and resumed that region/count through the QA resume link. Physical iPhone and WebKit remain unverified pending their respective gates.
