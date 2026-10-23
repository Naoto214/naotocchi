// Read-only diagnostic adapter: never writes a production stage or save.
import {execFileSync} from 'node:child_process';import fs from 'node:fs';import {createState,move,complete,validState} from '../naopoyo-v2/engine.mjs';import {move as oldMove,createState as oldCreate,release,complete as oldComplete} from '../naopoyo-rescue/engine.mjs';
const main='acd4ece17c293c9365a41216b0ac4492174ffcf5',expansion='88ab41e1fd1fdd8f4b1b33528e157b7e96fba444';
const read=(ref,file)=>execFileSync('git',['show',`${ref}:prototypes/naopoyo-rescue/${file}`],{encoding:'utf8'});
const module=code=>import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const first=(await module(read(main,'stages.mjs'))).stages;
const more=(await module(read(expansion,'advanced-stages.mjs'))).advancedStages;
const oldSolutions={...JSON.parse(read(main,'solutions.json')),...JSON.parse(read(expansion,'solutions.json'))};
const results=[];
for(const old of [...first,...more]){
 const witness=oldSolutions[old.id], legacy=oldCreate(old);let legacyPass=true;
 for(const drag of witness){for(const [x,y] of drag.path){const a=legacy.actors.find(a=>a.id===drag.id);if(!a||!oldMove(legacy,a.id,x-a.x,y-a.y)){legacyPass=false;break}}if(!release(legacy))legacyPass=false;if(!legacyPass)break}
 const stage={...structuredClone(old),gravity:!!old.gravity,spikes:old.spikes.map(([x,y])=>({x,y,power:1}))};const s=createState(stage);let issue=null,steps=0;
 outer:for(const drag of witness){for(const [x,y] of drag.path){const a=s.actors.find(a=>a.id===drag.id);if(!a){issue={reason:'actor no longer exists',id:drag.id,steps};break outer}const dx=x-a.x,dy=y-a.y,r=move(s,a.id,dx,dy);steps++;if(!r.ok){issue={reason:r.reason,id:drag.id,x,y,steps};break outer}if(!validState(stage,s))throw Error('adapter invalid '+old.id)}}
 results.push({id:old.id,title:old.title,source:old.id<='12'?main:expansion,dimensions:[old.w,old.h],legacyWitnessPassed:legacyPass&&oldComplete(legacy),v2SameWitnessClears:!issue&&complete(s),issue,remaining:s.actors.map(a=>({id:a.id,n:a.level,x:a.x,y:a.y})),v2Solvable:!issue&&complete(s)?'witness-proven':'unproven-needs-redesign-or-new-witness',mechanicalAdapterOnly:true,shortcuts:'not exhaustively evaluated',resize:'per-stage redesign; never pad automatically'});
}
fs.writeFileSync(process.argv[2],JSON.stringify({main,expansion,method:'Read-only single-spike shape adapter and original absolute drag witness. v2 immediate gravity vs legacy release is intentionally preserved. Witness failure is NOT proof of unsolvability.',results},null,2));console.log(results.map(r=>`${r.id} old:${r.legacyWitnessPassed} v2:${r.v2SameWitnessClears} ${r.issue?.reason||''}`).join('\n'));
