# Landscape controls: verification checkpoint

Source base: `6c9f4ca91e7497e343a7e647be57690ba2a2308d`.

## Completed in this checkpoint

- User report: initial preview opens and renders; walking/travel and exit/reentry reported without problems; landscape controls not visible. This is not a full physical-QA pass.
- RED: original production CSS fails at 852x320: pad bottom approximately 444px, outside viewport.
- GREEN: `tests/meguru-landscape-browser.cjs`, Chromium headless shell + software WebGL, exit 0. 24 viewport/mode checks plus 4 input/map/exit/reentry checks. Bounds, hit targets and no scroll overflow; same simulation objects across orientation changes. Default and billboard modes actually use 3D; explicit 2D modes use Canvas.
- Negative control: final test against original CSS alone fails with the same offscreen pad. Production CSS was not reverted during the negative run.
- `node --test tests/asset-versions-test.cjs tests/viewport-design-test.cjs`: 20 PASS, 0 FAIL.
- `git diff --check` and JS syntax check: success.
- Product change: landscape-scoped CSS plus its cache token only. `meguru.js`, `meguru-3d.mjs`, `script.js`, `character-3d/` and `assets/` unchanged.

## Limits / release hold

- Physical-device retest of the fix: NOT RUN. All unmeasured physical performance/memory values remain unmeasured.
- Local WebKit: unavailable because host dependencies are missing; not PASS. Home CI includes the new test for Chromium and WebKit, recording actual renderer mode.
- Local full `npm test` was started but has not completed at this checkpoint; no final full-regression success claim. Previous commit results do not certify this new commit.
- New-commit Runtime/Home/World CI: pending after save. Keep PR #379 Draft; no merge or production deployment.
- One initial fixed-delay rotation sample failed transient hit testing. Test now waits at most 5 seconds for the existing resize/debounce layout to settle; original CSS still fails the final negative control.

## Reproduce

```sh
node tests/meguru-landscape-browser.cjs
```

Defaults to Chromium and WebKit. For an environment with only Chromium, set
`MEGURU_LAYOUT_ENGINES=chromium`; optionally set `PLAYWRIGHT_CHROMIUM` to the installed
headless shell. The JSON and screenshots go to `test-results/home-layout/meguru-landscape/`.
