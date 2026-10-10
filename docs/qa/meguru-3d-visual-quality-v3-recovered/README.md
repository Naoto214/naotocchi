# VQ3 — recovered house / garden / entrance unit

Product source: `704faac1e62690d9c4dff5e862a0d8d424cefff9` (recovery commit). Before: `dc91d3e9f99c42cc337db9177c0812e91878facb`, product equivalent to reviewed VQ2 `dea2f17668958ee37dcd6e557e9b2243f34710dd`.

This directory contains newly reproduced evidence. The previous scratch workspace disappeared before its final VQ3 regression and evidence checkpoint completed. Those results are not reconstructed from conversation summaries. `704faac` saved the recovered product tree as WIP; validation is recorded separately here.

Scope: actual-door anchored home garden approaches; forward, finite-road, collision-checked stepping stones; staged relocation of existing ground plants out of approaches; garden beds/gate/mailbox follow the approach; cottage porch depth/width and reachable roof orientation variation. Farmhouse widening was rejected after increasing burial observations and was reverted before this source checkpoint. Countryside is an unchanged control. No renderer, character, Resident Expression, 2D, save or runtime architecture changes.

Historical evidence remains in [VQ2](../meguru-3d-visual-quality-v2/compare.md): 2,832 ray samples, fully hidden 0, partial 1 (mountain), step 1000 and yaw 0/1.2/−1.2/3.14; jungle party x/z circular-obstacle overlap 0.002591405357044607. This overlap is not terrain penetration. New subset results do not replace or erase these observations.

The historical 17c1bdb full regression had 2858 PASS / 1 FAIL (party formation 463 ms versus the unchanged <300 ms limit); isolated rerun passed. Scheduler/load remains a possible explanation, not an established root cause. VQ2 final regression was 2861 + 80 PASS with concurrency 4. Neither is described as unmodified `npm test`.

This unit does not complete World/Art Direction or approve production readiness. iPhone ghost/afterimage, disappearance, stutter, p95/p99/>60ms and final beauty remain Human QA pending. Preview links are not evidence of external reachability; previous githack checks returned 403. PR #374 remains Draft; no main merge or production Pages change.

Fresh results at 704faac: full pipeline 2863 PASS + 80 PASS, 0 FAIL, exit 0, Node test concurrency 4; targeted contracts 12 PASS; all 13 regions preserve canonical 2D/world/collision hashes; rendered descriptors change only in home. Geometry remains float4/bury18 with 18 valid crossings. Home gardens decrease 18→14 and garden parts291→160; this is not a claim that all garden content was preserved or that reduced detail is automatically a visual improvement.

**Browser validation remains blocked:** Chromium cannot create AF_UNIX sockets (errno1), confirmed by an independent socket diagnostic. Zero fresh images obtained; smoke/corridor/visibility not executed; current browser performance counts not measured. Prepared recipes, failure log and explicit missing-evidence status are saved. See [verification.json](verification.json) and [comparison status](compare.md). Continue visual adjustments after obtaining images in an authorized browser-capable runtime; no new shape changes were made during this evidence recovery.
