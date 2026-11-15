# Home natural yielding VERSION 1 implementation plan

> For agentic workers: use the assigned bounded implementation and independent review tasks. The user's requested prototype/comparison workflow is the execution scope; no production integration is authorized.

**Goal:** Compare unchanged V5 (A), manual-only yielding (B), and modest manual plus ambient yielding (C), using actual pointer arrival and collision safety.

**Architecture:** Keep V5 navigation, geometry, collision and drawing unchanged. Add an ephemeral coordinator inside the movement model. Try the existing detour first; when blocked, prove that one short safe retreat improves the requester route, walk the blocker normally, then resume the request. Expose modes and diagnostics without modifying saved state.

**Tech stack:** Existing browser JavaScript model and navigation, Node/Playwright QA, static private Sites comparison.

**Spec:** User's natural yielding V1 request; prior investigation `docs/qa/home-display-audit-v1/README.md`.

## Constraints and decisions

- Role-independent treatment. Only current manual operation gets temporary priority.
- Preserve contact formula, body sizes, hero additional110%, depth, foot-y drawing, V5 bounds, 52 backgrounds, items, 76px speech and other UI/save behavior.
- One yielding blocker globally, no recursive yielding. Protect intentionally resting/sitting, moving, held or recently manually controlled actors. Initial unchosen rest can be eligible; otherwise frozen start comparisons could never exercise yielding.
- Existing ambient cap5/3/2 includes yield movement. Manual request may wait for a slot; do not blindly increase caps.
- Candidate retreat must pass unchanged bounds, terrain, visibility and collision predicates along its path. Validate requester benefit with the hypothetical endpoint before activating. Never teleport or automatically return to old seat.
- Tune distances/cooldowns from evidence, record adopted values and rejected options. No claim that every jam can be resolved.
- Separate raw requested pointer, paint/terrain-safe destination, partial progress, and arrival. Reproduce #559 count28 baseline78/112.

## Tasks

- [x] Confirm #558/#559 findings and save this plan on a new branch.
- [x] Model + focused regression tests: modeoff equivalence, successful retreat, blocked/no-space/rest, role equality, cooldown/budget, held/cancel/reduced-motion/reflow safety.
- [x] Build a disposable A/B/C runtime and Japanese mobile comparison controls; separate saves and deterministic reset. Preserve existing V5 comparison.
- [ ] Repeat 1/4/10/20/28 pointer matrix with identical starts and inputs, plus seeded autonomy distances/stops/yield/contact metrics. Diagnose any old endpoint loss.
- [ ] Review model and evidence independently, resolve safety failures, record limitations and recommend A/B/C from results.
- [ ] Save stages to GitHub, publish a new owner-private comparison only, create independent Draft PR; verify protected heads unchanged.

## Review focus

Manual selection/held blocker must cancel safely; scene/item/size changes must discard stale reservations; incomplete retreat must not count as passage; simultaneous ambient movers must respect budget; pair cooldown must prevent reciprocal oscillation while preserving an existing V5 route.

## Alternatives

A adds no yielding and remains control. B confines retreat to explicit input and has least ambient disturbance. C reuses the same safe retreat after a short ambient wait, with shared movement budget. C is the requested first candidate, but B/A remains the recommendation if measured safety, baseline reach or naturalness degrades. Fixed role priority, collision relaxation and mass chain movement are excluded.
