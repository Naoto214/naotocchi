# Japanese landscape comparison implementation plan

Goal: Add four Japanese landscape candidates to PR462, retaining all prior artwork and v22.
Architecture: Separate japan manifest and wrapper reuse existing navigation and free-life renderer. Separate comparison page and query opt-in; default old experiment retained.
Spec: User handoff dated 2026-10-28, all 19 sections.

- [x] Recheck remote HEADs, reclaim only approved v10 docs/prototypes; retain Git objects and clean sparse worktree.
- [x] Generate home/forest/water/city without characters using built-in imagegen.
- [ ] Add manifest, image provenance, tests for 28-actor safe placement/routes at four widths.
- [ ] Add opt-in renderer and gallery keeping old candidates, saves and baseline.
- [ ] Review all 13 regions and record tentative retain/improve/new classification.
- [ ] Run existing regression and browser QA, inspect composites.
- [ ] Push PR462, verify final HEAD CI, publish same owner-private comparison Site.

Constraints: No main/426/v22/Pages writes, no gameplay/rule/dialogue changes, no deletion of prior assets/tests. Representative images only, daytime/weather effects remain unchanged; physical Safari testing is user-only.
Review focus: narrow/rotated ground, water boundaries, 28 actor escape, save isolation, protected default artwork.
