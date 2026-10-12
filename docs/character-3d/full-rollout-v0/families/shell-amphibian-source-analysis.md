# Shell and amphibian source interpretation

Authority: the16 original turtle/frog PNGs in inventory. No new gameplay states or actor identities. Reuse quadruped/fish where their actual anatomy fits; representatives remain outside runtime until four-view and normal-distance QA.

## Turtle

- 01 broad infant head, shallow small shell, very short wide-set feet;02 larger round head above the front feet;03 one wink and lifted front foot. Head-to-shell ratios and pose matter more than size.
- 04 neck extends forward/up from a longer oval shell;05 shell rises into a taller dome while head is relatively smaller;06 very high dome and more withdrawn head, visibly older neutral face.
- 07 small forward head, high shell and a little moss;08 low withdrawn content head and irregular moss patches covering the old shell. Moss must be attached volume, not a new fauna actor or spikes.
- Shared mechanism: short splayed quadruped limbs, flat reptile head without mammalian ear/snout geometry, continuous shell dome and pale plastron, scute fields through vertex colour. Shell belongs to body rig. Preserve all dog/cat/Pilot defaults exactly. Empty ear anchors may remain for shared motion compatibility but must carry no geometry.
- Representative05 establishes shell/body/head overlap and feet. Judge from all views before filling other stages; do not substitute uniform scaling for age stages. Source side/back continue visible shell scute pattern without unsupported ornaments.

## Frog

- 01 dark olive round tadpole, pale belly, long broad finned tail and closed eyes;02 smaller head and more extended taper, round neutral eyes. Fish body machinery may help, but a tadpole is not a salmon with a recolour: it has a round head/core and tapering sheet-like tail.
- 03 only hindlegs under the round core and full tail;04 forelegs plus thick folded hindlegs and the still-long tail. Limbs must join the existing core, using the same actor locomotion/state.
- 05 large frog head, short tail remnant, two arms/folded hindlegs and a wink.06 active open pose and closed smiling eyes;07 upright stable crouch, large raised eye lobes and pale throat/belly;08 broad older relaxed squat and subdued colours.
- Adult anatomy requires eye-bearing upper lobes, flattened broad mouth/head, long forearms and folded broad hindlegs with splayed digits. Do not force the source into an earless dog with straight legs. A reusable crouched limb profile may fit quadruped responsibilities; decide after representative geometry, not from inventory's original label alone.
- First representatives:03 tadpole/hindlegs,05 remnant-tail transition,07 crouched adult. No phantom extra face on eye lobes; one canonical face. Growth and locomotion remain presentation only.

## Gates

Finite geometry/rig and all canonical emotions × idle/walk × normal/reduced; mutations for new shared options; Pilot28 numerical hashes unchanged; original/four-view and ordinary-distance exact/live/fallback0. New candidates never add to runtime coverage before those image gates.

## Implemented candidate mechanisms after representative gate

Turtle05 source273fe84 now has continuous surface-following scute seams visible in close and ordinary-distance captures. Seams and optional moss volumes are merged into one shell draw. Stages01–08 explicitly vary shell height/length, head ratio/withdrawal, neck, feet, normal eyes and lifted paw;07 sparse moss versus08 broad irregular attached patches. Full-eight image gate remains required.

Frog03/05/07 use an optional **crouched quadruped** profile: continuous broad head plus optional eye-bearing lobes, independently specified folded hindlimb/forearm paths, three splayed digits and a tapering membrane tail. One existing quadruped rig/gait/canonical face. Hind-only stages retain empty fore anchors for the existing four-limb gait contract; no visible phantom arms. No new archetype or actor state. The optional morphology is implemented separately for readability and reusable by other squat/long-armed quadrupeds; it is not a per-species registry builder. Representative image gates pending.

Ruling: retain the existing quadruped locomotion for this first crouched morphology candidate, rather than add a new gait before visual evidence. The original establishes resting anatomy; animation should be judged in motion evidence. Cost if insufficient: an explicit crouched gait may be needed before promotion; no gameplay movement semantics change.

Frog full-eight candidate data now separates01 round closed-eye tadpole from02 longer-tail/open-eyed tadpole;03 hind-only;04 forelimbs/full tail;05 short remnant tail;06 open splayed pose/raised eyes;07 upright folded crouch;08 broad low older squat and muted mottle markings. No neighbouring stage lookup or uniform scale growth. The latter five records were prepared after representative topology had been viewed atf33 and clear haunch/eye findings fixed; all still await their own complete image gate. Any representative recapture failure invalidates expansion until corrected.
