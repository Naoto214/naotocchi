# Home diorama Pilot — 2026-10-22

Purpose: preserve travelling and care, while the current, officially present cast lives in a small interactive landscape. User authorizes design, implementation, tests, new Draft PR and owner-private preview; no main merge, production deployment, care/economy/save changes.

Baseline: remote main f69310c79131f51ceed043417cf4c39cab925331, verified via GitHub API. Independent worktree. Open PRs #419/#421 own Conversation v2, #422 owns Naopoyo expansion, #420 owns minigame family selection. Avoid their logic.

## Architecture
Use existing full-viewport WorldScene artwork, season/weather/light/particles; add an SVG/CSS local ground scene inside castStage with depth layers, low-frequency fauna and foot shadows. No Three.js import or extra asset downloads. Three alternatives considered: full 3D is unnecessary and costly; raster-only effects cannot anchor walks; DOM actors + SVG ground preserves official art and existing WAAPI motions and is selected.

Pilot uses official forest / river_lake / city. Read meguruMod.REGION3D and WORLDS palette, vegetation, water and architecture at runtime, without copying or changing their definitions. Reuse currentEnvironment and WorldScene.resolveScene. Home geometry is intentionally separate from Meguru exploration coordinates, sharing semantics and art direction.

Pure home-diorama-model.js owns ephemeral actor positions, safe bounds, collision avoidance, walking and quiet idle actions. home-diorama.js binds the existing visible actor nodes only; never creates a pet, companion or partner. Parent CSS translate composes independently with Motion v2 transform. Existing layout owns sizes, art, equipment, relationship effects and speech; adapter resynchronizes after each layout and tracks speech anchors. Sparse visits stay sparse.

Pointer Events, pointer capture and CSS-pixel drag threshold follow Naopoyo's input pattern, not its grid rules. Tap actor selects and gives a quiet existing Motion v2 gesture. Ground tap or release after drag sets a walking destination. Eight CSS pixels distinguishes drag; secondary pointers cancel. Ground/actor controls are keyboard-operable. Care, active speech/motion, sleep/illness, overlays, hidden document and minigames interrupt movement; commands during these states are discarded. Cancel and lost capture never move.

Bounds keep painted art and motion headroom within the stage, above speech/poop. Region, viewport and visitor changes reconcile positions; dense casts stop wandering when no collision-free point exists. No save writes or use of gameplay RNG. Night slows idles; rain prefers tagged shelter. Reduced motion removes idle travel/bob/background motion but retains low-speed intentional walking. Hidden/inactive scenes stop RAF and animations, resume without catch-up. Quality tier reduces background details and frame rate.

## Reactions / future conversation
Emit frozen version-1 context-only events (tap, move, arrive, environment, proximity), with actor key/kind/id, source, region, tags, neighbors and relationship kinds. No entity/state references, text, mutation, rewards or new conversation pool. Per-actor cooldown and silent events permit future Conversation Director to choose whether to speak. No automatic bridge to Conversation v2 in this Pilot.

## Verification
Pure-model tests: supported regions, clamp/swept collision, stable roster, care priority, cancellation, reduced motion, no saved mutation, cooldown. DOM adapter integration tests: input target, visibility, changing nodes, layout rebasing, speech anchor, attachments. Existing Home/free-life/motion/expression/save/world/Meguru/Naopoyo regression suite. Browser QA at iPhone-sized viewport plus owner iPhone Safari acceptance explicitly outstanding. Preview uses separate origin, no production storage access; expose a separate QA page with disposable fixtures, never force relationships in real Home.
