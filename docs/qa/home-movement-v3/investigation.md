# VERSION 3 investigation

Baseline: PR #555 / e7032c2862320296b88969a6125ddb52af3d228a. Baseline movement tests pass.

## Evidence and decisions

- V2 city crab lower endpoint: screen y535.12349, protected frame bottom545.98352, ink.down8, depth0.98250, extra motion3. The remaining10.86px equals the reserved ink/motion envelope. Polygon is not the active lower stop. Do not remove this reserve or shrink speech lane.
- V2 left endpoint x175.88139 has a one-segment accepted path. Nearest endpoint selection, polygon and contacts jointly constrain it. A route-only change is insufficient when nearest() has already selected a poor endpoint. Compare reachable-component candidates using unchanged predicates.
- Existing A* seeds only12 nearest terrain nodes before testing dynamic visibility. Nearby blocked nodes can hide an accessible connector. Preserve V2 route, add a separate fixed half-cell search with safe connectors and endpoint ranking; never relax collision radii.
- City four-time image review: uniform z0.53→0.51 crosses railings/planting. Reject uniform production expansion. Test a small pavement wedge around x0.34..0.45,z0.518..0.53 separately; keep depth array and foreground unchanged. Adoption requires measured safe benefit.
- All52 images reviewed with unchanged ground/foreground overlays. Other regions retained: home furniture/window, forest roots/slope, river_lake shoreline, countryside field/verge, mountain slope/rocks, snow banks/houses, sea surf/rocks, jungle roots/water, desert dune perspective, deepsea rocks, star_stop platform edge, memory_lake shore/tree roots. Existing safe ground is retained; no uniform expansion.

The 4px fixed-grid search is a bounded resolution improvement, not a proof of every continuous corridor. Temporary occupancy remains a real block; no moving other residents aside or crossing them. Scene changes recompute predicates on each request.
