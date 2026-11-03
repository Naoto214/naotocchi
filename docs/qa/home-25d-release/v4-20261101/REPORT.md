# VERSION 4 — implementation and validation record

Status: candidate under validation. Not deployed. VERSION 3 remains live.

## Starting state

- PR #490 open/Draft, branch integration/home-25d-release-20261030.
- HEAD ed182b6d79422f1d85c95f5c8c2777849595f7ce; main aec03c20ae8b064c6c2f8aca5537f1938df6439f.
- Clean fresh checkout; remote HEAD unchanged before commit.
- Starting HEAD: all 9 GitHub workflows completed/success (not reclassified as V4 evidence).
- Existing owner-private Site appgprj_6ae5bc78994481919b5d33849da61d0f, live version 3, owner only / external visitors 0.
- Restored Site source commit 62f49a0779fd7b97ab99cb9ae2ace7552e11965e. No publication operation performed.

## Root causes and changes

The script creates a second birth-panel in addition to setMessage. Removed that text panel and its CSS; the existing message gets a temporary cream/gold birth-notice class. Halo, eight stars, 2800ms cleanup and original sprite/shell animation remain. The decorative layer is aria-hidden, leaving one accessible notice. Subsequent care messages remove birth styling. Story/achievement/birthday/result notices wait in the existing display queue during the birth celebration, then drain without generating or losing rewards.

Legacy main uses fixed full-viewport .world-scene and background-size:cover / center 50%. Both versions already use viewport-fit=cover, fixed controls and safe-area padding. The production egg instead displays a width-scaled image pinned to cast-stage ground. The normal production canvas uses the same projection. The finite picture leaves exposed pixels above/below it. The egg host's #aec5b4 and normal canvas fill (#b5d4d9 etc.) are page paint, not Safari chrome.

V4 retains artTransform unchanged and uses a separate uniformly scaled cover copy of the SAME original image behind it. The unchanged terrain artwork is fully opaque throughout the cast-stage area; up to 40px of margin outside the stage blend into the decorative copy. No nonuniform stretching or new art. Normal canvas caches this static composition and reuses it during atmospheric animation. Egg uses equivalent CSS cover/mask. This is layered composition, not a newly extended painting; visual acceptance of joins remains a QA gate.

Input projection/unprojection, masks, terrain bounds, depth, shadows, actor initial positions and simulation are unchanged. Background behind controls does not become walkable. Regional selection and generation-token image loading remain unchanged.

## Safari boundary

Viewport, html/body layout, --app-height, fixed UI and safe-area padding are unchanged. There is no theme-color meta in the starting index. No new browser-tint hack is added. WebKit documents viewport-fit=cover plus env(safe-area-inset-*) for page layout: https://webkit.org/blog/7929/designing-websites-for-iphone-x/ . Safari-owned address/status/tool bars are separate and cannot be verified as page pixels using desktop WebKit alone. Their appearance, dynamic bar collapse, real insets and device heat remain iPhone QA items. A page-level fill does not promise artwork inside browser-owned controls.

## Evidence so far

- Red tests observed central duplicate and missing backdrop function, then green.
- Focus suite: 23 passed, 0 failed/cancelled/skipped (before final font-only change).
- Live preview 390x844: egg centre unchanged and artwork replaces top/bottom page bands.
- Full npm test and production contracts running; not claimed successful yet.
- Local Playwright browser install failed: downloaded ZIP invalid/truncated. Do not count local browser matrix as run. GitHub CI will execute Chromium/WebKit and capture exact V3 baseline plus V4.
- The temporary local side-by-side view initially triggered normal same-origin multi-tab save protection; it is not a published comparison page and not operation evidence.

## Pending release gates

Final-head regression/CI, actual birth visibility, all13 regional screenshots and inputs, portrait/landscape/safe-area, 390px before/after artifact, archive integrity, private deployment and post-deploy access. No main merge, production Pages update, image changes, save migration, or force push authorized/performed.

## Browser evidence and follow-up

All 13 regions were captured at 390x844 with 28 actors in the isolated QA fixture; see all-13-regions-390.jpg. home-390-before-after.jpg contains actual CI captures (V3 / candidate 97b9223): egg, celebration, normal growing screen. No generated backgrounds.

Candidate 97b9223 Chromium passed original V3 baseline (10 cases) but failed V4 post-birth centre assertions with normal motion. Reduced-motion cases remained centred. Actor records prove ambient movement started while achievements were deferred. Fix: include the 2800ms birth presentation in the existing homeDioramaBlocked predicate; no coordinate/model/navigation changes. A new test fails before and passes after this fix, and verifies free life resumes. Care buttons remain independently available. Browser assertions are unchanged. This failure is not counted as success.

Production contracts: 365 passed, 0 failed/skipped/cancelled on the preceding candidate. Final HEAD CI remains pending. VERSION 3 remains live.

CI provenance follow-up: Production 2.5D home, Runtime smoke test and Pages runtime package explicitly checkout the PR head SHA (push events still use github.sha). The other six existing workflows retain PR merge-result validation. Existing pinned comparison baseline checkout is unchanged. Test commands/assertions/deployment conditions remain unchanged.

An intermediate all-workflow HEAD pin exposed a main-only CARD GAME home-return-browser.cjs step absent from this unmerged branch, causing MODULE_NOT_FOUND in Naopoyo Chapter 1. Restore those six integration checkouts rather than remove the new main test or import unrelated game changes. Exact candidate runtime, all-region browsers and full regression remain explicitly pinned; other CI conclusions are reported as integration checks, not exact candidate artifacts.

Full regression follow-up: final-runtime attempt after the hatch-pose fix reported 3352 pass, 1 failure, 0 skip/cancel before stopping the npm test chain. asset-integrity-test correctly found script.js cache token still referenced the pre-pose-fix hash. Updated the index token using the canonical assetHash function and refreshed reviewed index hash. No assertion relaxation. Re-run the full final-head suite; preceding partial run is not a full pass.
