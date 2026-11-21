import {regions, times} from '../shell-model.mjs';

export function readScene(query) {
  const choose = (key, choices, fallback) => choices.some(([id]) => id === query.get(key)) ? query.get(key) : fallback;
  const count = query.get('count');
  return {
    arm: ['v7','v8'].includes(query.get('arm')) ? query.get('arm') : 'v9',
    seats: query.get('seats') === 'trial' ? 'trial' : 'original',
    region: choose('region', regions, 'forest'), time: choose('time', times, 'day'),
    count: /^(?:[1-9]|1\d|2[0-8])$/.test(count) ? Number(count) : 28,
    paused: query.get('paused') === '1', diagnostics: query.get('diagnostics') === '1',
  };
}

export function sceneQuery({arm, seats, region, time, count, paused, diagnostics}) {
  return new URLSearchParams({arm, seats, region, time, count, paused: Number(paused), diagnostics: Number(diagnostics)});
}

export function gameURL({arm, seats, region, time, count, diagnostics}, base) {
  const entry = arm === 'v9' ? (seats === 'trial' ? 'v9-seats' : 'v9') : 'v9-replay-' + arm;
  const url = new URL('../game/mobility-' + entry + '.html', base);
  url.search = new URLSearchParams({region, time, count, paused: 1, clock: 0, ground: 'on', paired: 1,
    waitForPainting: 1, variant: 'B', compareSplit: 0, season: 'autumn', weather: 'sunny', diagnostics: Number(diagnostics)});
  return url;
}
