# Articulated shell family — representative gate

Source inspected: original player-2 sheet and immutable assets/characters/{beetle,stagbeetle}/07.png. Runtime coverage not promoted.

| Original | Silhouette and volume | Attachments and pose | Side/back interpretation |
| --- | --- | --- | --- |
| beetle07 | Brown rounded abdomen, domed paired elytra behind a broad thorax and small forward head | Six bent legs at three paired body roots; upright curved forked horn, short club antennae | Physical convex covers with a central dark seam, lower abdomen beneath; horn grows from head and legs remain attached through gait |
| stagbeetle07 | Low blue-black abdomen with paired covers, compact thorax, wide head | Six bent legs; two forward curved mandibles with inward teeth, no upright horn | Paired jaws have thickness and open gap; shell covers continue behind thorax, ordinary shared vertex-color material |

Shared armored_insect builder creates one actor with body/head, paired shell and six limb bones. Explicit source paths define limbs/horn/mandibles; no name-derived geometry. Alternating tripod locomotion uses the existing actor clock and canonical motion settings. Head face uses the existing projection/expression contract. Materials, gameplay, save, World and original PNGs unchanged.

Remaining beetle/stag stages are deliberately absent. Originals show C-curved versus extended grubs01–03, folded amber pupa04, cream emerging covers05, red immature adult06 and squat worn adult08. These require separate morphology/pose parameters after the adult image gate; do not fill them with scaled adults.

Representative tests first fail for absent module/overlay, then pass: six connected limb bones, real horn versus paired-jaw geometry, split shell, two projected eyes, bounded finite geometry, all canonical emotions/idle/walk/reduced motion, opposite tripod phases and isolated candidate lookup. Mutations remove six-leg topology, horn, mandibles, gait and overlay:5/5 RED. Four-view, ordinary distance and 32-state motion capture run on immutable Actions source before expansion.
