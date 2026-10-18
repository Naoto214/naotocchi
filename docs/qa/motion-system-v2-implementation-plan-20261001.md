# Motion System v2 — implementation plan (2026-10-01)

Authority: `docs/qa/motion-system-v2-design-20261001.md`.
Branch: `design/motion-system-v2-20261001`.
Baseline main: `591b9def6a88733721249f80d3138087d00764f0`.

## Guardrails
- Do not change images, save schema, progression, Relationship Expression ownership, or main.
- Keep `cast-motion.js` compatibility boundary.
- Build shared semantics before broad visual tuning.
- Pilot recovery first; no full rollout until pilot review.
- Preserve reduced-motion, overlay suppression, attached equipment sync, and canonical rest.

## Sequence
1. **Characterization / RED fixtures** — lock current event mapping, 3px/1px dense behavior, interruption/rest, reduced-motion, equipment synchronization and Relationship target behavior.
2. **Semantic priority layer** — introduce L1/L2/L3 metadata and ambient/focused/group budgets while keeping current visuals unchanged.
3. **Recipe composition** — add minimal primitive sequencing behind existing API; no generic animation DSL.
4. **Recovery pilot RED→GREEN** — add `recover` recipe and a focused L3 budget. Pilot only explicit eligible cure transition. Initial visual target: anticipation, one 10–16px-equivalent safe lift, soft overshoot/settle; no repeated happy bounce.
5. **Recovery integration audit** — distinguish successful cure from wrong medicine and from passive state threshold changes. Persistent expression resumes correctly if another state still applies.
6. **Representative QA** — pet-only + partner + 26 companions; small/large/floating/rigid art; 390x844 and 320x568; reduced motion. Human iPhone visual review is a gate for broad rollout.
7. **L2 care rollout** — feed/play/annoyed/clean/wake using approved primitives.
8. **L3 milestone rollout** — evolve/transform/companion_new/partner_new/marriage.
9. **Motion personality layer** — map existing personality exceptions into reusable soft/bouncy/heavy/float/quick/slow/rigid classes; representative species QA before broad assignment.
10. **Full regression / landing decision** — runtime + Home + Relationship + asset integrity + browser QA. PR/Ready/main merge only after explicit approval.

## Recovery pilot acceptance
- cure is visibly stronger than idle and ordinary settle;
- one readable peak, not arcade bouncing;
- focused pet remains readable with 26 companions;
- no permanent layout resize or actor pushing;
- no transform drift after repeated/interrupting actions;
- equipment follows pet exactly;
- expression assets unchanged;
- wrong medicine remains negative;
- reduced-motion omits/minimizes travel without losing cure state;
- no Relationship heart/ring ownership regression.

No implementation is authorized beyond the recovery pilot until its visual language is reviewed.
