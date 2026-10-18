# Relationship free life
User authorized A+B+C implementation, tests and independent Draft PR; no merge.
Base: cee3e8726ef3078e9b349e300c976e831786bbf0; tree 97d9a836daf44fbcf023aab1bbf9c843aa55892a.

## Audit and design
meguru.js buildRegistry currently labels current relationships withPlayer, excludes them from regional residents, and companionsOf creates all followers (up to 27). createSimulation recreates that party at every region entry. Follow formation, collision, corridor transfer and LOD already exist. World residents already have path routing, activities, social reservations, spacing and distance-tier updates. Home script.js renderCompanionRow/renderPartnerCompanion instead permanently display every relationship in a static cast; Home is not a walking simulation.

Separate related metadata from follow. Related residents retain canonical home/habitat region and use existing life AI. No parallel movement AI. Move the same actor between resident and party arrays on explicitly selected accompaniment, cap 2, 60–180 active seconds. Ending, region departure, close and reload release physical companionship without relationship changes. Corridor entry dissolves before coordinate conversion. Arrival at a selected destination may end a trip; ordinary wandering does not end on the first incidental spot.

Share a session-only budget across Home and Meguru; new process starts quietly. Active foreground time only; no offline catch-up. Autonomous near encounters: random 180–360s interval (target 1–3/10min when encounters are available), friend greetings at most 2/600s, partner initiative at most 1/600s, invitations at most 1/1200–2400s. A common 180–360s spacing prevents overlapping initiatives (stricter than the initial 90s minimum). Missing proximity never teleports residents to manufacture quota. Home visits are one actor for 60–180s, use same budget, interval 300–600s. Relationship care remains available when absent. No automatic intimacy rewards or penalties.

Versioned semantic event {version:1,type,actorKey,context,regionId,at,reason}; bounded observer subscription isolated from failures. reunion/greeting/visit/accompany_start/affection_interaction/accompany_end/return_to_free_life; invitation is UI-only. No expression or motion renderer edits. Existing actor behavior/bubble presentation handles short reactions. Expression Work can subscribe independently.

## Validation
Test-first controller and runtime transitions, no auto-follow, real life motion, capped party, expiry, leave/corridor/reload, duplicate IDs, common cooldown, observer failures, Home cast/speakers. Seeded frequency measurements report eligible encounter versus spatial exploration separately; no fabricated proximity results. Full npm test, protected file diff, mobile browser if available; hardware QA remains required.
