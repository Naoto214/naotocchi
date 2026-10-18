# Relationship Expression pilot — human Home preflight

Date: 2026-09-30
Status: PRE-GENERATION HOME PREREQUISITE GREEN

## Context
The automated browser environment could not launch Chromium because socket creation was denied. No automated Home screenshot or DOM measurement was fabricated.

The human tester therefore supplied screenshots from the actual mobile Home UI. This check is evidence for real Home scale/density and complements, rather than replaces, the existing normal-asset 128/104/80/64 inspection in:
- docs/qa/relationship-expression-pilot-preflight-20260930.md

## Human-observed Home evidence
Two actual mobile Home screenshots were reviewed.

### Dense companion Home
The screenshot contains many simultaneous companions and visibly includes the normal asset for:
- じかんにルーズなとけい (clock)

Observed:
- companion presentation is substantially smaller and denser than the main character;
- clock remains identifiable as a clock at actual Home scale;
- its dial/face region remains visually present, but fine detail is necessarily limited;
- multiple companions occupy the Home simultaneously, so making every companion flash positive together would add unnecessary visual noise.

Design implication confirmed:
- ordinary successful じゃれる uses one representative positive Reaction;
- lonely remains per-individual persistent state;
- threshold-rescued lonely companions may all show positive because that transition carries direct causal meaning.

### Partner Home
A second actual mobile Home screenshot shows a partner rendered beside the main character.

Observed:
- partner presentation is materially larger than the dense companion presentation;
- partner facial Expression has more usable visual area than a companion;
- positive/lonely partner images remain a reasonable pilot hypothesis for actual Home presentation.

## What this preflight does NOT claim
The supplied screenshots did not show forest_bear or rock_octopus as the active partner.
Therefore this record does NOT claim that either pilot partner normal was individually observed in Home before generation.

That is not retained as a pre-generation blocker because:
1. both normals already passed direct 128/104/80/64 inspection;
2. the actual partner Home presentation scale has now been human-observed;
3. requiring the human tester to replay until a specific partner is acquired would add gameplay burden without materially improving the pre-generation gate;
4. pilot-specific forest_bear and rock_octopus Home verification remains mandatory after the 8 pilot images exist and before pilot GREEN.

In particular, rock_octopus must receive post-generation Home QA for face readability and preservation of its eight-arm structure at actual rendered size.

## Pre-generation decision
The missing-real-Home blocker recorded at ea316aa507b670ce9fca7c9b909a67ae64ac77de is resolved for the purpose of beginning the eight-image pilot.

This does NOT mark:
- pilot images GREEN;
- runtime GREEN;
- final Home GREEN;
- forest_bear Home GREEN;
- rock_octopus Home GREEN.

Those gates remain later in the approved pilot sequence.

## Resume order
1. Fresh-check remote pilot/design/main and protected hashes.
2. Produce ONLY the eight pilot images:
   - otter positive/lonely
   - clock positive/lonely
   - forest_bear positive/lonely
   - rock_octopus positive/lonely
3. Complete image-only QA before runtime edits.
4. Only after image GREEN, connect the thin Relationship resolver.
5. Perform pilot-specific actual Home QA, including forest_bear and especially rock_octopus.
6. Regression/hash/save checks.
7. Stop for human visual approval. Do not produce the remaining 80 images.

No production image, runtime, save, schema, migration, main, design-branch, or PR #278 change is made by this record.
