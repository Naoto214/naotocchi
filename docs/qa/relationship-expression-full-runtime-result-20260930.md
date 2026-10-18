# Relationship Expression — full runtime rollout

## Scope and current decision
All 44 characters (26 companions, 18 partners) are connected to the existing 88 human-approved images. Approval of all 88 is explicit in the 2026-09-30 user handoff; older pilot/full-image reports retain their historical status and are superseded on that point. No image generation, editing, aesthetic review or new human image-approval gate.

**Home browser QA remains UNEXECUTED because the local browser cannot launch. This is not a Home test failure, not Home GREEN, and not final Relationship System GREEN. No main merge, PR creation or Ready change.**

## Git baseline and integration
- Fresh `git ls-remote`, new clone and GitHub connector checks; no old local copy used as authority.
- Start pilot HEAD: `f865781e0c4c97e2077a6cb769868c45971dec38`.
- Start pilot tree: `17da80407dd415541fccf6ce037a3dfe2d235ce1`.
- Main: `dd50ce4bc7b2bef1952ca52ab6157579598aacc1`.
- Initial pilot: ahead 7 / behind 2; open PR list empty.
- Main's two commits: `9a1717b` species-specific life stages, `dd50ce4` clownfish Home regression alignment.
- Audited all changed files: master spec, index, life-stage-profiles, package, script, three tests. No cast-layout, relationship rule, asset, motion or schema change. Main updates existing load-stage calculations to pass species; these main-owned calls are preserved, not a new Relationship migration.
- Integrated with a two-parent merge, no rebase: remote `643c13aec5663b07ec4bd138210ff1396d9675f9` (local integration `5d3ec01`, identical tree).
- Mechanical conflicts: index script tags and package test list. Kept both dependencies and both test suites; refreshed merged script hash. script.js auto-merged; reviewed affected regions.
- Runtime rollout: remote `ad3969f2d3c65a10139f023e3e0019affb3d87bc` (local `43103fd`), tree `7e49b4ba5b68a5500469572d4148feb4229a72e3`. Final QA commit follows; its parent preserves the exact runtime tested.

## Assets and runtime
- Explicit SUPPORTED registry replaces the four-character PILOT registry: companion 26, partner 18.
- Runtime catalog equality and exact on-disk relationship set asserted. All 44 normal assets and 88 positive/lonely assets exist and map to the correct IDs. Missing/misreferenced assets: 0.
- Priority unchanged: temporary positive > value < 30 lonely > normal. Boundaries 29, 29.999, 30, 31 verified; missing values retain existing normal default.
- Reactions remain 2.5-second WeakMap entries keyed by entity identity. Replacing an entity with the same ID cannot inherit its reaction.
- Normal successful play: sample one representative from the entire recruited group. Add all individuals crossing from below 30 to >=30, deduplicate. 26 simultaneous rescues tested. Annoyed play starts no new reaction and does not recover bond.
- On expiry, re-render uses CURRENT bond/affection, including returning to lonely when the value is still low.
- Existing canonical ID conversion stays at the Home boundary; no saved or catalog IDs change. Unknown/wrong-kind/guest/author resolver fallback remains normal. Profiles, dex and movies retain normal assets.
- Actual court UI, new relationship success, chance-roll failure, mismatch repair completion, marriage completion and actual goOnDate path tested using an expanded partner. All 18 partners also exercise common reinforcement + current-value expiry; all 26 companions exercise actual play + rescue + expiry.
- Date decision: preserve the pilot's reaction at the existing affection gain. Existing date movie uses normal portraits; no post-movie replay/new animation is introduced. Existing date timing/progress rules are unchanged.

## Save
No schema/migration/serialized Expression fields. Real save round-trip verified at relation values 20 and 50 for all 26 companions and an expanded partner. Reload removes temporary positive and resolves lonely/normal from saved values. Existing save compatibility, recovery, integrity and migration suites run separately and within npm test.

## Verification
- Integrated four-character baseline: 14 PASS / 0 FAIL.
- Full-rollout tests were run before implementation and failed on previously unsupported characters, confirming missing full-asset resolution. Then registry/runtime hookup passed.
- Final Relationship suite: 62 PASS / 0 FAIL.
- Save/Home Node subset: 104 PASS / 0 FAIL (save-compat, save-integrity, save-recovery, migration, cast-layout, home-touch).
- Full `npm test`: exit 0; **2,851 PASS / 0 FAIL** = existing/main suite 2,789 + Relationship suite 62; cancelled/skipped/todo all 0. Smoke/dialogue/visual-QA command chain completed. Existing suite duration 988,712ms (~16.5 minutes), Relationship 5,345ms. Prior 2,802 -> 2,851 is main life-stage test +1 and Relationship suite +48.
- No browser result is included in those Node counts. Runtime harness checks generated Home markup, not browser pixels/layout.
- During event-test development, the test fixture initially used the wrong first-encounter field and an uncontrolled bisexual candidate. Fixed the fixture using existing partnerEncounters and calledMatch; then asserted successful relationship creation or actual failed chance-roll happiness loss. No production rules were changed to accommodate tests.

