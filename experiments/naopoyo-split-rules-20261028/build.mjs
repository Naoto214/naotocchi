// Reproducible experiment compiler. Never imports or writes the live engine.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=p=>fs.readFileSync(path.join(root,'baseline',p),'utf8');
const provenance=JSON.parse(fs.readFileSync(path.join(root,'provenance.json')));
for(const [p,hash] of Object.entries(provenance.sha256)){
 if(createHash('sha256').update(read(p)).digest('hex')!==hash)throw Error('baseline changed: '+p);
}
function replace(s,from,to){if(s.split(from).length!==2)throw Error('patch anchor mismatch: '+from);return s.replace(from,to);}
for(const mode of ['A','B','C','B-once']){
 const dir=path.join(root,'generated',mode);fs.mkdirSync(dir,{recursive:true});
 let source=read('prototypes/naopoyo-v2/engine.mjs');
 source=replace(source,"'../naopoyo-rescue/conditions.mjs'","'../../baseline/prototypes/naopoyo-rescue/conditions.mjs'");
 if(mode.startsWith('B'))source=replace(source,"if(fall&&ctx.families.has(a.id)&&ctx.families.get(a.id)===ctx.families.get(target.id))return reject('split-family');","// Experiment B: same-family contacts use normal merging.");
 if(mode==='B-once'){
  source=replace(source,"if(!supportedGravity(s)){if(ctx.fired.has(key))return;ctx.fired.add(key);}","if(ctx.fired.has(key))return;");
  source=replace(source,' if(!k)return;',' if(!k)return;ctx.fired.add(key);');
 }
 if(mode==='C'){
  source=replace(source,"const directions=[4,-2,2,-3,3,-1,1,0].map(offset=>compass[(f+offset+8)%8]);","const directions=[[-1,0],[1,0],[-1,1],[1,1],[-1,-1],[1,-1],[0,1],[0,-1]];");
  source=replace(source,' return out;',' return out.sort((a,b)=>Number(a.x===x&&a.y<y)-Number(b.x===x&&b.y<y)||a.distance-b.distance||Number(a.x===x)-Number(b.x===x));');
 }
 // Opt-in diagnostics observe real decisions; no changes to event arrays or board.
 source+='\nfunction observe(ctx,s,kind,detail={}){if(ctx.policy?.trace)ctx.policy.trace({kind,...detail,activeId:ctx.activeId,families:[...ctx.families],actors:clone(s.actors),events:clone(ctx.events)});}\n';
 source=replace(source,"const x=a.x+dx,y=a.y+dy,reject=reason=>({ok:false,reason});","const x=a.x+dx,y=a.y+dy,reject=reason=>{observe(ctx,s,'reject',{id:a.id,from:{x:a.x,y:a.y},to:{x,y},fall,reason});return {ok:false,reason}};\n observe(ctx,s,'contact',{id:a.id,from:{x:a.x,y:a.y},to:{x,y},fall,target:clone(at(s.actors,x,y))});");
 source=replace(source,' result.split=k;result.splitBlocked='," observe(ctx,s,'split-plan',{id:a.id,levelBefore:a.level,spike:clone(spike),direction:[dx,dy],positions:clone(positions),count:k});\n result.split=k;result.splitBlocked=");
 source=replace(source,"ctx.events.push({type:'split',id:a.id,x:a.x,y:a.y,count:k,...(supportedGravity(s)?{children:clone(result.children)}:{})});","ctx.events.push({type:'split',id:a.id,x:a.x,y:a.y,count:k,...(supportedGravity(s)?{children:clone(result.children)}:{})});\n observe(ctx,s,'split-born',{id:a.id,family});");
 source=replace(source,"if(seen.has(signature))throw new Error('gravity-cycle');seen.add(signature);","if(seen.has(signature)){observe(ctx,s,'cycle',{signature});throw new Error('gravity-cycle')}seen.add(signature);");
 if(mode==='B-once')source=replace(source,"if(seen.has(signature)){observe(ctx,s,'cycle',{signature});throw new Error('gravity-cycle')}seen.add(signature);","const cycleKey=signature+'#fired:'+JSON.stringify([...ctx.fired].sort());\n   if(seen.has(cycleKey)){observe(ctx,s,'cycle',{signature:cycleKey});throw new Error('gravity-cycle')}seen.add(cycleKey);");
 source=replace(source," return ctx.events.slice(start);"," observe(ctx,s,'stable');\n return ctx.events.slice(start);");
 fs.writeFileSync(path.join(dir,'engine.mjs'),source);
 fs.writeFileSync(path.join(dir,'search.mjs'),read('prototypes/naopoyo-chapter2/search.mjs').replace("'../naopoyo-v2/engine.mjs'","'./engine.mjs'"));
 fs.writeFileSync(path.join(dir,'preview.mjs'),read('prototypes/naopoyo-chapter2/split-preview.mjs').replace("'../naopoyo-v2/engine.mjs'","'./engine.mjs'").replace("'../naopoyo-v2/input.mjs'","'../../baseline/prototypes/naopoyo-v2/input.mjs'"));
}
console.log('Built A/B/C and diagnostic B-once; all pinned SHA256 hashes verified.');
