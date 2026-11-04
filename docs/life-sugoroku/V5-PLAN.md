# VERSION 5 implementation plan

Goal: repair geographical branches, expand original minigames, publish owner-only V5. User's V5 request is the approved specification. No main merge or Pages publication.

Architecture: keep V4 state schema and graph; derive UI choices from coordinates with destination names. Reuse byte-identical official games in the existing isolated, deterministic runtime. Keep scores and 15/10/5/0 rewards unchanged. Record unverified candidates separately.

- [x] Reproduce wrong labels; test all 4 forks / 8 edges, save/reload, staged movement and CPU skip. Add branchChoices(id) in tiles-v4.mjs and use it in main-v4.mjs.
- [x] Inventory 50 quick and 100 normal games with IDs, rules, duration and adapter gaps. Extend candidate tests before admitting games to tournament-v4.mjs and official-runtime-v4.mjs.
- [x] Add compatible quick games and normal takoyaki using original callbacks. CPU observes visible targets/gauges; preserve official files. Verify exact input replay, difficulty, no-input completion and reward idempotency.
- [x] Reuse dedicated suite and V4 QA, run 15R simulation, validate 320/375/390/430 portrait/landscape. Distinguish browser QA from physical iPhone verification.
- [x] Record HEAD, adoption counts and unresolved issues; update Draft PR and owner-only existing Site.

Review focus: ambiguous coastal directions; stale clicks after rotation; old V4 saves; canvas color normalization; CPU replay random-state drift. Keep new games out of random pools until verified.
