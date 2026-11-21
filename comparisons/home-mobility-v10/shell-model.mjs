import {regions, times} from '../shell-model.mjs';

export function offersSeats({arm, region, count}) {
  return arm !== 'v8' && region === 'forest' && count === 28;
}
export function readScene(query) {
  const pick = (key, choices, fallback) => choices.some(([id]) => id === query.get(key)) ? query.get(key) : fallback;
  const count = Number(query.get('count'));
  return {
    arm: ['v8','v9'].includes(query.get('arm')) ? query.get('arm') : 'v10',
    seats: query.get('seats') === 'reference' ? 'reference' : 'original',
    seed: query.get('seed') === '937' ? '937' : '214',
    region: pick('region',regions,'forest'), time: pick('time',times,'day'),
    count: Number.isInteger(count) && count >= 1 && count <= 28 ? count : 28,
    paused: query.get('paused') === '1', diagnostics: query.get('diagnostics') === '1',
  };
}
export function sceneQuery(scene) {
  return new URLSearchParams({...scene, paused:Number(scene.paused), diagnostics:Number(scene.diagnostics)});
}
export function gameURL(scene, base) {
  let variant = scene.arm;
  if (offersSeats(scene) && scene.seats === 'reference') {
    variant += scene.arm === 'v10' ? '-reference' : '-seats';
  }
  const url = new URL('../game/mobility-v10-compare-' + variant + '.html', base);
  url.search = new URLSearchParams({
    region:scene.region, time:scene.time, count:scene.count, trialSeed:scene.seed,
    paused:1, clock:0, ground:'on', paired:1, waitForPainting:1, variant:'B',
    compareSplit:0, season:'autumn', weather:'sunny', diagnostics:Number(scene.diagnostics),
  });
  return url;
}
