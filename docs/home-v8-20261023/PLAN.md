# Home v8 implementation plan

> Execute inline with superpowers:executing-plans; independent whole-change review before publication.

Goal: preserve v7 while verifying formal attendance, replacing the ambiguous city foreground road with a small connected park/pavement, and collapsing learned gesture help.
Architecture: existing Home composition, shared Meguru segment meshes and collision/navigation; existing controller handles gestures; a separate namespaced localStorage preference records help completion. No care or attendance changes.
Spec: user's v7 iPhone QA follow-up, 2026-10-23.

## Constraints / decisions
- Base b5a27a18; fetched main acd4ece1. Existing isolated detached worktree clean. No AGENTS.md found.
- Same Draft #426 and owner-only Site; never merge main or deploy Pages.
- Explicit authorization includes design/implementation/publication, so no intermediate approval gate.
- Alternatives: shrink all actors / expand camera / retain 176px. Choose retain pending QA: actual home maximum is protagonist + one visitor, not six.
- Alternatives: remove gray path only / separate renderer / compose connected city surfaces. Choose same renderer, color-aware segments for pedestrian paving and curbs; preserve road at z1400 and its car route.
- Help: unfinished first-use persists until successful actor drag or explicit dismissal; completed state per origin/save-key namespace, not in care save. Menu details always available, replay optional.
- Parallel PRs share package/index/allowlist; no changes to their gameplay code. Refresh main/head before saving.

## Review focus
- Storage denied/corrupt: no exception or care-save changes.
- Failed/cancelled/ground drag must not complete actor-drag learning.
- UI collapse must preserve world position and target reachability.
- Pedestrians must remain within pavement and away from trees; car road stays excluded.
- All registered relationships must still yield at most one formal visitor, no hidden roster truncation.

## Tasks
- [x] 1. Audit registration/visits, regression test all 26 companions plus partner, 2-body sizing/arrival/departure.
- [x] 2. RED tests for city surfaces/routes, implement connected sidewalks/park and existing assets; forest/river unchanged.
- [x] 3. RED help lifecycle/storage tests, controller integration, menu help, responsive collapse.
- [ ] 4. Browser QA widths320/375/390/430, 70/80/90% two visitor types, interaction/help/notice evidence; full official suite and package validation; review.
- [ ] 5. Exact source commit/push existing branch, PR update, owner-only Site v8 and publication verification.

## Ledger
- Research: relationship-life.createVisits has one visitor slot. homePresentCompanions filters this key; homePresentPartner checks same slot. partyMax2 belongs to Meguru invitations, not Home.

- Tasks1–3: 19 focused tests then 14 interaction/runtime tests passed. Browser confirms successful actor drag hides guide; busy conversation/care intentionally blocks earlier drag attempts. Menu help opens normally. City remains same renderer; source shop parts rotated with aligned colliders; foreground ground uses a Home-only lawn palette.
- Review: one Important issue (guide collapse cancels accepted first walk) fixed RED→GREEN by deferring visual collapse. No other reviewer findings. Small-screen expanded menu verified in cloud browser.
- Browser finding: transparent foreground PNG padding stole visible visitor taps. Added failing adapter regression, prioritized existing body bounds, 15 focused tests green. No art or size reduction.
- Ruling: retain176px and existing camera; formal max2 and six ratio/visitor comparisons support it. Browser acceptance is provisional pending owner Safari QA.

## Resumption correction
- Prior screenshots directory was empty; do not accept prior browser-completion claims. Current managed preview is blocked by ENOSPC.
- Used a separate temporary-memory checkout without deleting user source.
- Keyboard selection regression fixed RED→GREEN, independent review clean.
- Main 76f32494 merged into draft workspace; original main remains unchanged.
