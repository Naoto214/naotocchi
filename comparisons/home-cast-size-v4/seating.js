(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./policy.js'));
  else root.HomePopulationSeats = factory(root.HomePopulationPolicy);
})(typeof window === 'undefined' ? null : window, policy => {
  // Artwork-space foot hints for individual companions. The native model
  // keeps the authored lead and partner, the terrain, contacts and exit.
  // Each entry is [actor index, x, z]. Absence retains the V2 opening.
  const plans = {
    home: {
      19: {
        "375x760": [[4,0.86172,0.62586],[5,0.42908,0.82801],[12,0.84586,0.87466]],
      },
      20: {
        "375x760": [[5,0.80326,0.87466],[6,0.28622,0.81144],[19,0.24344,0.47358]],
      },
      22: {
        "375x760": [[6,0.37849,0.81496],[9,0.17196,0.58682],[13,0.49573,0.5358]],
      },
      24: {
        "375x760": [[2,0.94496,0.44975],[6,0.56578,0.53505],[11,0.42922,0.81803]],
      },
      26: {
        "375x760": [[13,0.59434,0.46623],[14,0.89308,0.49915],[24,0.40889,0.80831]],
      },
      28: {
        "348x640": [[6,0.48784,0.84066],[9,0.17578,0.77472],[19,0.58479,0.37121]],
        "350x649": [[6,0.38855,0.79823],[16,0.91911,0.73468],[21,0.17229,0.63687]],
        "360x693": [[9,0.21902,0.53612],[18,0.33577,0.79653],[24,0.67015,0.57673]],
        "375x760": [[4,0.816,0.60729],[5,0.54462,0.84055],[9,0.33504,0.5083]],
        "390x792": [[4,0.75991,0.62067],[6,0.49737,0.82867],[21,0.18553,0.69459]],
        "430x880": [[9,0.23859,0.59683],[11,0.51945,0.91429],[18,0.49861,0.81531]],
      },
    },
    river_lake: {
      19: {
        "375x760": [[6,0.58792,0.86242],[12,0.68204,0.67665]],
      },
      21: {
        "375x760": [[3,0.66065,0.87387],[6,0.44809,0.67051],[12,0.62975,0.64062]],
      },
      22: {
        "375x760": [[5,0.9041,0.84208],[11,0.60128,0.9095],[20,0.48467,0.83613]],
      },
      23: {
        "375x760": [[6,0.48127,0.90428],[12,0.62461,0.86577],[22,0.30154,0.77868]],
      },
      24: {
        "348x640": [[6,0.52441,0.57162],[12,0.69761,0.62393],[21,0.91579,0.89136]],
      },
      25: {
        "375x760": [[10,0.46199,0.92153],[11,0.69523,0.86331],[15,0.92562,0.76555]],
      },
      27: {
        "375x760": [[4,0.25441,0.80908],[12,0.86909,0.69384],[21,0.74978,0.63683]],
      },
      28: {
        "350x649": [[6,0.50954,0.8698],[19,0.07575,0.49967],[20,0.27237,0.68892]],
      },
    },
    forest: {
      19: {
        "375x760": [[4,0.39669,0.76718],[5,0.63745,0.89157],[15,0.42507,0.82858]],
      },
      24: {
        "360x693": [[5,0.70951,0.86554],[21,0.38276,0.7939]],
      },
      28: {
        "360x693": [[2,0.46362,0.53276],[14,0.47067,0.52214],[27,0.46216,0.53734]],
      },
    },
  };

  function openingFor(width, height, region, count) {
    if (width <= 320 || height <= width || count < 19 || count > 28) return null;
    const profiles = plans[region]?.[count];
    if (!profiles) return null;
    // Keep the authored opening on unmeasured screen sizes and rotations.
    return profiles[width + 'x' + height] || null;
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
