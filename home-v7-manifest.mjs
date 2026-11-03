// V7 is an additive comparison. Originals remain authoritative, not newly generated.
import {WORLD_CANDIDATES as v6Candidates,ART_SCENES as v6Scenes,selectRecoveredScene as v6Select} from './home-v6-manifest.mjs';
export const ART_CANDIDATES=[
 {...v6Candidates.find(c=>c.id==='sea'),name:'うみ A · version 6',kind:'existing'},
 {id:'sea-b',region:'sea',name:'うみ B · 透明な浅瀬',kind:'new'},
 {id:'star_stop-original',region:'star_stop',name:'星空 · 元々の正式背景',kind:'original',src:'assets/world/star_stop-v1.webp'},
 {id:'star-new',region:'star_stop',name:'星空 · 新しい高品質背景',kind:'new'},
 {id:'memory_lake-original',region:'memory_lake',name:'記憶の湖 · 元々の正式背景',kind:'original',src:'assets/world/memory_lake-v1.webp'},
 {id:'lake-new',region:'memory_lake',name:'記憶の湖 · 新しい高品質背景',kind:'new'}
].map(c=>c.kind==='new'?{...c,source:'assets/home-v7-20261029/'+c.id+'.png',src:'assets/home-v7-20261029/runtime/'+c.id+'.webp'}:c);
export const ART_SCENES={sea:v6Scenes.sea,
 'sea-b':{region:'sea',ground:[[.08,.46],[.23,.46],[.32,.50],[.34,.58],[.43,.65],[.60,.73],[.77,.81],[.89,.87],[.84,.92],[.57,.91],[.35,.85],[.18,.77],[.07,.70]],exclude:[],foreground:[[[0,.70],[.08,.72],[.16,.79],[.26,.86],[.48,.95],[.72,1],[0,1]],[[.95,.90],[1,.90],[1,1],[.87,1]]],seats:[[.36,.72],[.16,.49],[.22,.59],[.24,.70],[.51,.77],[.70,.85]],forbidden:[[.55,.50],[.75,.70],[.90,.80],[.10,.90]],points:[[.27,.53,'observe','fish'],[.34,.72,'rest','dry-sand']],depth:[.46,.92,.76,1],accent:'water'},
 'star_stop-original':{region:'star_stop',ground:[[.17,.44],[.33,.42],[.66,.42],[.85,.45],[.93,.51],[.91,.65],[.77,.70],[.66,.76],[.39,.76],[.22,.70],[.10,.62],[.07,.51]],exclude:[],foreground:[[[0,.57],[.12,.62],[.22,.71],[.32,.75],[.24,.80],[0,.84]],[[.99,.57],[.91,.62],[.78,.69],[.72,.78],[1,.87]]],seats:[[.51,.65],[.33,.47],[.69,.48],[.25,.57],[.75,.59],[.52,.73]],forbidden:[[.50,.35],[.07,.73],[.9,.8]],points:[[.49,.46,'observe','nebula'],[.48,.64,'rest','stone']],depth:[.42,.78,.76,1],accent:'glow'},
 'star-new':{region:'star_stop',ground:[[.09,.48],[.92,.48],[.96,.54],[.94,.72],[.86,.85],[.75,.92],[.25,.92],[.12,.83],[.06,.72]],exclude:[],foreground:[[[0,.69],[.11,.72],[.18,.80],[.17,.91],[0,1]],[[1,.70],[.92,.74],[.88,.85],[.76,.96],[1,1]]],seats:[[.55,.74],[.33,.51],[.72,.54],[.25,.66],[.76,.76],[.51,.88]],forbidden:[[.5,.40],[.04,.85],[.97,.89]],points:[[.54,.50,'observe','islands'],[.5,.73,'rest','plaza']],depth:[.48,.92,.76,1],accent:'glow'},
 'memory_lake-original':{region:'memory_lake',ground:[[.21,.57],[.49,.57],[.72,.59],[.85,.63],[.88,.70],[.73,.77],[.58,.82],[.33,.80],[.19,.75],[.12,.67]],exclude:[],foreground:[[[0,.69],[.14,.72],[.23,.79],[.32,.84],[.29,1],[0,1]],[[1,.72],[.84,.76],[.73,.82],[.58,.89],[1,1]]],seats:[[.50,.70],[.32,.60],[.67,.62],[.25,.68],[.72,.71],[.48,.78]],forbidden:[[.5,.5],[.1,.79],[.88,.85]],points:[[.47,.59,'observe','reflection'],[.49,.71,'rest','shore']],depth:[.57,.82,.78,1],accent:'water'},
 'lake-new':{region:'memory_lake',ground:[[.16,.49],[.38,.50],[.61,.52],[.81,.54],[.94,.59],[.94,.94],[.45,.95],[.34,.87],[.25,.78],[.08,.73],[.06,.57]],exclude:[],foreground:[[[0,.74],[.13,.77],[.25,.84],[.32,.91],[.44,1],[0,1]],[[1,.94],[1,1],[.8,1]]],seats:[[.53,.73],[.33,.54],[.69,.59],[.25,.67],[.8,.78],[.61,.90]],forbidden:[[.6,.45],[.9,.49],[.15,.9]],points:[[.54,.55,'observe','mist'],[.51,.72,'rest','stone-shore']],depth:[.49,.95,.78,1],accent:'water'}
};
for(const [id,s]of Object.entries(ART_SCENES))if(id!=='sea')s.candidate=id;
export const WORLD_CANDIDATES=[...v6Candidates.filter(c=>!ART_CANDIDATES.some(n=>n.id===c.id)),...ART_CANDIDATES];
export {REGIONS} from './home-v6-manifest.mjs';
export function selectRecoveredScene(region,candidate){const s=ART_SCENES[candidate];if(s?.region===region)return s;if(region==='star_stop'||region==='memory_lake')return ART_SCENES[region+'-original'];return v6Select(region,candidate);}
