const variants = ['current', 'A', 'B', 'C'];

export function readPopulationScene(query, readV2Scene) {
  const {region, time, paused} = readV2Scene(query);
  const number = query.get('count');
  const count = /^(?:[1-9]|1\d|2[0-8])$/.test(number) ? Number(number) : 28;
  const variant = query.get('variant') ?? query.get('policy');
  return {
    region, time, count, paused, variant:variants.includes(variant) ? variant : 'B',
    curve:query.get('curve') === 'step' ? 'step' : 'linear',
    layout:query.get('layout') === 'optimized' ? 'optimized' : 'fixed',
  };
}

export function sceneQuery(scene) {
  return new URLSearchParams({...scene, paused:Number(scene.paused)});
}

export function populationFrameURL(scene, base) {
  const url = new URL('../game/population.html', base);
  url.search = sceneQuery(scene);
  url.searchParams.set('policy', scene.variant);
  url.searchParams.set('variant', 'B');
  url.searchParams.set('compareSplit', '0');
  return url;
}

export function needsNewFrame(before, after) {
  return before.region !== after.region || before.count !== after.count || before.layout !== after.layout ||
    (after.layout === 'optimized' && (before.variant !== after.variant || before.curve !== after.curve));
}

// Return the half-open bounds on the same 128-unit grid as the game's cast catalog.
export function alphaBounds(pixels, width, height) {
  let left = width, right = 0, top = height, bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!pixels[(y * width + x) * 4 + 3]) continue;
      left = Math.min(left, x);
      right = Math.max(right, x + 1);
      top = Math.min(top, y);
      bottom = y + 1;
    }
  }
  return right ? [128 * left / width, 128 * top / height, 128 * right / width, 128 * bottom / height] : null;
}
