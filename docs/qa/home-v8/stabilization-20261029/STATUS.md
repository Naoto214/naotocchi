# Version 8 stabilization — pre-publication checkpoint

Source starts at GitHub f3290ea2fdf7fdea5a713a43cf85445ba361ceb0 (tree identical to preserved local fb3d78f38). Implementation commit c047fdd7bc2e226b6f9ce73bfd5d5ca0bf40a108. This checkpoint does not claim publication or final CI completion.

## Capacity and preservation

The preserved distribution was 268,301,252 file bytes before tar headers. PNG originals and QA development files were already mostly excluded; the major runtime costs are card illustrations (~131.2 MiB, large and small versions both required), official character assets (~37 MiB), JavaScript (~21.4 MiB), and eight lossless legacy background WebPs (~18.1 MiB). Identical duplicates total only 168,351 bytes: deleting duplicates alone cannot solve the limit.

`tools/home-v8-package.py` keeps all official character and card illustration bytes identical, all comparison pages and game features. Eight legacy background derivatives retain their 1024×1536 dimensions, encoded from preserved PNG masters with WebP quality 94 or higher, PSNR at least 35 dB (minimum measured 35.2893). No source art or QA images are deleted from GitHub. The only two files excluded from delivery are developer documentation: `prototypes/card-game/UI-IMPLEMENTATION.md` and `assets/home-art-recovered-20261029/README.md`. Runtime old/new, sea A/B/B2, home A/B/C and other comparisons remain.

Exact file sizes, per-file SHA256, source-to-derivative SHA256, quality and dimensions are in delivery-manifest.json. File total is approximately 244 MiB and GNU tar expanded size approximately 247.2 MiB. This fits 256 MiB but is NOT sufficient evidence for the future 52-background budget. No new background artwork was created.

## Previous JavaScript discrepancy

The old transport archive stored gzip bytes under .js names (six v6/v7/v8 QA or play scripts). For example home-v8-play-script.js was 232855 bytes of gzip, expanding to 790880 bytes. Its archived gzip hash equals the prior HTTP response hash after the server Content-Encoding was decoded once: the server had compressed an already compressed file. Browsers therefore received gzip binary as JavaScript. This is a packaging/HTTP double-compression defect, not a harmless hash difference or a reason to disable verification.

The new packager rejects gzip signatures, syntax-checks every JS/MJS, preserves all code bytes and records hashes of the actual plain delivered bytes. Inherited v7 formatting remains separately recorded. Regression tests prove gzip-under-.js is rejected and plain JavaScript is unchanged.

## Original CI failures (run 40899384512, exact head f329..., latest attempt)

43 jobs: 36 success, 7 failure. Categories:
- v6 star_stop / memory_lake readiness: browser checker accepted `3d` while the renderer reports `webgl`; fix accepts the actual `webgl`/`canvas-3d` modes and still requires loaded artwork for art mode. Six positive/negative readiness tests pass.
- v6 sea, v7 sea A/B and star-new physical ground taps: a supposedly ground-only target fell in the protagonist's padded hit rectangle. Shared target generation now excludes every actor including the hero, while preserving navigation, collision, route and actual movement assertions. A recorded sea-B regression fixture fails before and passes after this fix. A follow-up v6 river_lake second-destination failure required a finer 4px target search and a 12px fallback distance; the >5px actual movement assertion remains unchanged.
- v8 star_stop-original rotation: a 300px landscape stage has no legal foot band for a large actor. 340px fixed the single actor but CI exposed married six-person attachments requiring more space. A real-layout regression including ring/hearts reproduces the six-person failure at 340px. 380px passes both old/new artwork, host widths 567/582 and motion extents; no walkable polygon or collision rule changed. The change is confined to the v8 adapter/CSS.

## Verification completed at checkpoint

Focused rotation/ground/readiness: 13 tests pass, 0 fail. Packaging: 2 pass. Existing npm test first groups: 250 + 26 + 24 pass; smoke/dialogue/visual scripts completed. The large parallel group had 2811 pass and 7 file-level failures with no assertion details in the spec log; this resource-constrained environment has recorded OOM kills, but the precise kill cause of each file was not captured. All seven files were rerun serially: 430 pass, 0 fail. Subsequent npm groups: 138 + 9 + 18 pass. Do not label the original npm command wholly successful.

Managed-browser visual checks confirmed sea B2 at 390px/28 residents, formal sprites, shadows, question with named portrait and three choices, 42px notification / 76px conversation and 5+4 meters/actions. The comprehensive authenticated live-site browser QA remains outstanding. A long managed-browser matrix became unresponsive and is not counted as a pass. CI is the authoritative full browser matrix.

## Protection / remaining gates

The live private Site has not been overwritten; normal v7 remains live. Site owner-only policy was verified (custom, one owner, zero groups/external visitors). Saved versions are available for rollback. Main, PR #426, v22 and production Pages were not changed; no production save was read or mutated. PR #462 remains Draft.

Next gates: final-head CI, saved candidate archive integrity, private deployment, HTTP file/hash verification, authenticated browser operation (or explicit unverified status), iPhone Safari owner QA. Final completion must be recorded separately from this checkpoint.
