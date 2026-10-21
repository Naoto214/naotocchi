# 128 design: board classification, targetless IDs, mixed comparison

## Source boundary

127 commit `d043bfa09f67e089cbb3a193b59c27c48e95c5c8` and its four raw stop files are immutable inputs. Recompute their byte SHA and game/continuation hashes; restart each independently. The 117 legacy expected 190 versus observed 263 remains separate.

## Three independent responsibilities

1. Board abilities: classify each encountered board card by source text as an independent normal action or a non-independent ability (`none`, `continuous`, `triggered`, `passive`). Register source reference and classification, enumerate one excluded board unit for non-independent cards. Unknown or independently activated abilities stop; never infer absence from missing registry entry. Existing 121 registry supplies its two entries; 128 adds the source-grounded `C-box` absence without branching on its identity. Turn-start classification uses the same overlay.
2. Targetless hand actions: when 121 has already admitted a hand action and its validated target expansion is exactly empty, assign `candidate-{action_type}-{source_instance_id}`. This is the existing companion/partner placement grammar applied generally and is distinct from 127's single-target `candidate-{action_type}-{source_instance_id}-target-{target_instance_id}`. Preserve the existing birth variant ID and reject unknown or multiple targets. Do not create a dummy target.
   If the same source/action has multiple admitted targetless variants, use the user-approved `candidate-{action_type}-{source_instance_id}-{candidate_variant}` and the existing 114 variant identifier. Keep the shorter ID for a single admitted variant. Never apply this variant suffix to a target-bearing or multiple-target action.
3. Mixed action comparison: apply 107/114's earlier priorities, certain growth and certain time balance to *all* complete admitted candidates. A free person placement that satisfies the six 116 conditions dominates pass; a paid action with no certain immediate growth/time benefit loses on time. An unclassified immediate effect stops before comparison. Seed only the incomparable safe free placements. For the reached bowtie, its printed draw is conditional on a later turn start; no immediate gain is credited.

## Replay boundary

Keep the 127 event/hash-chain machinery and 123 six-stage turn-end proof. Extend only current-state enumeration, comparison, and source-grounded transition handlers as necessary. If a candidate is selected but no existing effect-resolution handler can apply it, stop at the exact pre-action state. Never derive a result from the saved stop's prior boolean. Preserve every older file and never count a seeded route as an independent balance sample.
