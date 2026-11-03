# Home version 6 — adopted C and thirteen regions

C is adopted as background design, not approval to merge PR462. Use its existing original unchanged. Eleven paintings use the existing recovered navigation/world/model; star_stop and memory_lake retain the existing v22 world renderer. All canonical region names, character assets, conversations, rules and Meguru are unchanged.

## Region / ground / source

| Region | Source | Safe ground |
|---|---|---|
| home | home-c-20261029/home-interior-c.png | Central wood floor. Sofa/table, wall/window, plant, raised tatami excluded. Foreground plant masks. |
| forest | home-art-recovered-20261029/forest-waterfall.png | Existing trail; waterfall, stream and rocks excluded. |
| river_lake | home-art-recovered-20261029/water.png | Existing stone shore, excludes river. |
| city | home-art-recovered-20261029/city.png | Existing pedestrian plaza. |
| countryside | home-v6-20261029/countryside.png | Farm lane and open foreground, excludes field/building. |
| mountain | home-v6-20261029/mountain.png | Broad plateau/trail, excludes cliff/rock. |
| snow | home-v6-20261029/snow.png | Snow lane, excludes house. |
| sea | home-v6-20261029/sea.png | Beach, excludes sea and foreground rock. |
| jungle | home-v6-20261029/jungle.png | Forest floor/trail, excludes stream and dense plants. |
| desert | home-v6-20261029/desert.png | Foreground dunes, excludes distant sea. |
| deepsea | home-v6-20261029/deepsea.png | Seabed plateau, excludes trench and rocks. |
| star_stop | unchanged home-world.mjs | Existing v22 star-stop geometry. |
| memory_lake | unchanged home-world.mjs | Existing v22 lake shore geometry. |

Paths above are under assets/. Exact polygons, seats, observation points and depth are data in home-v6-manifest.mjs; each image has distinct geometry. PNG originals are retained; eleven 1024x1536 WebP derivatives total 5,293,064 bytes, approximately 6 MiB decoded per painted scene. Gallery creates each card serially in one worker and unloads it afterward. Hiding baseline unloads its document. GPU, iPhone heap, sustained FPS, heat and battery remain unmeasured.

## Egg and storage
Original sprite/alpha bounds and warming/hatching handlers remain authoritative. Presentation-only adapter places the egg at source coordinate (.55,.74); normal hatch removes egg background, and the existing growing actor system resumes. No acquisition, growth or save-schema changes.
V6 real play, QA, sheet and baseline have independent save and conversation families. The control panel and interactive gallery share the QA family: use these synthetic QA pages one at a time. Normal play never receives QA companions.

## Lighting limitations
Paintings are representative images. Existing lightweight night/rain overlays and restrained particles are reused. Baked sunbeams/sunset cannot become a physically correct night scene; no complete seasonal/weather art variants are claimed. Snow region remains snow. Deep sea remains the existing region semantics.

## Future indoor Meguru (not implemented)
C camera faces the main window and valley. Sofa is left, bookshelf and raised tatami right, broad central floor remains traversable. Entrance candidate is off-camera front/right, leading toward a vestibule and garden; window is scenery, not an exit. These are prospective spatial notes, not a new canonical floorplan. A future independent project must implement door/yard bidirectional transitions and preserve return/save behavior.

## Deferred minor review findings
Static card exports use official sprites and ground positions but omit runtime mirroring and foreground masks; use the actual interactive view to judge occlusion. Gallery rotation button reseeds its synthetic fixture after returning; the separate matrix verifies rotation without reseeding. Neither alters real play.
