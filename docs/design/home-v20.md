# Home v20 — inhabiting three distinct worlds

Scope: PR426 only, starting d9586c7e; no merge/Pages. User approved implementation and owner-private preview publication. Formal 2D art, 28 actors, conversation/gameplay/save rules, 42/76px slots remain unchanged.

Cause: shared screen-space small-cast ellipse; z=550 ground alignment; horizontal distant river/road; scenery excluded from foreground. Terrain-aware nearest-seat corrections cannot create a regional composition on their own.

Approach: retain Meguru meshes and terrain sampler, add Home-owned regional habitat seats and path/road geometry. Forest has a winding trail between near/mid trees; water a diagonal channel and near-bank path; city a connected near-side street and pedestrian blocks. Renderer and navigation share the same composition. Source catalogues are cloned. World-position initial seating is projected through navigation; visibility/separation solver remains authoritative. Bounded perspective shrink on DOM owners preserves their foot anchors and attachment alignment. Autonomous/manual actors retain existing movement and event semantics.

Alternatives considered: decoration-only does not address the reported structure; full 3D actors violates formal art requirement. Regional terrain plus projected 2D actors is the selected implementation.

Validation: unchanged baseline tests; new region-seat/perspective/route tests; four widths × three regions × 1/3/6/28; 390/6 comparison and v19 reference. Inspect CI timeout separately from rotation. No tolerance widening. Cloud QA cannot establish device heat/battery performance. Ten remaining regions remain planned pending owner QA.
