import {readScene as readBase, gameURL as nativeURL, sceneQuery} from '../v10/shell-model.mjs';
export {sceneQuery};

export function readScene(query) {
  const scene = readBase(query);
  const arm = query.get('arm');
  return {...scene, arm: ['v10','v11'].includes(arm) ? arm : 'v12'};
}

export function offersSeats(scene) {
  return scene.region === 'forest' && scene.count === 28;
}

export function gameURL(scene, base) {
  const url = nativeURL(scene, base);
  const suffix = offersSeats(scene) && scene.seats === 'reference' ? '-reference' : '';
  const source = {v10:'v11-compare-v10', v11:'v11-compare-v11-foot', v12:'v12-compare-v12'}[scene.arm];
  url.pathname = new URL('../game/mobility-' + source + suffix + '.html', base).pathname;
  url.searchParams.set('footLog', '1');
  return url;
}
