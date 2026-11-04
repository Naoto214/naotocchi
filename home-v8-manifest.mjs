// V8 design choices affect only this independent preview. Sea B2 awaits owner QA.
import {ART_CANDIDATES as v7Candidates,ART_SCENES as v7Scenes,selectRecoveredScene as v7Select} from './home-v7-manifest.mjs';
import {WORLD_CANDIDATES as v6Candidates,ART_SCENES as v6Scenes} from './home-v6-manifest.mjs';
export const ART_CANDIDATES=[
 {...v6Candidates.find(c=>c.region==='river_lake'),name:'みずべ · 現行の清流',kind:'preserved'},
 v7Candidates.find(c=>c.id==='sea'),
 {...v7Candidates.find(c=>c.id==='sea-b'),name:'うみ B · 現在の採用候補',adoption:'design'},
 {id:'sea-b2',region:'sea',name:'うみ B2 · 正面に広がる海',kind:'new',adoption:'comparison',source:'assets/home-v8-20261029/sea-b2.png',src:'assets/home-v8-20261029/runtime/sea-b2.webp'},
 ...v7Candidates.filter(c=>['star_stop','memory_lake'].includes(c.region)).map(c=>({...c,adoption:c.kind==='new'?'design':'preserved'}))
];
export const ART_SCENES={...v7Scenes,
 [ART_CANDIDATES[0].id]:v6Scenes.water,
 'sea-b2':{region:'sea',candidate:'sea-b2',
 ground:[[.045,.665],[.25,.675],[.48,.68],[.71,.67],[.955,.69],[.955,.85],[.86,.87],[.77,.95],[.24,.955],[.13,.88],[.045,.84]],
 exclude:[],foreground:[[[0,.78],[.08,.80],[.17,.85],[.15,.92],[.25,1],[0,1]],[[1,.85],[.88,.875],[.78,.95],[.76,1],[1,1]]],
 seats:[[.53,.81],[.23,.71],[.77,.72],[.30,.84],[.70,.86],[.5,.925]],
 forbidden:[[.5,.45],[.5,.59],[.2,.63],[.82,.63],[.04,.91],[.93,.94]],
 points:[[.47,.705,'observe','open-ocean'],[.53,.86,'rest','dry-sand']],depth:[.665,.955,.78,1],accent:'water'}
};
export const WORLD_CANDIDATES=[...v6Candidates.filter(c=>!ART_CANDIDATES.some(n=>n.id===c.id)),...ART_CANDIDATES];
export {REGIONS} from './home-v6-manifest.mjs';
export function selectRecoveredScene(region,candidate){const s=ART_SCENES[candidate];if(s?.region===region)return s;
 if(region==='sea')return ART_SCENES['sea-b'];if(region==='star_stop')return ART_SCENES['star-new'];if(region==='memory_lake')return ART_SCENES['lake-new'];return v7Select(region,candidate);}
