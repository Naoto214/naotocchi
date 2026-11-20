export function readDragScene(query, readScene) {
  const {region, time, paused} = readScene(query);
  const count = query.get('count');
  return {
    arm:query.get('arm') === 'v5' ? 'v5' : 'v6', region, time, paused,
    count:/^(?:[1-9]|1\d|2[0-8])$/.test(count) ? Number(count) : 28,
  };
}

export function sceneQuery({arm, region, time, count, paused}) {
  return new URLSearchParams({arm, region, time, count, paused:Number(paused)});
}

export function gameURL({arm, region, time, count}, base) {
  const url = new URL(arm === 'v5' ? '../game/drag-v5.html' : '../game/drag-v6.html', base);
  // Both complete the native fitting/painting sequence with no elapsed walk or
  // lighting time. The shell applies the requested play state after it settles.
  url.search = new URLSearchParams({region,time,count,paused:1,clock:0,ground:'on',paired:1,
    variant:'B',compareSplit:0,season:'autumn',weather:'sunny'});
  return url;
}
