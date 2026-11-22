import {readScene as readBase, gameURL as makeURL, sceneQuery} from '../v10/shell-model.mjs';
export {sceneQuery};
const sources = {a:'v13-owner-a', b:'v13-owner-b', c:'v13-owner-c', d:'v13-owner-d',
  'd-curve':'v13-owner-d-curve', v11:'v11-compare-v11-foot', v12:'v12-compare-v12'};

export function readScene(query) {
  return {...readBase(query), arm:Object.hasOwn(sources,query.get('arm')) ? query.get('arm') : 'a'};
}
export function offersSeats(scene) {
  return scene.region === 'forest' && scene.count === 28;
}
export function gameURL(scene,base) {
  const url=makeURL(scene,base);
  const suffix=offersSeats(scene)&&scene.seats==='reference' ? '-reference' : '';
  url.pathname=new URL('../game/mobility-'+sources[scene.arm]+suffix+'.html',base).pathname;
  url.searchParams.set('footLog','1');
  return url;
}
