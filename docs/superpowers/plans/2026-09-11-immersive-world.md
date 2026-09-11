# Immersive world implementation plan

**Goal:** Replace the device presentation with a living, full viewport world, starting with the sea.
**Architecture:** Read the existing environment and care state into an isolated presentation model; keep game, save, cast layout and reaction APIs intact. Use original raster environments plus composited environment layers and readable glass UI.
**Tech Stack:** Existing plain JS/CSS/HTML, Vite development QA, Node tests.
**Spec:** ../specs/2026-09-11-immersive-world.md

## Constraints

- Preserve 100 minigames, schema 5, character assets, region IDs, events and timing.
- No new package dependencies. No main edits or merge. Keep old theme/pattern IDs.
- No rainfall/snowfall underwater; no snow in tropical/desert scenes. Reduced-motion and hidden-page pause must work.

## Tasks

- [x] Inspect latest main, open/related PRs, checkpoint BX, regional QA and baseline tests.
- [x] Add `tests/world-scene-test.cjs`: test sea light attenuation, climate-specific precipitation, deterministic DOM, all environment combinations, care stages, pause/resume and save-neutral integration. Run `node --test tests/world-scene-test.cjs` and record expected missing-module failure.
- [x] Add `world-scene.js` with `resolveScene(environment)`, `careLevel(state, notice, immortal)`, `createRenderer(document)` returning `{update(environment,flags), destroy()}`. Input environment is `{region,season,time,weather}` from `currentEnvironment()`. Outputs use registered safe asset paths and fixed class names only.
- [x] Wire the renderer at the end of `render()`; preserve existing DOM identities. Scope new CSS under `.world-mode`; old environmental painters remain as compatibility fallback only. Add life/relationship labels using real state.
- [x] Integrate ocean raster backdrop and transparent atlas. Verify ocean prototype in browser with existing `/__qa` synthetic fixtures; fix source issues and record infrastructure limits.
- [x] Extend the registered scenes to remaining regions after the prototype gate; verify distinct assets and climate rules. Never represent unfinished artwork as completed.
- [x] Run existing full suite plus new tests; inspect display and transitions, reduced-motion, narrow/short viewport, old theme selections, crowded cast, warning/recovery. Keep Vite QA fixes required by actual preview errors.
- [ ] Finish the user's added glass request across all home surfaces; fix remaining opaque travel/menu styles, verify contrast and refresh screenshots. See `docs/qa/immersive-world-handoff-2026-09-11.md`.
- [ ] Finalize QA/checkpoint, asset tokens, diff/test checks and current-main integration; review the latest PR checks and readiness. The current Draft saves work in progress.
