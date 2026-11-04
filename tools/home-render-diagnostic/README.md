# V17 render-layer diagnosis (not a V18 candidate)

Generate against the preserved, packaged V17 site directory:

```sh
node tools/home-render-diagnostic/check.cjs /absolute/path/to/site/dist
node tools/home-render-diagnostic/build.cjs /absolute/path/to/site/dist
```

The builder verifies the V17 script hash, creates three `v17-render-diagnostic*` files, and keeps the original entrypoint, assets and runtime untouched. All game save keys in the derived script use a separate diagnostic namespace. The diagnostic clock and ambient conversation timers are disabled; the original rendering and pointer movement continue.

On the affected iPhone, open the diagnostic page, choose the screenshot-like state, and reproduce the line through normal walking/dragging. When visible, hold the position. Switch one rendering layer at a time, close the panel to see the resident, then record whether the line disappeared or remained. Return to normal between comparisons. A non-reproduction is not evidence that a layer is innocent. Repeat sleep only after the awake result has been recorded. The record remains local to the page; copying is explicit.

Do not deploy this page without the owner's approval for diagnostic publication. Do not publish local QA iframe harnesses. This tool neither fixes the magenta line nor establishes V18 acceptance.
