(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./policy.js'));
  else root.HomePopulationSeats = factory(root.HomePopulationPolicy);
})(typeof window === 'undefined' ? null : window, policy => {
  // Artwork-space foot hints for individual companions. The native model
  // keeps the authored lead and partner, the terrain, contacts and exit.
  // Each entry is [actor index, x, z]. Absence retains the V2 opening.
  const plans = /* TABLE */{};

  function openingFor(width, height, region, count) {
    if (width <= 320 || height <= width || count < 19 || count > 28) return null;
    const profiles = plans[region]?.[count];
    if (!profiles) return null;
    // Each key names a measured phone profile. Only borrow an opening across
    // nearby dimensions; the projection and safety checks still use this phone.
    let nearest = null;
    let distance = Infinity;
    for (const key of Object.keys(profiles)) {
      const [w,h] = key.split('x').map(Number);
      const delta = Math.abs(width-w) + Math.abs(height/width-h/w)*48;
      if (Math.abs(width-w) <= 25 && Math.abs(height/width-h/w) <= .27 && delta < distance) {
        nearest = profiles[key];
        distance = delta;
      }
    }
    return nearest;
  }

  function withOpeningSeats(nav, spec, width, height, search = globalThis.location?.search || '') {
    const query = new URLSearchParams(search);
    const selected = policy.evaluate({policy:query.get('policy') ?? query.get('variant'),
      curve:query.get('curve'), count:query.get('count'), width});
    if (query.get('layout') !== 'optimized' || !selected.extra) return nav;
    const hints = openingFor(width,height,spec.region,selected.count);
    if (!hints?.length) return nav;
    const feet = new Map(hints.map(([index,x,z]) => [index,{x,z}]));
    return {...nav, initialPoint(index,count) {
      const foot = count === selected.count && feet.get(index);
      if (foot) {
        const candidate = nav.project(foot);
        if (nav.valid(candidate)) return candidate;
      }
      return nav.initialPoint(index,count);
    }};
  }

  return Object.freeze({openingFor,withOpeningSeats});
});
