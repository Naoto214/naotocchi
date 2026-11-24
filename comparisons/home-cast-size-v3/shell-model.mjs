export const extras = [0, 5, 10, 15, 20];
export const layouts = ['fixed', 'optimized'];
const adopted = [120, 120, 105];

export function readLimitScene(query, readV2Scene) {
  const params = new URLSearchParams(query);
  if (!params.has('region')) params.set('region', 'forest');
  const {region, time, count, paused} = readV2Scene(params);
  const extra = Number(query.get('extra'));
  const layout = layouts.includes(query.get('layout')) ? query.get('layout') : 'fixed';
  const held = query.get('seatExtra');
  return {
    region, time, count, paused,
    extra: extras.includes(extra) ? extra : 0,
    layout, seatExtra: layout === 'optimized' && extras.some(n => String(n) === held) ? Number(held) : null,
  };
}

export function openingGain(scene) {
  return scene.layout === 'optimized' ? (scene.seatExtra ?? scene.extra) : scene.extra;
}

export function limitFrameURL(scene, base) {
  const url = new URL('../game/limit.html', base);
  url.search = new URLSearchParams({
    region: scene.region, time: scene.time, count: scene.count, paused: Number(scene.paused),
    extra: openingGain(scene), layout: scene.layout, variant: 'B', compareSplit: 0,
  });
  return url;
}

export function needsNewFrame(before, after) {
  return before.region !== after.region || before.count !== after.count ||
    before.layout !== after.layout || (after.layout === 'optimized' && openingGain(before) !== openingGain(after));
}

export function rolePercentages(extra) {
  return adopted.map(value => value * (100 + extra) / 100);
}

export function projectedBody(rect, alphaBox) {
  return [rect.width * (alphaBox[2] - alphaBox[0]) / 128,
    rect.height * (alphaBox[3] - alphaBox[1]) / 128];
}
