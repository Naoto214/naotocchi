import {createArtNavigation} from './home-art-navigation.mjs';
export function createRecoveredNavigation(spec,host,stage){
 const nav=createArtNavigation(spec,host,stage),[far,near,min,max]=spec.depth;
 return {...nav,depthScale:p=>Math.max(min,Math.min(max,min+(nav.unproject(p).z-far)/(near-far)*(max-min))),
 initialPoint(index,count){const seat=spec.seats[index%spec.seats.length];if(count<=6||index===0)return nav.project({x:seat[0],z:seat[1]});
 // Stagger the existing safe-seat solver along the actual path, including depth.
 const row=Math.floor(index/spec.seats.length),x=seat[0]+(row%2?-.035:.035),z=seat[1]+(row-2)*.018;return nav.project({x,z});}};
}
