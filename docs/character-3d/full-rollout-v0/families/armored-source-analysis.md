# Articulated shell family — representative gate

Source inspected: original player-2 sheet and immutable assets/characters/{beetle,stagbeetle}/07.png. Runtime coverage not promoted.

| Original | Silhouette and volume | Attachments and pose | Side/back interpretation |
| --- | --- | --- | --- |
| beetle07 | Brown rounded abdomen, domed paired elytra behind a broad thorax and small forward head | Six bent legs at three paired body roots; upright curved forked horn, short club antennae | Physical convex covers with a central dark seam, lower abdomen beneath; horn grows from head and legs remain attached through gait |
| stagbeetle07 | Low blue-black abdomen with paired covers, compact thorax, wide head | Six bent legs; two forward curved mandibles with inward teeth, no upright horn | Paired jaws have thickness and open gap; shell covers continue behind thorax, ordinary shared vertex-color material |

Shared armored_insect builder creates one actor with body/head, paired shell and six limb bones. Explicit source paths define limbs/horn/mandibles; no name-derived geometry. Alternating tripod locomotion uses the existing actor clock and canonical motion settings. Head face uses the existing projection/expression contract. Materials, gameplay, save, World and original PNGs unchanged.

Originals show C-curved versus extended grubs01–03, folded amber pupa04, cream emerging covers05, red immature adult06 and squat worn adult08. Larva01–03 and pupa04 remain deliberately absent; do not fill them with scaled adults.

After sourcef641 corrected adult gate, explicit05/06/08 adult candidates were added for both species.05 has a smaller thorax/head, pale domed covers and shortened developing horn/jaws.06 has narrow red covers, finer spread legs and, for beetle, attached raised/angled elytra.08 has a broad low body, short thick legs, muted worn palette, drooping normal eyes and modified horn/jaws. Shell rotation is optional in the shared builder; all previous geometry/poses default to zero. Stag mouth-clearance and attachment checks cover every adult stage, including the broad low08 head. New adult image gate pending; no runtime promotion.

Representative tests first fail for absent module/overlay, then pass: six connected limb bones, real horn versus paired-jaw geometry, split shell, two projected eyes, bounded finite geometry, all canonical emotions/idle/walk/reduced motion, opposite tripod phases and isolated candidate lookup. Mutations remove six-leg topology, horn, mandibles, gait and overlay:5/5 RED. Four-view, ordinary distance and 32-state motion capture run on immutable Actions source before expansion.

## Juvenile representative gate
Inspected both originals01–04 directly.03 is a cream segmented C-shaped grub, gray rounded tail cap, brown face-bearing head and only three thoracic foot pairs; beetle has a broader cream body and golden head, stag a smaller body/darker head.04 is an upright amber pupa with a tapering ringed abdomen, broad folded wing cases and six folded legs. Beetle has a developing forked upright horn; stag has short folded jaw buds. Side/back interpretation retains thick abdomen and attached appendages, no extra face.

Candidate03 extends the existing larva builder with an optional explicit centerline, three thoracic foot positions and tail-color patch. Default Pilot larva geometry remains identical. Candidate04 extends the existing pod builder with an explicit insect-pupa shape; one body and child head use the same canonical face and hop-sway clock. No adult scaled into a juvenile.01/02 intentionally remain absent until these representative captures pass. Image gate pending.

## Veined insect representative
Inspected cicada03/04/07 originals.03 is an amber segmented nymph with broad digging forelegs;04 is a ground-emerging nymph; neither is filled by an adult.07 is a green broad head/thorax over a slender ringed ochre abdomen, six fine legs and four pale translucent wings with gold veins. Front/side/back interpretation gives enclosed thin wing volumes, separate attached opaque veins and no extra eyes on the thorax. New07 candidate reuses the six-leg shared insect body with optional membranes instead of hard covers, ringed abdomen and owner-clock wing motion. Remaining stages await this representative gate.

