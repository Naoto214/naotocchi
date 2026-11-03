// Owner approved B2 design. Water G remains an explicit comparison, never the default.
import {WORLD_CANDIDATES as oldCandidates,ART_SCENES as v8Scenes,selectRecoveredScene as oldSelect} from './home-v8-manifest.mjs';
import {ART_SCENES as v6Scenes} from './home-v6-manifest.mjs';
export {REGIONS} from './home-v6-manifest.mjs';
const water={...oldCandidates.find(c=>c.id==='water'),name:'水辺A · 青い清流',adoption:'preserved'};
const green={...water,id:'water-g',name:'水辺G · 翡翠色の清流',kind:'new',adoption:'comparison',source:'assets/home-v9-20261030/water-g.png',src:'assets/home-v9-20261030/runtime/water-g.webp'};
const sea={...oldCandidates.find(c=>c.id==='sea-b2'),name:'海B2 · 正面に広がる海',adoption:'design'};
export const ART_CANDIDATES=[water,green,sea];
export const WORLD_CANDIDATES=[...oldCandidates.filter(c=>!ART_CANDIDATES.some(a=>a.id===c.id)).map(c=>c.id==='sea-b'?{...c,adoption:'preserved',name:'海B · 保存済み比較候補'}:c),...ART_CANDIDATES];
export const ART_SCENES={...v6Scenes,...v8Scenes,'water-g':{...v6Scenes.water,candidate:'water-g'}};
export function selectRecoveredScene(region,candidate){const explicit=ART_SCENES[candidate];if(explicit?.region===region)return explicit;if(region==='sea')return ART_SCENES['sea-b2'];return oldSelect(region,candidate);}