## Hash protection
`relationship-expression-full-runtime-hashes-20260930.json` records SHA-256 and Git blob IDs for all 3,430 tracked image files. Every file matches the initial fresh remote Git tree AND the pre-runtime SHA-256 snapshot. Both approved image manifests match all 88 files.
- Relationship: 88 unchanged.
- Companion normal: 27 files unchanged (26 current + preserved legacy asset).
- Partner normal: 18 unchanged.
- Usual 31-series normal and Expression assets, author/Naoto and all other images unchanged.
- Image additions/deletions/modifications in this integration/rollout: 0.

## Browser attempt and exact limitation
Installed Playwright resolves to the runtime toolchain and requests Chromium headless shell revision 1234 and WebKit revision 2336; those executables are absent. Running the Relationship, focused Home and full Home runners stops before any test scene, on missing Chromium executable.

The already installed Chromium revision 1194 was independently launched with explicit executablePath. It aborts before page creation:
`FATAL:chrome/browser/process_singleton_posix.cc:292 ... socket() failed: Operation not permitted (1)`.

No escalation, security workaround, fake screenshot, or claimed visual pass. WebKit was also checked and its requested executable was absent. Installing new browser binaries cannot be assumed to solve the observed socket restriction.

### Still required Home evidence
- Bear and octopus normal/lonely/positive, placement, correct transitions and technical display integrity.
- Dense 26 companions, ordinary representative positive, all lonely rescues -> positive -> normal.
- Existing Home browser regression: responsive layout, main/partner/companions, conversation, interactions, existing animation.

The saved Relationship browser runner now asserts all 26 companions, exact one representative when healthy, all rescues when low, normal after expiry, correct partner after court, loaded assets and no Home overflow. It still targets the two required partners (bear/octopus), not a browser matrix for all 18; all 18 have Node runtime coverage. This runner update is syntax-checked but **not browser-executed**.

### Resume on an authorized browser-capable machine
1. Checkout the latest remote `feat/relationship-expression-pilot-20260930`; verify HEAD/tree. Do not use production-origin saves.
2. `npm ci`.
3. Match existing repo CI: `npm install --no-save --package-lock=false playwright@1.62.1`; `npx playwright install --with-deps chromium webkit`.
4. `node tests/relationship-expression-browser.cjs` (32 scenarios, up to 160 phase captures). Read results.json failures and inspect actual Home captures for technical display/layout; no image aesthetic rework.
5. `node tests/home-layout-regressions-browser.cjs` and `node tests/home-layout-browser.cjs`.
6. For manual interaction, `npm run dev`, open development `/__qa`, choose `relationship_{forest_bear|rock_octopus}_{20|50}_{pair|dense}`; use ordinary play/court controls.
7. Save genuine results and screenshots. If all required Home evidence passes, the system can be marked GREEN; main merge still needs a separate user instruction.

## Independent review
No Critical/Important production finding. Optional extra coverage noted: annoyed action during an already-active positive deadline and legacy alias-specific Relationship rendering. These are deferred test additions, not detected runtime bugs. These do not change the required approved behavior; existing annoyed no-start, reaction expiration, canonicalization and old-save regression checks remain. The overly broad test title was narrowed to state exactly what it checks. Browser coverage is explicitly limited above. No production change from review.

## Deferred by explicit scope
Bond 25/30/35 years, marriage 3/3/4/70, date 0.5-year interval, sodachi50 effect revision, Relationship motion. Not defects or unfinished work in this rollout. Normal 31-series and Naoto untouched; PR #278 untouched.

Final pre-push remote recheck: pilot still f865781, main still dd50ce4. With this QA commit pilot will be ahead 10 / behind 0. No open pilot PR at initial inspection; post-push status verified separately in final response.

## GitHub save transport
Normal git push failed because this environment has no HTTPS username credential. Used the authenticated GitHub connector to upload only changed text blobs, reconstruct each exact local tree, and create the three commits with original ordered parents (including main as second merge parent). Commit IDs differ due to connector-authored metadata; merge/runtime tree SHAs match the tested local trees exactly. The branch ref is advanced without force only after constructing the complete chain. No remote history rewriting. The plan retains local checkpoint IDs as historical execution references.
