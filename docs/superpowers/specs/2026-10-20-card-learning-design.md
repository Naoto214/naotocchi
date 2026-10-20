# CARD GAME learning design

Goal: a first-time iPhone player can read the official rules and learn by tapping real cards, without affecting an existing match. User authorized implementation, verification, GitHub Draft PR and a NEW owner-private trial; no intermediate approval, main merge, production Pages, rules or effects changes.

## Architecture
- `rulebook-content.mjs`: 15 short chapter summaries, detailed rulings, glossary, representative canonical card IDs and pinned source references. A generated snapshot retains the complete current 01/02/06 rules and normative part of 07, searchable and expandable in the game.
- `learning-ui.mjs` / `learning.css`: independent modal book and practice, matching green/gold styling. Contents/search/term explanations/card detail; collection and deck-editor links. CPU pauses while any learning surface is open; closing restores original screen. Hidden match information never enters learning.
- `tutorial.mjs`: nine selectable lessons, small substeps, canonical fixed 40-card decks and validated fixed positions. Every user or automatic command comes from `legalActions` and runs through `act`; no engine or rule mutations. Each lesson starts with its own fixed position, explicitly labeled. Fixtures are not match save data.
- Tutorial progress key is independent and stores only completed lessons and current lesson/substep. Resume reconstructs the fixture by legal commands. Skips do not mark lessons practiced. Completion offers CPU beginner setup, without starting/overwriting an existing saved match.

## Integration and safeguards
Keep engine, cards/effects, Python, CPU policies, response/input guards, match save schema, art, main game, immutable400 and Pages allowlist unchanged. Add small links to existing app, collection detail and deck editor. New runtime files are included ONLY in the new private trial. Unchanged production allowlist will require a separately approved future release update for new paths and changed runtime hashes; document this as a merge prerequisite.

## Verification
Meaningful engine lesson traversal tests, stale/wrong actions, reverse-resolution order, storage separation, resume/restart/skip, rules source hashes and chapter search. Existing card suite (known FUN_ITEMS excluded from change scope), CPU/hotseat/deck/collection DOM regressions. Real browser portrait/landscape visual checks via managed preview. Actual iPhone Safari browser chrome and touch remain human QA.
