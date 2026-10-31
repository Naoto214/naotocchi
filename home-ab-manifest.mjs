// B is a presentation candidate, not a change to the canonical home or save schema.
import {ART_CANDIDATES as oldCandidates, ART_SCENES as oldScenes, selectRecoveredScene as selectOld} from './home-recovered-manifest.mjs';
export const ART_CANDIDATES=[oldCandidates.find(c=>c.id==='home-interior-a'),{
 id:'home-interior-b',region:'home',name:'おうちB案 · 縁側と暮らしの見える庭',
 src:'assets/home-b-20261029/home-interior-b.png',medium:'新しい比較原画 · 1024 × 1536',
 note:'比較候補・未採用。開いた畳の部屋と広い縁側を眺めながら、庭で暮らします。'
}];
export const WORLD_CANDIDATES=[...oldCandidates,ART_CANDIDATES[1]];
export const ART_SCENES={
 'home-interior-a':oldScenes['home-interior-a'],
 'home-interior-b':{
 candidate:'home-interior-b',region:'home',
 // Source coordinates traced against B. Engawa, foundations and planted edges
 // are scenery; continuous garden soil and flush stepping stones are walkable.
 ground:[[.52,.55],[.66,.53],[.76,.55],[.86,.58],[.90,.63],[.84,.69],[.83,.76],[.77,.84],[.70,.94],[.38,.94],[.31,.86],[.23,.80],[.22,.73],[.25,.65],[.35,.61]],
 exclude:[[[.23,.55],[.53,.51],[.53,.55],[.35,.60],[.25,.63]],[[.83,.67],[.97,.66],[.96,.75],[.86,.75]]],
 foreground:[[[0,.60],[.12,.60],[.20,.70],[.18,.81],[.27,.90],[.31,1],[0,1]],[[.97,.58],[1,.56],[1,1],[.83,1],[.79,.86],[.87,.77],[.93,.67]]],
 seats:[[.55,.76],[.62,.59],[.41,.66],[.72,.71],[.38,.79],[.66,.89]],
 forbidden:[[.24,.37],[.42,.45],[.35,.54],[.15,.72],[.89,.71],[.20,.91],[.91,.90]],
 points:[[.51,.64,'observe','tatami'],[.62,.59,'observe','valley'],[.43,.74,'rest','garden']],
 accent:'pollen',depth:[.53,.94,.80,1]
 }
};
export function selectRecoveredScene(region,candidate){
 return region==='home'&&candidate==='home-interior-b'?ART_SCENES[candidate]:selectOld(region,candidate);
}
