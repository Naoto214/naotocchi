// Applies only to additional navigation in the background's actual cover
// projection. Legacy navigation, scene ground/exclude/foreground, individual
// ink bounds, UI clearance, and collision checks remain independently required.
// Image evidence: docs/qa/home-movement-v5/terrain-review.md (all 52 dayparts).
// minZ = 0 adds no extra restriction to the scene's own ground polygon.
export const VISIBLE_GROUND_RULES = Object.freeze({
  home: Object.freeze({
    enabled: true,
    minZ: 0,
    reason: 'Use the existing wooden-floor polygon; retain furniture exclusions.',
  }),
  forest: Object.freeze({
    enabled: true,
    minZ: 0.55,
    reason: 'Add only the clear foreground grass/path; the upper spur crosses distant roots and vegetation.',
  }),
  river_lake: Object.freeze({
    enabled: true,
    minZ: 0,
    reason: 'Retain the irregular near-bank polygon and its diagonal waterline.',
  }),
  city: Object.freeze({
    enabled: true,
    minZ: 0,
    reason: 'Use the existing paved foreground; retain shop, planter, and railing edges.',
  }),
  countryside: Object.freeze({
    enabled: true,
    minZ: 0,
    reason: 'Retain the widening farm-road shape outside fields and irrigation channels.',
  }),
  mountain: Object.freeze({
    enabled: true,
    minZ: 0,
    reason: 'Use the existing foreground trail and retain boulder, vegetation, and cliff exclusions.',
  }),
  snow: Object.freeze({
    enabled: true,
    minZ: 0,
    reason: 'Use the central snowy road; keep snowbanks, trees, and houses outside it.',
  }),
  sea: Object.freeze({
    enabled: true,
    minZ: 0,
    reason: 'Keep the existing sand polygon below the surf and between the foreground rocks.',
  }),
  jungle: Object.freeze({
    enabled: true,
    minZ: 0.58,
    reason: 'Add only the clear foreground soil; the upper spur reaches water and an ambiguous wet bank.',
  }),
  desert: Object.freeze({
    enabled: true,
    minZ: 0,
    reason: 'Use the foreground sand polygon without extending into distant dune ridges.',
  }),
  deepsea: Object.freeze({
    enabled: true,
    minZ: 0,
    reason: 'Use the existing sandy seabed corridor and retain the flanking rock exclusions.',
  }),
  star_stop: Object.freeze({
    enabled: true,
    minZ: 0,
    reason: 'Retain the stone-platform footprint, edge, broken masonry, and foreground plants.',
  }),
  memory_lake: Object.freeze({
    enabled: true,
    minZ: 0,
    reason: 'Use the near-bank clearing while keeping lake water, roots, and foreground stones outside it.',
  }),
});
