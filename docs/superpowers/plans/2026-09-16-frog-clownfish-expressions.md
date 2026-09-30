# Frog and clownfish expression batch

Spec: docs/superpowers/specs/2026-09-15-cat-expression-pilot-design.md, production-first continuation plus current user handoff.
Baseline local HEAD 0b02c00d500d3f5634c076085a15c403d2147842; remote PR278 HEAD d8952c54179dccf737410c489741887d81577c62, same tree 3fc0970e5273e517f1426011a07d9dd2dc3c2d52. Latest main observed 9fd2a41b8726caeaba7bf7546d9ac428cc5152b4. PR Draft, currently mergeable false; no main merge.

## Task 1: Original-referenced artwork
Inspect all sixteen frog/clownfish originals and generate ten separate transparent expression edits per stage with built-in imagegen. Preserve silhouette, pose, age, fins/tail/legs, accessories, colors. Normalize to transparent128px original bounds using existing helper. Retain prompts and hashes. Prior480 untouched.

## Task 2: Runtime and preview integration
Extend pet-expression allowlist, species food marks, canonical stage names, isolated preview, contact-sheet and gallery support, and meaningful integration/PNG coverage for frog and clownfish all8 stages. Match existing penguin/turtle pattern. No gameplay/romance/save changes. Preserve prior48 placement entries and480 image references/SVGs byte-for-byte. Root supplies new face anchors and runs placement generator after images exist. New image generation is handled by root; do not fake assets. Run focused tests as dependencies allow; no full-suite until assets ready.

## Task 3: Placement, QA and delivery
Observe face anchors, generate only added species positions, inspect160 marked composites, fix clear overlaps. Check all640 marks and sweat envelopes, existing480 preservation, asset and full tests. Save QA/manifest and update same Draft PR/private no-save preview and tap gallery. Real-device review remains with user. No per-stage approval.

Completed:160 original-referenced variants; all64 forms connected; all160 marked composites reviewed;640 marks/384 sweat envelopes clear; prior480 PNGs/routes/SVGs and48 placements identical. Final npm test959 pass,0 fail/skip. Independent final review no important findings. Same Draft PR/private preview publication; no main merge.
