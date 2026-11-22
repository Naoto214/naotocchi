import {readScene as readBaseline, sceneQuery, gameURL as baselineURL} from '../v10/shell-model.mjs';

export {sceneQuery};

export function readScene(query) {
  const requested = query.get('arm');
  return {
    ...readBaseline(query),
    arm: ['v9', 'v10'].includes(requested) ? requested : 'v11',
    variant: ['foot','after'].includes(query.get('variant')) ? query.get('variant') : 'full',
  };
}

export function offersSeats(scene) {
  return scene.region === 'forest' && scene.count === 28;
}

export function gameURL(scene, base) {
  const url = baselineURL(scene, base);
  let arm = scene.arm;
  if (arm === 'v11' && ['foot','after'].includes(scene.variant)) arm += '-' + scene.variant;
  if (offersSeats(scene) && scene.seats === 'reference') {
    arm += arm === 'v9' ? '-seats' : '-reference';
  }
  url.pathname = new URL('../game/mobility-v11-compare-' + arm + '.html', base).pathname;
  url.searchParams.set('footLog', '1');
  url.searchParams.set('goalLog', '1');
  return url;
}
