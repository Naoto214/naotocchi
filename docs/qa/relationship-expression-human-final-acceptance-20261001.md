# Relationship ring / heart — final human acceptance 2026-10-01

## Fresh source

Repository Naoto214/naotocchi; branch feat/relationship-expression-pilot-20260930. Remote startHEAD e183681105e0fec4afa62004eeaeead31d9133dc; tree55291d18b7335a8b59ad2ec831121577a89e4b90. Main31edb95ee0e4470669d220dfcf87600281128e5a; ahead26 / behind10; open PR none. Existing isolated worktree was clean and exactly matched fresh remote; no prior uncommitted state reused.

## Binding human decision

User completed iPhone comparison and formally accepts:

- Marriage ring:1.2x, bright silver with transparent-looking pale silver-blue stone, existing lower-right anchor/centre.
- Partner positive heart:1.2x, existing close overhead anchor and warm transient reaction. Human reports clear target recognition, clear distinction from normal, no face/ring interference, no excessive separation or dominance over the character.
-1.15 fallback is not adopted. Further1.1/1.15/1.25/other multiplier, ring colour or position comparisons are closed and are not remaining tasks.
- Companion positive heart: current size, unchanged.
- Partner normal: current small pink heart; lonely: current pale cold cracked heart, unchanged.

Ring remains the permanent married indicator; heart conveys current Relationship state/reaction. Married normal retains ring plus small pink heart. Married lonely retains ring, lonely face, quiet cold aura and cold cracked heart. Married positive retains ring, positive face, existing motion/warm effect and enlarged transient heart. Expiry leaves the ring and resolves the current affection. Non-married shows no ring.

## Finalization only

Production: heartSize now has a fixed1.2 partner-positive factor, with no comparison multiplier argument. Ring CSS now directly uses scale(1.2), saturate(.25) brightness(1.18), keeping centre-origin and all original geometry. Removed unused ring CSS custom-property overrides. This freezes already approved rendering, not a further visual adjustment. Index content hashes refreshed.

QA: removed partner-heart A/B selector, legacy query parameter and sizing wrapper. Existing20 real-Home fixtures are retained, including married normal/lonely/positive, non-married bear/octopus positive, companions and live lifecycle cases. Marriage hints and page text now identify the adopted values. No new cases or copied renderer. Other unrelated saved QA facilities remain unchanged. QA still uses isolated memory storage and cannot read/write usual saves.

Protected: Expression88, all normal images, normal31 system, Naoto, all assets; companion heart sizing, normal/lonely hearts, cold/warm effects, reaction motion/timers, bond/affection, save schema/migration all unchanged. No new gameplay or future motion implementation. No PR creation/Ready/main merge.

## Main divergence audit and later landing

The10 commits absent from this branch belong to the experimental forest3D work merged through PR362, behind URL flag meguru3d=1. Main-side diff:33 files, largely meguru.js, new meguru-3d.mjs/vendor Three.js,3D test/tool/docs/screenshots. Shared changed files include script.js (3D feature-flag/renderer bridge and start), index.html (module template/script tokens), package.json (test list), tests/asset-integrity-test.cjs (3D assets). The present production edits are relationship-expression.js and ring-only ui.css plus index tokens; there is no reason to integrate the larger unrelated feature in this acceptance step.

Before future Relationship landing, freshly audit then integrate latest main in the dedicated integration step. Preserve both script-loading additions and all tests; regenerate hashes from final merged contents. Review shared script.js regions and asset gate; run full tests and relevant Home regression on the integrated tree. Current passing tests cover this branch, not the unperformed integration. This is not an assertion that a merge is conflict-free. No integration performed now.

## Verification

Updated sizing test and ring fixed-value test failed against comparison-enabled code, then passed after cleanup. Relationship78 + Home53 + QA23 =154 PASS /0 FAIL in focused run. Existing integration checks cover marriage three states, non-married absence, unchanged ring coordinates through transitions, expiry, reload/save and movie/overlay suppression. Sizing covers all states and both actor kinds plus stage edges. Retired size argument cannot change the approved multiplier. QA checks removal of retired selectors/parameters/override hooks.

Full repository completion, image hash audit and publication are recorded below after execution. Human acceptance is complete regardless of historical browser automation limitations. The saved local automated Home full runner remains unexecuted; do not relabel it as passed. No additional human size/colour/position review is requested.

SHA256 audit against fresh startHEAD: all3430 tracked images unchanged, changed0. Relationship88, normal31, companion/partner normal, Naoto and other images all unchanged. Ring uses existing atlas with CSS-only approved presentation; ring asset changes0.

## Published formal-value QA

Implementation checkpoint92de288eb4185c39edcfa4f1168727fc2ae49ab7, tree08280e8436a9d63a7b36721172300de42bc35674. Independent scoped review found no important issue.

Existing owner-private QA Site updated with unchanged audience/main-game isolation:
https://naotocchi-relationship-home-qa.kerzion214.chatgpt.site/

Site source837d9e097db3d00543c1d9126e4b1d4d4556749c, deployment appgdep_6abe1feb82708191aa34baad03ed1d8e, succeeded2026-10-01T08:55:24Z. Manifest identifies implementation checkpoint above; following branch change only completes this record.

Cloud Chrome verified the size selector is absent and formal human-approval text is present. Married positive390x844 uses approved ring and heart, visually unchanged. Actual representative screenshot relationship-approved-married-positive-20261001.jpg saved separately from assets. This is a publication smoke check, not an additional aesthetic review or substitute for the user's completed iPhone acceptance.

No remaining ring/heart size, colour or position approval. Future main integration and its regression gate are a separate step, not started here.

## Final automated result

`npm test` completed exit0 on the saved implementation: baseline2789 + Relationship78 = **2867 PASS /0 FAIL**. Smoke, dialogue and visual-fixture stages also completed successfully. Relationship78, Home53 and QA23 all pass; Home tests overlap the full suite and QA23 are separate. No skipped/cancelled tests. Full run took about12 minutes, dominated by existing meguru simulation tests, not QA page/runtime latency.

All3430 images remain hash-identical to startHEAD; Expression88変更0. Final changes after the implementation checkpoint are documentation only. No Ready/PR creation/main merge. Human iPhone size/colour/position acceptance complete; no further comparison remains. Latest-main integration and its regression verification are deliberately left for the separately authorized landing step.
