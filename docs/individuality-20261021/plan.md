# Individuality 4 + 4 + 2 implementation plan

Goal: Preserve each child's innate differences and record hearts, preferences and twelve choices across a lifetime.
Spec: User-approved 2026-10-21 request; prior species table recovered from 貼り付けたテキスト（1）(1).txt. Latest request overrides its older five-event design.
Base: f252708bd90369afc788077c09374403248f6b7e, tree 2a941be95f31d9b1ae69cf7682bdc72111ee220c.
Architecture: individuality-data.js holds definitions; individuality.js owns bounded, derived experience records and preference transitions. script.js connects real handlers and existing revision-aware save. No separate save channel.
Execution: inline, under user's explicit approval of implementation and routine decisions without intermediate approval.

## Constraints
No main merge, Pages deploy, quick-mode growth, game-rule changes, new currencies or unrelated lane edits. Preserve duelTraits, motion personalities, identities, permanent progress and existing goal history.

## Tasks
- [x] Core: write tests for create/normalize/experience/points/stars/choose/prefer, observe failures, implement pure module and twelve-event catalog. Verify bounds, duplicate rejection, stale life and migration.
- [x] Integration: connect hatch, load, age queue, minigame completion, travel, scenery, companion interaction; preserve transformation and ending boundaries. Runtime tests must distinguish real handlers from direct ledger injection.
- [x] Presentation and legacy removal: profile, resumable choice dialog, life card/archive, guest code, romance, four achievements and registered goal sets.
- [x] Validation: baseline and feature suite, runtime reachability, 12 scenario model, small-screen browser QA, final independent review.
- [ ] Delivery: commit/push, Draft PR and isolated iPhone preview. Do not merge.

## Review focus
Late/stale callbacks; damaged nested save records; new feature on an old adult save; pending choices across stage transitions and two tabs; unbounded preference records and repetition abuse.

## Ledger
- Baseline checkout is isolated. Existing other working copies untouched.
- #414 merged in base; #415 open and unmerged. Existing director is reused.
