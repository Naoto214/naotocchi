# V12 follow-up: new jellyfish and landscape composition

Base: PR #490 branch `integration/home-25d-release-20261030`, commit `6432c381199268a782c7316680661012f11e2546`.

## Saved changes

- Add the user-requested transparent painted jellyfish at `assets/ui/home-notices/jellyfish-v12.png`. V12 production notice rendering maps 🪼 to this image; older versions keep their existing rendering. No existing artwork was replaced.
- Landscape retains the left pane dimensions and scales the full 2:3 background together with residents, shadows and marks. The native screen height remains fixed, and pointer conversion remains inverse to the display transform.
- Correct landscape selected-label coordinates for the transformed frame containing block.

Image provenance: generated for the user's explicit request to replace the emoji-like jellyfish with new art. Transparent PNG, 1254×1254, 704604 bytes. Art direction: natural translucent pale turquoise/lavender painted jellyfish without a cartoon face, suitable for the existing notice illustration system.

## Portrait decision — NOT implemented

The user explicitly rejected extreme portrait shrinking without approval. The trial that fit the entire 380px stage plus 32px effect margins at about 55% / 32% was removed from the runtime. The portrait branch remains identical to the saved base.

Measured fixed UI: notice bottom 134px; comment top 392px at 375×667 and 293px at 320×568. The free bands are therefore 258px and 159px. Keeping 8px clearance at both ends leaves 242px and 143px. The 42px notice, 76px comment, 9 meters and 5+4 controls were preserved.

The original whole-stage fit was conservative, not a proof of the minimum necessary resident scale. A more focused numerical probe used the existing alpha bounds, native 380px terrain layout, home walkable polygons, depth scale, model bounds and foreground visibility rule. It sampled the dog/04 protagonist, forest_bear partner and the same first 26 companion assets used by the 28-resident fixture. This was a mathematical presentation-capacity check, not a browser or iPhone QA pass.

| Native pane width | Residents | Body top over sampled legal positions | Foot/shadow bottom | Body + shadow span |
|---|---:|---:|---:|---:|
| 343px | 1 | 48.89px | 372.50px | 323.61px |
| 343px | 28 | 48.52px | 372.50px | 323.98px |
| 302px | 1 | 50.19px | 372.50px | 322.31px |
| 302px | 28 | 85.44px | 372.50px | 287.06px |

Even discarding all inter-lane margins, these sampled body/shadow envelopes require roughly 324px at 375×667 (66px more than the 258px band), and 322px for the single-resident case at 320×568 (163px more than the 159px band). Uniform camera scale ceilings are approximately 80% and 49% **before** expression marks, motion excursions and partner attachments. Keeping the 8px margins reduces those ceilings to about 75% and 44%. These numbers are illustrative necessary capacity limits for this fixture, not a guaranteed safe scale for every species/state. Repositioning a fixed camera alone cannot reduce the span; a new projection must also preserve foot/background correspondence and reverse pointer conversion.

No world coordinates, walking bounds, ground polygons, saves, existing formal assets or other games were changed. No character-dependent or notification-dependent camera was added.

## Validation / remaining blockers

- 43 existing/focused Node tests passed, covering notice text filtering, formal icons, new jellyfish mapping, ordinary speech interaction gates, special-event locks, layout constants and landscape projection. The landscape math test was rerun after the selected-label correction and passed.
- Local preview confirmed the portrait shrink trial's fixed UI geometry and 9 meters / 9 controls, but the trial was rejected and reverted. It is not evidence that the final portrait clears both lanes.
- During further preview QA, the browser action was rejected by the environment URL policy. No alternate browser/control route was used. Final new-jellyfish visual QA, final rotation checks and a final 28-resident browser pass remain unverified.
- The reported purple line remains unreproduced; no parameter styling was removed speculatively.
- Portrait complete nonoverlap remains unresolved within the current constraints. The owner-private V12 was intentionally NOT updated. PR remains Draft; main and production Pages remain untouched.
