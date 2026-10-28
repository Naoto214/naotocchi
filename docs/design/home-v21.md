# Home v21 — high-rise street corner

User-approved B design; PR426 only, no main merge or Pages release. Start a77fd1e3888acd6a2cd46076bf64a66e6357af28; live main 132e39a7aeccfa5e1706b510f29d649d3aab4518. Existing owner-private Site and preview save namespace retained.

Cause investigation: v20 foreground park-walk ends at z=110..370, producing the visible beige rectangle. Sidewalk, diagonal road and park strips overlap at y=1.2. The GPU has coincident top faces; the Canvas fallback sorts those intersecting triangles by average depth and exhibits diagonal wedges. City terrain relief is zero: this is not a hill or UV displacement. Confirm with overlap regression and isolated surfaces before/after.

Chosen implementation: replace intersecting strips with disjoint rectangular surface parcels and keep logical road/sidewalk segments separate from visual tessellation; reuse official Meguru tower/store/bench/tree geometry with explicit high/mid/low catalogue selection and staggered depths. Preserve camera-ground alignment, use a city-specific camera after visual tuning. Roads stay outside the central safe plaza; leave v20 exit reservation untouched. Use existing ambient route at z1400/1150 and existing clocks, with semantic window flags for day/night.

Alternatives: decoration-only leaves broken road geometry; replacing shared Meguru world unnecessarily risks other regions. Home-only composition plus scoped surface renderer is chosen. Forest/river composition and all dialogue, gameplay, relationships, save/schema and UI remain unchanged.

Validation: disjoint surface area and road exclusion; visible skyline projection and grounding; 4 widths × 1/3/6/28 × day/night; v20 same-fixture comparison; forest/river regression; existing full tests and final-head CI. Cloud Canvas/WebKit evidence is distinct from owner iPhone GPU/performance QA.
