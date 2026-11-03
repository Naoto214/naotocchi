# Resume production Home: fixed care controls

> Execute inline with executing-plans. Continue PR #490 at bb644d75; do not repeat the integration.

**Goal:** Keep the 5+4 care buttons usable on short screens while preserving the approved 2.5D world.
**Architecture:** Production-only CSS fixes header and care controls within the safe viewport. The central frame may scroll when its intrinsic content exceeds the available height. Keep the 380px stage, 42px notice, 76px conversation and current fonts. The background moves by the same presentation scroll offset, without changing navigation or actor coordinates.
**Spec:** Owner's 2026-10-30 choice and follow-up: fixed buttons, prefer spacing/layout adjustments, no geometry/save changes, no scaling or removed functions; all widths/counts/rotation/input/conversation must pass before merge.

## Approaches
- Owner chose fixed controls with central overflow; artwork and touch sizes stay intact.
- Shrinking the entire scene was rejected because it changes visibility and would require navigation work.

## Constraints
- No modifications to navigation polygons, collision rules, actor positions, save schema or gameplay.
- Preserve v9 preview files and source PRs. Add production-only presentation files.
- Keep all existing tests; do not turn red checks green by deleting or weakening their assertions.
- Known baseline: care-attention low-life fails physical hit test at 320x640; legacy fixed-layout/formation tests conflict with approved terrain layout. Report separately until explicitly covered.

## Tasks
1. Add strict browser regression for visible/tappable 5+4 controls, safe areas, 42/76 slots, intrinsic stage and non-overlapping speech/meters. Run RED on existing candidate.
2. Add production-only layout/touch presentation; run GREEN including scroll, text, actor coordinate preservation and image alignment.
3. Run 320/375/390/430, 1/6/28, rotation, physical pointer inputs and conversation. Run protected byte checks, old-save comparison, full suite and CI. Investigate failures without changing geometry.
4. Fresh whole-branch review, preserve exact evidence in GitHub, merge/publish only with all mandatory gates successful. If geometry/input blockers remain, keep Draft and report.

## Review focus
- iPhone safe areas and rotated landscape controls; long text and native scrolling.
- Scroll leaves actor local positions and rendered ground alignment unchanged.
- Menus, egg, life-card screens and existing source preview behavior are unaffected.
