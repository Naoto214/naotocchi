# なおころ。人生すごろく 試遊仕様 v1

Base: main85a59bb3de1cfb473485757bfa7a8b6cb9088034 (2026-10-28). User-approved concept; implementation details below are developer decisions within that scope.

## Structure and scoring
Four seats,1–4human local hotseat and CPUs (debug may run0human). Each of10/15/20rounds has one action for every seat. Everyone starts stage1,sodachi20,money20. Rank sodachi descending then money; equal values share rank (1,1,3). No other scoring currency. Only landing events, items and minigames award sodachi; day completion is a diary entry without score. In 20-round mode positive growth is max(1,floor(value*0.75)); negative effects and money are unchanged. UI shows the mode adjustment. Stage itself never gives score.

48explicit nodes in four12-node sectors: forest,sea,city,square. In every sector edges0→1;1→2or6;2→3→4→5→10;6→7→8→9→10;10→11→nextsector0. Equal-length branches prevent accidental shortcuts. A lap is intentional; each move consumes one remaining die step, at most12.12positive,12life,6negative,6social,4item,4fate,4facility.

## Evolution and time
Natural pulses at rounds10:[2,4,5,7,9],15:[3,5,8,10,13],20:[3,6,10,14,18]. Applied at end of personal action; each pulse only once, no catch-up. Event evolution resolves first. If an event evolved this turn, consume that round's natural pulse without another evolution. Natural-only final stage6; events reach7/8. Clamp1–8.
Clock−2stages, retained score/money/location/turn. Suppress natural pulses in current and next personal turn; no queued catch-up. Two future ordinary choice events give+1sodachi each, encouraging revisiting youth. All players receive one clock to make the defining mechanic accessible. Max one item use per turn, inventory3.
Redo adds an alternate-choice record, does not erase the original; each original event once, max2redos/person. Positive redo reward capped+2sodachi/+5money; no evolution/item/time recursion. New losses apply as written. Fate shifts own stage by−1or+1 only.

## Events and fair CPU
46authored events:12daily,8friend,6romance,6work,10adventure,4fate. Each has stage/region criteria,two choices,outcome text/effects,once-per-life limit and album record. No repeat except bounded redo. Main personality/likes/orientation copied read-only; no mechanical advantage. Romance uses the existing identity compatibility rules; non-romantic variant where applicable. Encounters and relationships belong to this match only.
Beginner chooses public options with a deterministic hash of public seed/revision/seat (never future gameplay RNG). Intermediate uses visible rewards, current inventory/money/stage and public neighboring tiles; cannot inspect future RNG or hidden challenge answers. CPU minigame score is easy45–85 / normal55–95, using the saved RNG; this is a stochastic skill model, not physical taps. Difficulty never changes dice probabilities or character stats. Fixed seed and command revision retained in every snapshot.

## Minigames and persistence
Three dedicated competition modes: reaction signal,sequence memory,3×3 Lights Out puzzle. Human hotseat uses a fresh seeded challenge of equivalent difficulty per seat; CPU uses declared stochastic performance. Every2rounds default; compare every round in simulation and estimated duration. Rewards ranks1–4:sodachi4/2/1/0,money8/5/3/1; ties share rank. Pause/reload preserves the challenge,answers and completed scores; interrupted timed attempt restarts its timer with the same challenge and no prior score award.
Save only naotocchi-life-sugoroku-v1 / album key. Imported NTS1.code or main JSON extracts identity only. No write to main or other game keys. Versioned snapshot validation,backup,visible save errors,export/import; album generated only from event/action history. Independent origin cannot access main localStorage; existing save code is the bridge.

## Display and delivery
2.5D SVG board with official World backgrounds and character PNGs; pan/pinch/buttons/follow current player. No new evolution art. Single-image characters keep art with stage ring/label. Touch targets≥44px,scrolling dialogs,safe-area padding,reduced-motion support. Dev map/debug only explicit?debug=1. New private Site,new GitHub branch/Draft PR; no home menu integration.

## Transition contract
turn → optional buy/item → roll → branch (consume one edge per selection) → event/result/redo → continue → next seat. After seat4: mini on rounds divisible by2, otherwise next round. mini → four sequential saved attempts → mini-result (awards once) → next round/done. done rejects commands. Every accepted command increments revision. UI callbacks bind to their rendered revision.

Clock stage decrement is clamped to1, score/money/position/turn unchanged; current+next personal-round natural pulses are suppressed and never caught up. A positive stage effect consumes the same-round pulse. End of action records day, then natural evolution; stage caps at8. Redo is a new bounded entry, never state rewind; no repeat time/item/evolution rewards.

## Save and UI limitations
Saving stores all pending branch/event/mini state and rng. Backup retains last valid save; conflict checks reject stale tabs before changing state. A blocked/quota-limited storage shows export instructions. Timed mini reload deliberately restarts the timer with the retained challenge; this owner-private prototype does not claim tamper resistance. Histories are browser-local, latest20 completed games.

Standard CPU chooses visible immediate route type and displayed option values; it does not plan multiple future turns. Clock policy uses a clock at stage4+ before the final3 turns. Species strength is identical. Relationships exist only as match album events, not a separate persistent social simulation.
