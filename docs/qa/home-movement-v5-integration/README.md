# Adopted home movement V5: production integration

Base: `408c72e6ebef71da3eab33cfb268c7494117aaaa` (main).
Approved source: PR #558, `02df2efc39cd18543b9c66df281872ed1751b02c`.
Integration branch: `codex/home-movement-v5-integration`.

This is a selective integration of the approved behavior, not a merge of the
stacked prototype branches. PRs #558, #559 and #560 remain unchanged. V5 is the
final movement-range design; this integration makes no additional range changes.

## Required dependencies

| Files | Adopted behavior |
| --- | --- |
| `home-production-diorama.js` | Individual painted extents inverted through the existing camera; preserve the original camera-fit floor; refresh navigation after presentation/equipment changes. |
| `home-art-navigation.mjs`, `home-recovered-navigation.mjs` | Stable grid origin; approved city pavement triangle; retain original destinations and depth. |
| `home-route-navigation.mjs` | Stable reachable-component search, legacy fallback, optional exact segment guard. Legacy callers keep the old grid behavior. |
| `home-ground-expansion.mjs`, `home-visible-ground-navigation.mjs` | The approved 13-region visible-ground rules, original/painted projection union, exact polygon-crossing checks, safe route endpoints. |
| `home-production-world.mjs` | Activate the approved portrait projection correction and rebuild navigation only when its projection changes. |
| `home-production-model.js` | Preserve safe V4 endpoints, screen-space directional intent, safe detours, bounded retries of the same manual request. Existing contact predicates remain unchanged. |

All eight modules are checked against the approved source bytes (only cache
tokens may differ). `index.html` changes only the two affected script tokens.
Pages adds exactly two runtime paths and refreshes reviewed hashes. No comparison
entry, debug hook, investigation image or prototype package is published.

## Preservation and yielding exclusion

The integration test pins the approved eight module digests and the main bytes
of input, UI, save/game code, depth transform, assets manifest, dayparts, egg and
cast layout/motion. The eight-module comparison also rules out importing #560's
model. Explicit guards reject `setYieldMode`, `yieldPending`, `yieldPlanning`,
`yieldCounters`, `yieldStatus`, and comparison instrumentation.

The protagonist's additional 110%, depth scaling, foot-y ordering, contact rules,
autonomous behavior, 28 residents, 52 backgrounds, equipment, notification/comment
UI and save format are preserved.

## Verification at integration / merge gate

- Movement unit and integration checks: **59 passed**, 0 failed/cancelled/skipped.
- The previous interrupted run's **59 files** are a separate group; the full
  package test script is rerun per file with individual TAP logs and exit codes.
- Full suite, browser, Pages packaging, CI and production publication are separate
  gates. Final per-group counts and deployment results are recorded in the
  integration PR description; the 59 movement checks above alone do not
  establish release readiness.
- Real-device iPhone Safari: unavailable, **not verified**. Browser emulation is
  reported separately and is not represented as real-device testing.

Raw per-group logs and browser artifacts are retained outside the production
tree during execution. Per-file results are saved in the integration PR before
the merge decision; Actions retains its own logs and packaging/browser artifacts.
