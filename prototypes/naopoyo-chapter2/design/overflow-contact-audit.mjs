import fs from 'node:fs';
import {actor,board,directions,screenshotBoard,mirror,trace,environment} from '../tests/overflow-contact-fixtures.mjs';
import {stages} from '../stages.mjs';
import {ExampleReplay} from '../example-replay.mjs';
import {mass} from '../../naopoyo-v2/engine.mjs';
const traces=[];
function record(label,b,id,dx,dy){
 const t=trace(b,id,dx,dy),events=t.result.events||[];
 traces.push({label,initialSettlement:t.initialSettlement,selected:t.selected,target:t.target,direction:t.direction,legal:t.result.ok,reason:t.result.reason||null,
  before:t.before.actors,after:t.after.actors,movesBefore:t.before.moves,movesAfter:t.after.moves,
  massBefore:mass(t.before),massAfter:mass(t.after),valid:t.valid,
  events,merge:events.filter(e=>e.type==='merge'),overflow:events.filter(e=>e.type==='merge'&&e.overflow).map(e=>({id:e.id,level:e.level,remainder:e.overflow})),
  swap:events.filter(e=>e.type==='swap'),gravity:events.filter(e=>e.type==='fall'),split:events.filter(e=>e.type==='split')});
}
for(const reflected of [false,true])for(const id of ['four','eight'])record(`screenshot/${reflected?'mirror':'original'}/${id}`,reflected?mirror(screenshotBoard()):screenshotBoard(),id,(id==='four'?1:-1)*(reflected?-1:1),0);
for(const name of ['floor','rock','gate','spike','exit','neighbor'])for(const id of ['four','eight'])record(`${name}/${id}`,environment(name),id,id==='four'?1:-1,0);
for(const [dx,dy] of directions)for(const [a,b,species] of [[4,8,'dog'],[8,4,'dog'],[6,6,'dog'],[8,8,'dog'],[4,8,'fish']])record(`no-gravity/${a}-${b}-${species}/${dx},${dy}`,board([actor('a',3,3,a),actor('b',3+dx,3+dy,b,species)]),'a',dx,dy);
for(const [dx,dy] of directions)for(const [a,b] of [[4,8],[8,4]]){
 const stage=board([actor('a',3,4,a),actor('b',3+dx,4+dy,b)],{gravity:true});
 stage.walls=stage.actors.map(a=>[a.x,a.y+1]).filter(([x,y])=>!stage.actors.some(a=>a.x===x&&a.y===y));
 record(`gravity/${a}-${b}/${dx},${dy}`,stage,'a',dx,dy);
}
const examples=stages.map(stage=>{
 const example=JSON.parse(fs.readFileSync(new URL(`../examples/${stage.number}.json`,import.meta.url))),r=new ExampleReplay(stage,example.path);
 for(let i=0;i<example.path.length;i++)r.next();
 return {stage:stage.number,moves:r.index,rescued:r.session.state.rescued,remaining:r.session.state.actors.length};
});
const output={scope:'Current rules only; no physics or shipped assets changed',screenshot:{coordinates:'zero based',source:'IMG_7149.png',ids:'synthetic labels; user save and exact move history unavailable',board:screenshotBoard()},traces,examples};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({traces:traces.length,legal:traces.filter(t=>t.legal).length,examples,directionalGravity:traces.filter(t=>t.label.startsWith('gravity')).map(t=>({label:t.label,legal:t.legal,reason:t.reason,events:t.events.map(e=>e.type)}))},null,2));
