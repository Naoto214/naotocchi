# Distinct scenery implementation plan

Goal: Make each existing region visually recognizable at full-screen size and make current location an outdoor scenery choice distinct from home.
Architecture: Preserve all region/gameplay IDs. World scene owns imagery and environmental effects. Current-location selection uses existing opt-in GPS/weather tracker plus a small explicit municipality/profile resolver. All persistent changes stay on feature/distinct-world-scenery-20260911, based on main 5f5cdcdf1fd1462378286fd34eb81e36f915d617.
Global constraints: Preserve glass UI, semantic gauge colors, cast sizing and minigame behavior. No added services, location history or raw coordinates in saves. No merge/deploy. User has authorized implementation.

## Task 1: Current location (delegated)
Files: script.js, world-environment.js, new local-scenery.js, index.html (module script only and location travel controls), tests/local-scenery-test.cjs, tests/world-environment-test.cjs, tests/helpers/runtime-harness.cjs if module loading is needed.
- Use currentLocationSelected as presentation choice, with regionId home for existing gameplay. Ordinary home must remain visibly selected only when currentLocationSelected is false. Current location should show selected/aria-pressed state in travel and world summary.
- Persist only sanitized municipality name/display/prefecture and profileId in lifetime.currentLocation. Never persist coordinates or request GPS on page load. On reload show saved municipal scenery; failed refresh retains saved scenery and allows retry.
- local-scenery.js exposes resolveLocality(municipality) and sanitizeLocality(value), through window.NaotocchiLocalScenery and CommonJS. Return {name,display,prefecture,profileId,description}; profileId is one of metropolis, harbor, basin, town. Municipality matching must include prefecture where provided, explicit city names, no arbitrary 'every city is metropolis' assumption. Curated examples: Hokkaido Hakodate harbor, Nagano Iida basin, Osaka Osaka metropolis, Tokyo special wards metropolis. Unknown municipalities town, description states general city image. Use official geographic source evidence or avoid speculative assignments.
- Preserve prefecture from provider if available; don't change legacy object shape if absent. currentEnvironment() adds locality only when home+selected, using live municipality or sanitized saved choice. Renderer will consume locality.profileId. Root owns world-scene.js/css and all artwork.
- Handle asynchronous cancellation when leaving travel overlay or selecting another region; only commit selection on valid municipality and playable state. Keep existing travel cost behavior, no achievements invented.
- TDD regression coverage: known/unknown/colliding names, stale or malformed saved values, reload, denied GPS, explicit home clears choice, pending selection cannot override another choice.
- Run focused tests. Do not edit root-owned assets/world, world-scene files, package.json/cache tokens, QA docs. Do not commit while root is editing; report exact files and tests.

## Task 2: Artwork and renderer (root)
- Compare all 13 existing region images. Generate separate city day/night, home interior, farmland, tropical jungle and shore. Add local harbor/basin/town scenery.
- Reuse already distinct forest seasonal/alpine/snow/sea/abyss/desert/cosmic/memory art. Remove shared willow overlay from jungle and forest; keep habitat-appropriate foreground.
- Home is indoor: suppress rain/snow/leaves/frost/mist and outdoor foreground, preserve warm interior at night. City night uses dedicated neon art. Indoor/time authored scenery stays legible without double dimming.
- resolveScene consumes environment.locality.profileId only for home selected by caller; resolves separate scene key/image without adding gameplay regions. Scene cache key must change between municipalities/profiles.
- Add regression tests before renderer changes. Verify image presence for all conditions and generated asset provenance. Avoid stale old seasonal city/home images overriding new artwork.

## Task 3: Integration and review
- Bump asset tokens, npm test, mobile browser 390x844/320x640 and desktop. Exercise current location success/failure/reload, home switch, day/night city, indoor rainy/snowy, core regions.
- Save concise QA and image provenance. Review final diff independently, address concrete findings. Recheck remote main/open PR, push feature branch and open reviewable PR. Report CI and limitations accurately.
