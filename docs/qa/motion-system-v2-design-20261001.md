# Motion System v2 — detailed design (2026-10-01)

## Authority and scope

- Repository: `Naoto214/naotocchi`
- Design branch: `design/motion-system-v2-20261001`
- Baseline main: `591b9def6a88733721249f80d3138087d00764f0`
- Baseline tree: `58f91270e6eca091646dee02238661eee09d5ea7`
- This checkpoint is design only. No production runtime, image, save, progression, expression, relationship, layout, or game-balance change is authorized by this document.
- Approved Expression assets and Relationship Expression visual language remain authoritative and unchanged.

## 2026-10-02 approved landing scope and future order

The user formally approved the recovery pilot after viewing all eight real-Home
scenes, including the jump peak. Recovery amplitude, cuteness and overlaps are
human-approved; further aesthetic review is not a merge gate. This approval
supersedes the earlier design-only / human-review-pending status for this pilot.
The current landing includes recovery only; the remaining design is future work.

Future event ownership uses three scopes:
- SELF: the subject reacts (feeding, medicine/recovery, waking).
- RELATIONSHIP: the subject and an explicit relationship target react.
- GROUP: a shared Home event. Preserve the cute shared hop of partners and
  companions after cleaning; do not remove shared reactions indiscriminately.

Implementation order: scopes and large readable base event motions first,
then motion personality (soft/bouncy/heavy/float/quick/slow/rigid). No new
personality implementation or 168-character tuning belongs to this landing.
After recovery lands, start L2 on a separate branch: feeding, play-with,
cleaning (GROUP pilot), waking. Evolution, transformation, companion joining,
partner formation and marriage follow as separate L3 work.

## Goal (original design)

Make Home characters feel larger, cuter, and more alive without turning dense Home scenes into constant noise. Motion should communicate *what happened*, *who reacted*, and *how important the moment is*. The system must remain reusable as characters/events are added.

The v2 principle is **selective amplitude, not global amplitude**:
1. quiet life motion,
2. readable care/reaction motion,
3. large special/celebration motion.

The focused actor may move substantially even in a dense cast. Non-target actors must not be enlarged merely because the cast is dense.

## Current-system findings

Current `cast-motion.js` has reusable vocabulary: bounce, wiggle, shy, love, droop, settle, shake, munch, hungry, sulk, doze, stretch, nod, curious, tick. Individual motion is bounded by `MOTION_RADIUS=3`; `motionRadiusFor(count)` reduces it to 1px above 18 actors. Group lifts provide larger vertical readability (up to 16px). Emotion state already maps persistent hunger/sickness/fatigue/unhappiness/wantsPlay to motion cues. Relationship positive has a separate 900ms target pulse and owner-attached visual cues.

This is safe but creates an asymmetry: expression art is highly specific while many physical reactions remain small or share generic settle/bounce behavior. Cure/recovery and evolution/transform are the clearest examples.

## Motion hierarchy

### L1 — LIFE / idle
Purpose: breathing/liveliness, never demanding attention.

- Typical visual displacement: 1–4px equivalent.
- Long cadence, irregularized by existing scheduling rather than synchronized cast motion.
- Never make all 26 actors perform the same idle beat together.
- Persistent negative-state cues remain readable but gentle.
- Idle is interruptible immediately by L2/L3.
- Critical life state may suppress idle exactly as current emotion authority requires.

### L2 — REACTION / interaction
Purpose: acknowledge direct care, speech, feeding, play, medicine, cleaning, attention and ordinary relationship reactions.

- Focused pet/actor may use roughly 6–12px vertical travel where layout envelope permits.
- Use anticipation → action → settle rather than a single generic hop.
- Listener/supporting actor uses a smaller response.
- Non-target cast stays quiet unless the event explicitly has a group meaning.
- Repeated taps must not accumulate transform drift; new motion starts from current rendered pose and resolves to canonical rest.

### L3 — SPECIAL / celebration
Purpose: recovery, evolution/transform, new companion, partner formation, marriage and similarly rare milestones.

- Focused actor may use roughly 10–18px vertical travel, modest scale squash/stretch and small rotation where character personality allows.
- One clear anticipation and one primary peak; avoid arcade-like repeated bouncing.
- L3 can temporarily suppress ordinary idle/group sway for visual ownership.
- Layout safety determines the final bounded amplitude; semantic priority must not silently downgrade L3 to a 1px dense-cast twitch.

These are design ranges, not hard-coded constants. Implementation must derive safe travel from actor bounds/stage reserve.

## Primitive vocabulary

v2 should compose reusable primitives rather than create one-off animations per event:

