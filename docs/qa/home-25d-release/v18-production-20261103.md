# V18 production adoption (2026-11-03)

Owner explicitly approved PR #490 V18 for main and production Pages, accepting the documented minor visual issues. The 52 daypart backgrounds remain a separate future PR; no daypart assets or scheduling changes are added here.

## Merge resolution

Approved PR head: ec57734a92c7616ec8901a408d6f4c8b28748367. Current main: 81c044a9977dbd013f1632372a72785b540fb463. Merge base: aafe4abe7842b2fcf57060b207500e5b24f6c7a0.

GitHub reported mergeable=false / dirty. Local merge reproduced exactly one conflict, tools/pages/allowlist.json. Resolve the file-list intersection while retaining all V18 entries and main's V23/V24 clock module entries/hashes. CARD GAME and tools/work are byte-identical to main; all six V18 primary runtime sources and all assets are unchanged from the approved PR head. No histories or originals were removed.

The production index had not yet activated the private preview's attributes. Promote the existing display=18 / viewport=12 modes to the production entry, retain the private preview theme color, refresh source cache identifiers, and update the reviewed HTML hash. This is publication wiring, not a V19 design or gameplay change.

## Fresh validation

- Focused home V10–V18, comments, notice, birth, save compatibility/integrity, menus and story: 119/119 pass.
- V18 production-entry regression: 1/1 pass; asset token tests plus V18: 9/9 pass.
- Clock adoption and V23: 11/11 pass.
- Pages package guards and Naopoyo publication: 16/16 pass. Initial missing legacy fixtures were sparse-checkout omissions; fetching only those files resolved them without source changes.
- Runtime package: 4,159 HTTP files (4,158 allowlisted + .nojekyll), 228,182,144 bytes; 7 entry points; 452 card IDs / 904 images; no missing files or hash mismatches. Local HTTP verification passed.
- Chromium 134 headless: 375x667, 393x589 and 820x390, each with 1/6/28 residents. All 9 cases booted with display=18, viewport=12, valid floor coordinates, loaded images, 42px notice, 76px comment dock, nine meters and five-plus-four visible buttons. Saved companions/species/partner restored in every case; real pointer drag accepted in all three one-resident cases. Production entry booted without QA hooks; CARD GAME and Naopoyo entries loaded without page errors. Portrait and landscape screenshots visually inspected.
- Existing successful V18 18-condition and detailed motion/notification evidence is retained in v18-20261103.md. No physical iPhone/Safari claim; the current local browser is Chromium.
- Local browser acquisition required the supported older headless runtime after the default download failed. Initial smoke assertions targeted the old speech container and re-seeded storage on reload; correcting those test-only mistakes made the suite pass. Production code was not altered to satisfy them.

## Access and known limitations

At initial inspection, branch main reported protected=false; repository rulesets and submitted PR reviews were empty. The detailed branch-protection endpoint is unavailable to this integration (403), so no stronger claim is made. No protection settings were changed or bypassed.

Accepted minor issues: narrow vertical travel in short viewports, possible intermittent purple line, brief 28-resident restore clipping, and other non-blocking visual imperfections. Existing save, growth, interactions and other games are preserved. Deployment result and final merge SHA must be verified separately; this record does not claim a deployment before it occurs.
