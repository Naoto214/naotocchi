export function readFinishScene(query, readScene) {
  const {region, time, paused} = readScene(query);
  const count = query.get('count');
  return {
    region, time, count:/^(?:[1-9]|1\d|2[0-8])$/.test(count) ? Number(count) : 28,
    paused, ground:query.get('ground') === 'off' ? 'off' : 'on',
  };
}

export function sceneQuery({region, time, count, paused, ground}) {
  return new URLSearchParams({region, time, count, paused: Number(paused), ground});
}

export function finishFrameURL(scene, base) {
  const url = new URL('../game/finish.html', base);
  url.search = sceneQuery(scene);
  return url;
}
