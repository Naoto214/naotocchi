# Motion System v2 completion — 2026-10-02

## Authority and scope

Fresh main: `67aed86039731cad091c5d4285a56525edc9f068`, tree `6d3e70df81427377897803b843e706c7c1729d87`. PR373 merged; its main Runtime and Home checks both completed successfully. No competing open Home motion PR. Work branch: `feat/motion-v2-completion-20261002`.

The owner authorizes automatic landing after regression/review/CI. Aesthetic human QA is explicitly post-publication follow-up. No save, progression, balance, image, Expression resolver or Relationship ownership redesign is included.

## Inventory and final responsibilities

| Layer/event | Motion and scope |
| --- | --- |
| L1 normal | breathe, sway, look, posture; one actor per existing 4–9s Home timer; family/actor phase rotates |
| Persistent hunger mild/strong | existing hungry, unchanged emotion priority and cue clock |
| Sick | existing shake; no normal idle |
| Health low / life warning | existing droop |
| Life critical | existing no-cue and pet-idle suppression; specials suppressed |
| Fatigue mild/strong | existing doze |
| Unhappy / wants play | existing sulk / curious |
| Sleeping | existing sleep presentation; no normal idle/specials |
| L2 feed / overfeed | SELF meal / negative settle |
| L2 play / annoyed | SELF play or ticklish / negative settle; Relationship positives remain owned |
| L2 clean | protected common GROUP lift; personality deliberately not applied to the group container |
| L2 wake | SELF held stretch |
| L3 recover | frozen focused SELF 16px; legacy id/gentle parameters unchanged |
| L3 evolve / transform | SELF anticipation, hold, one reveal peak, settle, exact rest |
| L3 companion_new | only the actual new companion; id carried from recruitment result via cancellable speech clock |
| L3 partner_new / marriage | RELATIONSHIP pet + current partner together; no group lift or secondary-line replay |
| court | existing RELATIONSHIP L2 |
| age / sodachi / money / travel / minigame results | existing compatibility reactions, no invented special milestones |
| court_fail / breakup / devolve | existing negative outcomes remain negative |

The public mood API remains compatible. Internal special recipes do not use dialogue wording to infer game outcomes or target ids. Evolve routes only the actual stage boundary, not ordinary birthdays. Recruitment state/results remain unchanged. No new animation loops, timers, per-frame DOM rebuilds or layout reads were added. The existing one-shot WAAPI finish callback is identity guarded; L3 blocks positive/persistent/idle replacement. Legitimate care cancels through the existing conversation controller.

## Personality

Seven reusable classes: soft, bouncy, heavy, float, quick, slow, rigid. Canonical character-world metadata holds family lists, soft default, and minimal structural stage overrides (attached jellyfish, floating starfish larvae, insect larvae/pupae/adults). Each class modifies tempo, lift, turn and inward squash before the existing corner-displacement clamp. Idle family preference is also shared. No per-character animation code, saved personality or random assignment.

Recover bypasses the new modifier. L2 base recipes are byte-equivalent; personality adds bounded body interpretation without changing meaning/scope. GROUP clean remains uniform. Unknown future metadata ids safely receive soft. Legacy per-id parameters stay only for the frozen recover/public compatibility path.

## Ownership, density and accessibility

Focused new L3 uses up to16px independently of dense ambient1px. L2 retains10px. Idle retains existing ambient1/3px envelope. All frames finish at canonical rest and use inward scaling only. Layout coordinates/sizes are never rewritten by motion. Equipment receives the exact pet frames. Heart/aura remain actor children. The married ring retains the solver's coordinates and receives only its owner's translation, never a new ring-position calculation.

Reduced motion produces no WAAPI movement; existing speaker/expression/relationship cues remain. Menu/overlay/hidden-page cancellation and state suppression remain owned by existing runtime guards.

## Verification ledger

- Baseline L2/cast/emotion86 PASS/0 FAIL.
- L3 RED→GREEN; idle RED→GREEN; personality RED→GREEN.
- Ring synchronization and L3 speech-owner tests each reproduced the issue RED before repair GREEN.
- Dedicated motion/cast/emotion115 PASS/0 FAIL (includes23 new tests).
- Home/assets/save/release combined360 PASS/0 FAIL.
- Recover56 combinations: baseline/current SHA256 `49377d52e34cfc656ac0d48f0c85c957bf9421a23bbcd5978ebde386798eeb30`.
- L2 base16 combinations: baseline/current SHA256 `14526ba14eadc60dfdc0ec420360b10ce45489af6d7ebc6b5552e807122b6230`.
- No asset image changes; git diff check clean.
- Local real-browser test not yet executed: runtime browser missing; browser download attempts returned invalid ZIP data. New production-controller/real-Home DOM tests are included in Home CI (Chromium/WebKit,390×844/320×568,solo/pair/few/dense26,reduced motion). They complement actual game event wiring tests; they are not claimed as human visual review.
- Full npm test, independent review and CI results to be recorded after completion.

## Post-publication human QA

Open the normal Pages game. Review idle, hunger/sickness/fatigue, feed/play/clean/wake/recover, stage evolution, transform, recruitment, partner formation/marriage, small/full casts, personalities and Expression/Relationship cues together. Small visual preferences become separate follow-up PRs. No artificial production QA controls or saved debug state are introduced.