Sourcec193 ordinary distance identified stag03 closed default larva eyes despite open source eyes. Added a rendered face-spec regression (RED content vs round) and explicit round normal-eye selection; recapture required. Beetle03 C body/gray tail and both04 folded amber pupae are visible with attached faces; full four-view/motion review pending.

Full sourcec193 four-view review additionally rejects the visible grub tail hole and buried pupal rings. TailPatch grubs now receive an attached rounded seal; the pupa ring radius follows the physical abdomen envelope plus a visible rim. Grubs opt out of unrelated pale antennae. Enlarged original review resolves beetle03 happy eyes, stag03 left round/right wink and stag04 drooping eyes; these use existing canonical normal-eye overrides only. No juvenile visual acceptance until recapture.

Sourceb2 cicada ordinary distance and motion review rejects the rounded rear silhouette, horizontally flat wings and missing left wink. Corrected candidate has explicit long tapered abdomen, sloped roof membranes and source left-happy/right-round normal eyes; same four attached volumetric membranes and opaque veins. Await new immutable images before expanding metamorphosis.

After fd51 corrected03/04 visual gate,01/02 expansion: beetle01 small cream curl with low golden half-closed face,02 elongated slightly arched crawling body/open golden face; stag01 tighter small curl with dark open face,02 long low uneven-segment body and relatively broad dark head. All have gray rounded tail and three thoracic pairs, no antennae. Explicit centerlines and proportions differ from mature03; no uniform scale-only fill. Full-family capture pending.

Cicada originals01–04 are amber nymphs:01 tiny short abdomen,02 fuller low body,03 long abdomen with digging foreclaws and folded wing pads,04 raised emergence in a broken soil ring.05 is a pale green adult above an amber empty exuvia,06 slim bright green with elongated pale membranes,07 olive mature,08 dark gray low worn adult. After corrected07 gate,06/08 explicit anatomy/palette/wing proportions added;03 alone represents the juvenile digging mechanism. Do not adult-fill01–04 or omit05 exuvia.

Sourcee1 full16 beetle/stag gate accepted after01 eye correction; runtime promoted. Remaining simplifications are smooth/limited scratched shells, simpler horn/jaw teeth, un-speckled grub tail and folded pupa cases.
Cicada03 c845 side view rejected: abdomen too narrow like an adult tail. Explicit broad nymph envelope corrected.05 emerging pale green adult has hanging partly spread membranes over an open amber shell with six folded empty legs. Shared opened-casing mechanism preserves existing butterfly geometry exactly. Empty casing has no second canonical face or actor. Both corrected03/new05 require immutable image gates.

## Current gate update
Cicada all8 are explicit candidates. Source d0b01eb confirms01/02/03/04/06/07/08 in four views,32states each and normal distance.05 upright adult/open exuvia geometry passes, but normal closed eyes were inconsistent with the source;56ad868 fixes normalEye to round and requires its last image gate. Empty shell remains faceless. Do not count candidate images as runtime promotion.

Antlion07 representative accepted fromf679 after forewing/hindwing hierarchy correction.03 representative accepted fromdfa9 after lowering the front soil rim to expose canonical eyes; rear/lateral concavity retained.01 is a medium cream larva among irregular stones,02 a much smaller larva in a genuinely deeper pit, not a scaled03.06 has pale lengthwise folded wings over a grounded brown body.08 has asymmetrically notched and perforated wings; holes are absent geometry and raised veins avoid them.

Enlarged04 original resolves the formerly uncertain face: closed eyes and a small mouth lie on the closed rough cocoon.05 is an open rough casing containing a golden folded pupa with one open-eyed face. These use a shared granular-cocoon pod modifier, not the adult insect body:04 face belongs to shell/body,05 to the internal head; no second shell face. Grains are physical volumes attached to the corresponding outer surface, with face clearance. All8 candidate stages now preserve32 canonical states. Full01/02/04/05/06/08 image gates remain pending.