- `anticipate`: small downward/squash preparation.
- `hop`: upward lift with soft landing.
- `doubleHop`: reserved for clearly playful joy, not default success.
- `sway`: lateral/rotational soft movement.
- `wiggle`: quicker alternating playful movement.
- `recoil`: brief backward/shrink response.
- `droop`: downward/slow response.
- `stretch`: elongation/upward wake response.
- `munch`: feeding rhythm.
- `nuzzle`: small movement toward an explicit relationship target.
- `float`: slow vertical drift for floating personalities.
- `celebrate`: anticipate → large hop → soft overshoot → rest.
- `recover`: weak/settled pose → anticipation → large relieved hop → soft settle.
- `transformBeat`: anticipation → brief stillness → large reveal motion → settle.

Existing names may remain compatibility aliases during migration. Do not rewrite every caller at once.

## Event contract

| Event/state | Level | Primary motion | Secondary behavior |
|---|---:|---|---|
| ordinary normal idle | L1 | personality idle: sway/nod/float/etc. | actors staggered |
| hunger mild/strong | L1 | hungry; strong more readable than mild | expression remains authority |
| sick | L1 | weak shake/tremble | no cheerful group motion |
| low health/life warning | L1 | droop | critical may suppress idle |
| tired | L1 | doze | slow |
| unhappy | L1 | sulk | slow |
| wantsPlay | L1 | curious/attention lean | more solicitous than generic nod |
| feed | L2 | anticipate → munch → satisfied settle | no mandatory group hop |
| overfeed | L2 | recoil/strained settle | negative |
| play_with | L2 | playful hop/wiggle | target pet large; relevant partner/companion may answer |
| play_with_annoyed | L2 | recoil → settle | no happy second hop |
| clean | L2 | wiggle/shake-off → settle | pet target |
| medicine_wrong | L2 | recoil/shake | negative |
| medicine_cure | **L3** | **recover** | cure should visibly outrank ordinary medicine |
| sleep | L2 | settle → doze | reduced energy |
| wake | L2 | stretch → small hop | not full celebration |
| age ordinary | L2 | soft acknowledge | avoid making every age tick an L3 event |
| evolve | **L3** | transformBeat/celebrate | expression/progression unchanged |
| transform | **L3** | transformBeat/celebrate | distinct from routine age |
| companion_new | **L3** | newcomer celebrate; pet small acknowledgement | do not bounce all 26 |
| court | L2 | targeted love/nuzzle/shy | preserve dialogue timing |
| court_fail | L2 | droop/recoil | no consolation happy hop |
| partner_new | **L3** | paired celebration/nuzzle | owner attribution preserved |
| breakup | L2 | droop with slow return | restrained |
| marriage | **L3** | paired celebration | ring/heart visual language preserved |
| minigame_great | L2 or L3 by existing outcome semantics | celebrate | do not alter rewards |
| minigame_bad | L2 | droop | no second hop |

### Recovery beyond medicine

Implementation must not equate “recovery” only with the medicine button. A transition detector should be considered for meaningful persistent-state exits (for example sick→normal, strong hunger→resolved, strong tiredness→resolved, danger/warning→safe) when the state change is caused by an eligible care action. Avoid celebrating passive threshold oscillation every tick. Exact eligible transitions must be enumerated before coding.

## Dense-cast policy

The current global rule `count > 18 ? 1 : 3` must not simply be enlarged.

v2 separates:
- **ambient budget**: remains small and may shrink with density;
- **focused reaction budget**: belongs to the selected actor and may remain readable in dense scenes;
- **group budget**: used only for explicitly collective events.

For 19–26 companions:
- only target(s) receive full L2/L3;
- nearby idle actors may be temporarily suppressed rather than moved away;
- no dynamic collision solver should push characters around during a reaction;
- no permanent layout resize is introduced just to accommodate animation;
- stage-edge clamping is allowed;
- face visibility and Relationship heart/ring ownership outrank maximal travel;
- all-26 Relationship rescue remains a legitimate special dense case and must not be “fixed” by dropping approved expressions/auras.

## Main pet, companion and partner ownership

### Main pet
The pet has priority for care-action motion. Equipment/accessory must continue to track the pet exactly when visually attached.

### Companion
A companion reacts strongly only when it is the event target/speaker/newcomer/positive rescue target. Ordinary companions should not mirror every pet action.

### Partner
Partner motion may use paired directionality:
- positive/affection: small inward `nuzzle` or paired hop;
- lonely: no cheerful movement;
- partner_new/marriage: paired L3;
- ring stays attached to existing layout authority and must not be repositioned by motion code.

Relationship hearts/auras remain children of their owner actor and inherit actor motion. Motion must not independently animate the heart to a different owner/location.

## Motion personality

Do not create 168 bespoke animation implementations. Introduce a small reusable personality layer. Initial design classes:

- `soft`: rounded elastic settle; default mammals/humans where suitable.
- `bouncy`: quicker anticipation and stronger hop.
- `heavy`: slower timing, smaller rotation, weighty landing.
- `float`: slower vertical drift, low-impact landing.
- `quick`: short timing, small fast wiggle.
- `slow`: long timing, restrained acceleration.
- `rigid`: little squash/rotation; translation/tick carries expression.

