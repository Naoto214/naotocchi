# Integration ledger — PR380, 2026-10-14

Authority: current user's 11-section integration/conditional-merge request.
- Fresh remote UI/comparison/main/PR/CI verified; dedicated UI baseline119 PASS.
- Separate fresh checkout used, no shared checkout modified. Compared merge changes; comparison and latest main merged without conflicts.
- Ruling: minimal static main-menu link uses existing menu styling; no main runtime bridge or save migration. Cost if wrong: navigation/UI adjustment only.
- New standard/trial profile isolation tests observed RED (missing selection; trial read standard snapshot), then GREEN130. Invalid/ambiguous query retains standard. Browser integration RED (no main entry), then GREEN.
- Browser assertion correction: pagehide/visibility save increments revision on departure. Assert full semantic save equality across departure and byte equality during trial, rather than suppressing legitimate revision updates.
- Ruling: restored runs retain saved canonical roster; newly unlocked species appear next new run, documented in UI. Avoid changing saved rule count/bag/replay. Cost: player must start a new run to use new unlocks.
- Independent reviewer found one Important issue: restored roster label/action index mismatch after main dex expansion. Browser reproduced RED (7 current vs6 saved choices); fixed canonical run roster mapping; GREEN confirms displayed cat -> actual cat and exactly8 gauge spent. No other Important/Critical findings.
- Mutations50/50; core DOM6; dedicated130; four portrait sizes; main menu320/390; trial isolation; existing player flow/input/effects/offline passed.
- Root regression and remote CI are pending at initial implementation checkpoint. Merge remains gated.
