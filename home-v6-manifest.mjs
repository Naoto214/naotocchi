// Additive presentation manifest. Canonical geography and v22 remain unchanged.
import {ART_CANDIDATES as previousCandidates, ART_SCENES as previousScenes} from './home-recovered-manifest.mjs';
export const ART_CANDIDATES=[{id:'home-interior-c',region:'home',name:'おうち · 南信州を望む室内C',src:'assets/home-c-20261029/home-interior-c.png',representativeTime:'day',note:'本人採用デザイン。室内の木床で暮らします。'}];
export const ART_SCENES={
 'home-interior-c':{
  candidate:'home-interior-c',region:'home',
  ground:[[.31,.39],[.59,.36],[.67,.38],[.77,.40],[.95,.43],[.96,.96],[.31,.96],[.25,.89],[.08,.83],[.07,.54],[.21,.48],[.25,.43]],
  exclude:[[[0,.27],[.27,.30],[.30,.41],[.22,.48],[.06,.54],[0,.54]],[[.59,.29],[.70,.29],[.71,.36],[.64,.38],[.59,.36]],[[.68,.31],[1,.32],[1,.41],[.77,.39],[.68,.37]]],
  foreground:[[[0,.84],[.10,.87],[.22,.93],[.27,1],[0,1]]],
  seats:[[.55,.74],[.44,.44],[.77,.48],[.35,.62],[.79,.69],[.61,.90]],
  forbidden:[[.45,.25],[.15,.39],[.27,.37],[.64,.34],[.88,.35],[.50,.15]],
  points:[[.50,.46,'observe','window'],[.77,.49,'observe','books'],[.35,.65,'rest','floor']],
  accent:'pollen',depth:[.36,.96,.80,1]
 }
};
export const WORLD_CANDIDATES=[...previousCandidates,...ART_CANDIDATES];
export function selectRecoveredScene(region,candidate){
 const chosen=ART_SCENES[candidate]||previousScenes[candidate];
 if(chosen?.region===region)return chosen;
 return region==='home'?ART_SCENES['home-interior-c']:previousScenes[{forest:'forest-waterfall',river_lake:'water',city:'city'}[region]];
}
