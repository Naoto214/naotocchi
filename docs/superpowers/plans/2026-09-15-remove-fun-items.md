# Remove all fun items implementation plan

User approved removal of all seven fun items and related features. PR #274 stays Draft; never merge main. Base: 905e8794615fec5c99ab36545d16d20bd5982464.

## Requirements

- Remove fun_candy, fun_bubbles, fun_balloon, fun_fireworks, fun_camera, fun_musicbox, fun_surprise from active catalog, shop, grants, offline gifts, home shortcuts and use handlers.
- Remove their dedicated reactions, timers, sound/tune/photo presentation, and dedicated memories UI/actions. Preserve ordinary conversation, dating, life cards, free BGM, regular companion recruitment, letters, lantern, and travel memories. Shared helpers remain only where another live feature needs them.
- Remove only fun-exclusive achievements. Adjust the mixed item-all achievement to collect currently supported equipment IDs rather than raw array length. Preserve unrelated achievements; retired achievements must not block PERFECT.
- Normalize legacy saves exactly once: refund valid nonnegative integer stock of the four consumables at 10/25/35/60 coins each. Refund each owned tool once at 900/1200/600 coins, even if it appears simultaneously in legacy inventory and ownedTools. Respect legacy ownedConsumableItems tool ownership migration (only for saves where old migration considered it real ownership). Do not refund purchase/use history as consumable stock. Already reserved balloon stock is not double credited. Clear retired stock/ownership/reservations/cooldowns/history needed only by the retired subsystem. Preserve unrelated money/items/records. Persist a migration marker across reload, reset, infinite snapshots. No obsolete reward subsystem resurrection.
- Historical fun-only records may be removed as part of the user-approved dedicated subsystem removal; shared letters/lights and normal life history remain. Shared specials must retain ordinary travel/date records; remove only records identified as originating from retired fun items.
- Do not redesign remaining five equipment items or the twelve proposed consumables in this change.
- Do not create any temporary workflow or production patch tool.

## Task 1: Runtime, migration, UI and regression tests

Read existing implementation before edits. Add meaningful migration/runtime regression tests first and confirm RED. Remove active paths and update old tests: delete only retired-feature-exclusive tests; keep shared functionality covered. Audit cross-file uses (script, item-system, item-memories, audio, HTML/CSS, browser fixtures and test harness). Recompute asset versions. Run npm test; report exact outcomes. Do not weaken browser layout checks to hide failures. Commit only own changed code/test files; do not push. Root coordinates browser CI and docs.

## Task 2: Documentation and final verification

Update active V2 documents with the latest deletion decision, no new product design. Review Task 1's diff independently. Run npm test and home-layout on final commit through existing permanent GitHub workflows, including Chromium/WebKit. Confirm no temporary files in PR and Draft/unmerged state. Record final HEAD and concise report.
