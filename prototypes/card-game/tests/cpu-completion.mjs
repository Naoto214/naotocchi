// Explicit fresh CPU trial scenarios. No population runner, fixed400 inputs or supervisor imports.
import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import * as e from '../engine.mjs';import {CpuSession,restoreMatch} from '../cpu-session.mjs';import {chooseCpuAction} from '../cpu-policy.mjs';
const expanded=[...e.DEFAULT_DECK];for(const [i,id] of Object.entries({0:'M-ghost-01',2:'M-hermit_crab-02',5:'M-beetle-04',8:'C-monkey',9:'C-otter',10:'C-parrot',11:'C-panda',13:'P-knitting_spider',16:'W-sea',18:'G-blackjack-21',19:'G-voxel-mine',20:'G-yacht-dice',21:'I-c_dex',22:'I-travel1',24:'G-road-themed',25:'G-fruit-slice',26:'G-snake-classic',27:'G-street-fight',28:'G-dragDecorate-cake',30:'G-push-puzzle',31:'G-p3-space',33:'G-p3-drive',34:'G-doodle-jump',36:'M-ghost-04',38:'M-clownfish-04',39:'G-basketball-3d'}))expanded[i]=id;
const selections=[...e.DEFAULT_DECK];for(const [i,id] of Object.entries({0:'M-mushroom-02',1:'M-mushroom-07',2:'M-man-07',3:'M-antlion-01',4:'M-beetle-01',5:'M-beetle-04',6:'C-box',7:'C-owl',8:'C-sekizou',9:'C-sheep',10:'C-chicken',11:'P-forest_bear',12:'P-robot_neighbor',13:'W-countryside',14:'G-falling-block-puzzle',15:'G-bubble-shooter',16:'G-sky-shooter',17:'G-sudoku-mini',18:'E-naoto',19:'G-puzzle-2048',20:'G-ski-jump',21:'G-real-fishing',22:'G-missile-command',23:'G-space-gunner-3d',24:'I-c_life_charm',25:'I-bond1',26:'G-tank-battle',27:'G-slide-puzzle',28:'E-new-encounter'}))selections[i]=id;
const rows=[];
for(const [deckName,deck] of [['default',e.DEFAULT_DECK],['expanded',expanded],['selections',selections]])for(const seed of [202610191,202610192])for(const humanSeat of ['A','B']){
 let s=new CpuSession({humanSeat,policySeed:312019});s.start(e.createGame(seed,{A:deck,B:deck}));let turns=0,restored=false,maxSaveBytes=0;const kinds={},choices={};
 for(let i=0;i<2000&&!s.finished;i++){
  const v=s.projection;assert.equal(s.automationStop,null,JSON.stringify(s.automationStop));
  if(s.cpuPending){s.stepCpu(v.revision);}else{const o=s.decisionInput(),a=chooseCpuAction(o,{difficulty:'beginner',seed:431019,step:o.revision});s.commit(a.id,o.revision,o.seat);}
  const raw=s.save();maxSaveBytes=Math.max(maxSaveBytes,Buffer.byteLength(raw));
  if(!restored&&i>=35){s=restoreMatch(raw);s.reveal();restored=true;}
  turns++;
 }
 assert.equal(s.automationStop,null);assert.equal(s.finished,true,deckName+seed+humanSeat);const raw=s.engineSave,state=e.restore(raw);assert.equal(state.round,10);assert.deepEqual(e.restore(e.save(state)),state);
 let replay=e.createGame(seed,{A:deck,B:deck});for(const id of state.commands){const a=e.legalActions(replay).find(a=>a.id===id);assert.ok(a);kinds[a.kind]=(kinds[a.kind]??0)+1;if(replay.choice)choices[replay.choice.kind]=(choices[replay.choice.kind]??0)+1;replay=e.act(replay,e.actor(replay),replay.revision,id);}
 rows.push({deckName,seed,humanSeat,policySeed:312019,humanPolicy:'beginner-test-driver:431019',round:state.round,result:state.result,commands:state.revision,cpuDecisions:JSON.parse(s.save()).step,steps:turns,kinds,choices,maxSaveBytes,midgameRestore:restored,saveSha256:createHash('sha256').update(raw).digest('hex')});
 console.log(deckName,seed,humanSeat,state.round,state.result.growth,state.revision,maxSaveBytes);
}
writeFileSync(new URL('../cpu-evidence/completions.json',import.meta.url),JSON.stringify({scenario:'cpu-trial-v1-independent',fixed400Executed:false,matches:rows},null,2)+'\n');
