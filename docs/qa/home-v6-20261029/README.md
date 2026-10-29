# Home V6 validation — 2026-10-29

Adopted C is interactive; eleven painted regions and two unchanged v22 special worlds are in the thirteen-region gallery. Seven new PNG originals and all runtime derivatives are saved on the independent PR462 branch. Draft remains; no main merge, PR426 change, production Pages update, or production save modification.

## Evidence

- `all-13-six.jpg`: actual Cloud Chromium gallery, all thirteen regions, 390px, six official actors. All 13 cards completed. Twenty-eight-actor generation also reported 13/13 complete; its screenshot timed out, so no visual approval is claimed for that complete sheet.
- `home-c-24.json.gz`: C in Cloud Chromium, 320/375/390/430px × day/night × 1/6/28 actors; 24 rows, errors [], 24 rotations with zero displacement, notice 42px and speech 76px. Includes movement, autonomy, ground/safety and glyph measurements.
- Original egg was visibly centered on C's wood floor. Five real clicks of the existing warm button reached hatch; the original character appeared and the egg-only background was removed. No new growth rules.
- First C matrix had two failures while a second synthetic QA page wrote the shared QA save family. Closed that page and reran the complete matrix, yielding zero errors. Use matrix and gallery QA one at a time. Real-play storage is separate.

## Automated checks

| Check | Result |
|---|---|
| Background/build/storage/capture/isolation tests | 74 pass, 0 fail, 0 skip (`unit.log`) |
| Full regression initial run | Batches 250/250, 26/26, 24/24; main batch 3212/3225 with 13 missing-checkout-fixture failures. See full compressed log. Ordinary smoke/dialogue/visual scripts also completed before main batch. |
| Missing fixture suites rerun | Exact HEAD QA files restored. Five suites: 80 pass (`restored-qa.log`); expression asset suite: 256 pass (`restored-pet.log`). All 13 earlier failures resolved without game changes. |
| Remaining regression batches | 138 + 9 + 18 = 165 pass, 0 fail, 0 skip (`remaining-regression.log`). These were explicitly run because the initial runner stops after a failed batch. |
| Aggregate node:test coverage | All 3690 original cases exercised; failed fixture cases subsequently passed. This is **not** a claim that one unbroken full-run command exited zero. Rerun counts overlap; do not add them to 3690. |
| CI | 13 V6 regional Chromium/WebKit jobs added, older jobs retained. Latest checked run 40855506897 was queued; current-HEAD CI is not certified green. |
| Distribution | Six historical comparison PNGs become lossless WebP only in build output; decoded RGBA bytes verified equal for all six. PNG originals stay unchanged in GitHub. Expanded artifact 266,176,953 bytes at packaging check, below 256 MiB. |

Independent review found and fixed baseline conversation-storage leakage within the preview origin and hidden iframe render loops. Baseline save/conversation modules now have a separate V6 family; discarded frames unload to about:blank. Two isolation tests failed before the fix and passed afterward.

## Limits and user review

The v6 CI runner covers 624 regional browser matrix conditions, real pointer actions, reduced motion, save/reload and egg/hatching, but those checks remain pending until the queued jobs finish. Physical iPhone Safari, GPU/heap, initial loading, sustained FPS, OS background return, heat and battery have not been measured. Do not equate Cloud Chromium with iPhone Safari.

Static gallery snapshots omit runtime actor mirroring/foreground masks. Interactive view is authoritative for occlusion. Gallery rotation reseeds the fixture; the dedicated matrix tests rotation without reseeding. Baked sunlight cannot become physically correct night lighting; overlays are the current approximation. Future indoor Meguru notes are design only in `docs/design/home-v6.md`.

Use `home-v6.html` for all regions and `home-v6-play.html` for normal isolated play. All older comparison entrypoints remain. Publication state, exact Site version/source and current CI state are recorded in PR462 after deployment.