Personality modifies tempo, hop gain, rotation gain, squash gain and idle family; it does **not** change event semantics. Existing special personality entries (snail, clock, koala, sekizou, watcher, box, forest_bear, grove_deer, robot_neighbor, cat_ceo) should be mapped into this layer rather than discarded.

Character assignment should come from canonical character metadata if a suitable authority exists; avoid a growing switch statement inside Home rendering.

## Composition and priority

Priority: L3 > L2 > persistent-state cue > L1 idle.

Rules:
- higher priority interrupts lower priority cleanly;
- lower priority must not interrupt active L3;
- persistent emotion cue may resume after a reaction if the state still applies;
- speech ownership remains visible during motion;
- Relationship transient timing remains authoritative unless an explicitly reviewed integration requires synchronization;
- animation completion always restores canonical transform with no accumulated drift;
- reduced-motion remains respected. Reduced-motion should retain state/expression/cue meaning while omitting or greatly minimizing movement.

## Timing language

Preferred ranges:
- L1 beat: 900–1800ms, with long intervals between beats.
- L2: 650–1250ms.
- L3: 1000–1700ms.
- paired relationship timing may align to existing 900ms/2500ms visual lifecycles but must not extend transient state merely to finish decorative motion.

Timing should feel soft, not spring-library hyperactive. One readable peak is preferred to repeated oscillation.

## Safety and layout invariants

Must preserve:
- Home no-horizontal-overflow behavior.
- Main/partner/companion face visibility.
- poop floor reserve.
- conversation area separation.
- approved Relationship heart/aura/ring ownership.
- existing expression asset selection and z-order.
- menu/game/overlay suppression.
- `prefers-reduced-motion`.
- touch responsiveness.
- save schema and progression.
- image assets unchanged for v2 motion implementation unless separately approved.

No motion implementation may silently change cast size/layout to “make animation fit”.

## Proposed architecture

Keep `cast-motion.js` as the public compatibility boundary initially.

Internally separate:
1. semantic event → motion recipe,
2. recipe → primitive sequence,
3. personality modifiers,
4. safety/bounds amplitude resolution,
5. controller priority/interruption,
6. Home integration.

Potential modules are acceptable only if they reduce coupling; do not split files merely for naming symmetry. Existing tests/callers should migrate incrementally.

A recipe should be data-driven enough that a new event can reuse primitives, but avoid a generic animation DSL. The goal is maintainable composition, not an animation framework.

## Implementation order (not yet authorized)

1. Characterize current motion with regression tests: event mapping, bounds, dense count, interruption, reduced motion.
2. Add level/priority and focused-vs-ambient budget without changing visual amplitudes.
3. Add primitive/recipe composition behind current API.
4. Implement `recover` and cure transition as first visual pilot.
5. Human visual review on representative pet stages and dense Home.
6. Add feed/play/clean/wake L2 recipes.
7. Add evolve/transform/new companion L3.
8. Integrate partner/companion paired reactions without changing Relationship expression authority.
9. Introduce personality mapping and representative cross-species QA.
10. Full Home/runtime/browser regression; only then consider PR/merge.

Each visual family should be piloted before broad rollout. Do not tune 168 characters independently before the shared language is approved.

## Representative QA matrix

At minimum:
- pet: small/large visual bounds; animal/plant/aquatic/floating/rigid representatives;
- states: normal, hungry, sick, tired, unhappy, wantsPlay, life warning/critical;
- actions: feed, overfeed, play, annoyed, clean, medicine wrong/cure, sleep/wake;
- milestones: age, evolve, transform;
- cast: pet only, partner, 1 companion, 18 companions, 19 companions, 26 companions;
- relationships: companion normal/lonely/positive; partner normal/lonely/positive; partner_new; marriage; breakup;
- equipment attached to pet;
- reduced motion;
- 390x844 and 320x568 representative viewports plus iPhone human check.

Visual QA must distinguish “code says bounded” from actual browser/Safari appearance.

## Acceptance criteria

v2 is successful when:
- direct interactions are visibly larger than idle;
- recovery and milestones read as special without becoming noisy;
- the reacting actor is obvious even with 26 companions;
- idle cast remains calm;
- expression/heart/aura/ring ownership remains clear;
- no actor drifts from rest after repeated interruption;
- no new clipping/overflow/touch regression;
- reduced-motion remains meaningful;
- future events can be added primarily by choosing a recipe + level + targets + personality, not by duplicating controller logic.

## Decisions fixed by this design

- Do not globally increase every motion.
- Use three semantic levels.
- Dense cast reduces ambient motion, not focused semantic readability.
- Cure/recovery becomes a special motion family.
- Evolution/transform/new relationship milestones get special motion.
- Relationship owner cues remain authoritative and move with their actor.
- Character individuality uses reusable personality classes, not 168 bespoke implementations.
- Images remain unchanged for the initial v2 motion work.
- Implementation is explicitly deferred until this design is approved.
