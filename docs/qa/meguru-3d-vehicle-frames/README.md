# Vehicle window frame candidate

Base: 042177906f165c991cce3f2b936090c2261661c6 (dry bank color candidate). World PR374 stays Draft; World and Human QA remain incomplete.

The saved car/tractor gallery shows an unframed glass box between body and roof. Four body-colored corner posts now wrap that existing glass. They fit under the current roof, touch body and roof, share structural grounding, and use existing solid wbox geometry/material. Existing body, glass, roof, wheels, height and footprint remain unchanged. No object-ID rules or runtime work.

- VQ-23 observed RED for missing posts, then GREEN across two semantic vehicle kinds and four rotations. Existing GA-5 props gate also passes; cache gate2PASS. Raw logs are alongside this file.
- Fresh13region snapshots: 2D, canonical3D, collision hashes and object counts unchanged. Rendered descriptors differ only for city(two vehicles/+8parts/+80triangles) and countryside(three/+12parts/+120triangles). These are geometric counts, not frame-time measurements.
- Independent review found no Critical/Important/Minor issues. No rendered comparison reviewed yet.
- Full final-source regression and browser comparison pending. The bank-only npm run in the other checkout cannot certify this vehicle code. CI before-ref is pinned to0421779 for same-camera comparisons.

Preserve main/Pages/Character/Expression/2D/save/collision/season and existing architecture. Next: verify bank and vehicle CI artifacts, inspect matched images, then address bridge approach composition. Do not equate a candidate save or automated PASS with Human QA approval.
