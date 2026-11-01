# Forest F2 / Jungle J3 comparison implementation plan

> **For agentic workers:** Use executing-plans; no changes to production runtime.

**Goal:** Two beautiful, distinct candidate environments with owner-private original/1/6/28 and playable comparisons.
**Architecture:** Additive files on an independent branch from main. Build a disposable comparison using the byte-verified PR490 runtime at 323debc35f44136d64ae74fadf8f36da7f358e86. Only generated comparison manifests/fixtures change. Original runtime, movement, UI and assets stay untouched.
**Tech Stack:** Existing JS/Canvas 2.5D runtime, PNG originals, WebP delivery, buildless private Sites.
**Spec:** User's full F2/J3 brief; reproduced as constraints and choices below.

## Constraints and design
- F2: Japanese broadleaf clearing, gentle light, grass, no water/waterfall.
- J3: vivid rich subtropical ferns, dark still wetland behind safe reddish forest floor; no central road.
- Preserve all 13 adopted backgrounds, formal characters, care, relationships, expressions, motion, conversation UI, save schema and 5+4 controls.
- New geometry only for candidate copies; no algorithm changes. Current forest/jungle remain exact comparison references.
- Main and PR490 receive no commits. No Pages publication, no merge, no force push.
- Separate owner-private Site and namespaced disposable QA storage.
- Landscape beauty is a visual judgment, not proven by numeric tests; owner decides adoption after iPhone review.

## Review focus
- Wetland boundary rejects movement and routing.
- Narrow/rotated screens keep feet on ground without changing collision rules.
- 28 actors remain visible and able to move; no duplicate/repainted characters.
- Current candidates and other regions remain byte-identical.
- Lazy gallery loads one playable iframe; does not run four games together.

### Task 1: Art and geometry
- [x] Generate distinct F2/J3 originals with imagegen, no characters.
- [ ] Save originals and delivery derivatives without overwriting any source.
- [ ] Define candidate ground, exclusion, seats, depth, foreground and observation points after inspecting the originals.
- [ ] Test dry-ground rejection, seats, unchanged reference configs and paths using existing navigation.

### Task 2: Private comparison
- [ ] Implement reproducible build from pinned runtime plus candidate files.
- [ ] Gallery: four originals, per-scene 1/6/28 stills, one interactive full game at a time, full-artwork view and navigation overlay.
- [ ] Generated fixtures retain existing production rules; isolate all storage and reset only comparison state.
- [ ] Validate 320/375/390/430, landscape rotation, tap/drag/autonomy/rest/observe/social, depth/shadow/occlusion.

### Task 3: Evidence and delivery
- [ ] Save visual evidence, checks and limits; run baseline/regression and independent browser CI.
- [ ] Review whole branch and address material findings.
- [ ] Push only independent branch, open Draft PR against main, deploy new owner-private Site.
- [ ] Verify final HEAD/CI, owner-only access and unchanged main/PR490; report remaining limitations.

## Rulings
- Reuse pinned latest PR490 runtime only as a build input, keeping the Draft PR diff independent of PR490's 1,511 files.
- No extra design approval requested: the supplied detailed brief explicitly authorizes production through private comparison.
- Earlier photo attachments are not present in this turn; original art follows the detailed botanical, light and composition brief rather than claiming pixel matching to unseen references.
