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
