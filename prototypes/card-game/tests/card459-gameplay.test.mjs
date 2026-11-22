import {beforeMirrorTitle} from './kanji-history-helper.mjs';
// Approved behavior: PR498 481-time-reversal-cards.md and lib/smoke-v4.mjs (U12).
// CARD459_ENGINE_DIR allows the identical scenarios to run against the independently built PR498 I7 reference.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url));
const engineDir=process.env.CARD459_ENGINE_DIR??path.resolve(here,'..');
const e=await import(pathToFileURL(path.join(engineDir,'engine.mjs')));
const ids=['W-time-ix','W-time-x','W-time-xi','W-time-xii'];
function fixture(round=8,turn='A'){
 const s=e.createGame(41);Object.assign(s,{round,turn,priority:turn,phase:'normal',window:'normal',choice:null,pending:[],chain:[],passes:0});
 for(const a of ['A','B']){const p=s.players[a];p.time=10;p.growth=40;p.deck.push(...p.hand.splice(0));}return s;
}
function take(s,a,id){const p=s.players[a],uid=p.deck.shift();assert.ok(uid);s.cards[uid].cardId=id;return uid;}
function hand(s,a,id){const uid=take(s,a,id);s.players[a].hand.push(uid);return uid;}
function field(s,a,id,slot='main'){const uid=take(s,a,id);s.cards[uid].generation++;if(slot==='companions')s.players[a].board.companions.push(uid);else s.players[a].board[slot]=uid;if(slot==='partner')s.players[a].relationship=0;return uid;}
const actions=s=>e.legalActions(s);
function act(s,a){assert.ok(a,`missing legal action: ${s.phase}/${e.actor(s)}`);return e.act(s,e.actor(s),s.revision,a.id);}
const passive=s=>actions(s).find(a=>a.kind==='skip')??actions(s).find(a=>a.kind==='pass')??actions(s)[0];
function pump(s,stop,pick=()=>null){for(let n=0;n<500;n++){if(stop(s)||s.phase==='finished')return s;s=act(s,pick(s)??passive(s));}throw Error('scenario did not settle');}
const settle=(s,pick)=>pump(s,s=>s.phase==='normal'&&!s.choice&&!s.chain.length,pick);
function activateTime(s,uid){s=act(s,actions(s).find(a=>a.kind==='place'&&a.source===uid));return pump(s,s=>s.phase==='response'&&!s.pending.length,s=>actions(s).find(a=>a.kind==='trigger'&&a.source===uid));}
const offer=(s,uid)=>actions(s).find(a=>a.source===uid&&['programPlay','play'].includes(a.kind));
const use=(s,uid)=>settle(act(s,offer(s,uid)));
const loc=(s,a,uid)=>s.players[a].board.world===uid?'world':s.players[a].discard.includes(uid)?'discard':s.players[a].deck.at(-1)===uid?'bottom':'other';

for(const [i,id] of ids.entries())test(`${id}: ordinary cost, shared final ${9+i}, no earlier-round placement`,()=>{
 let s=fixture();const uid=hand(s,'A',id),old=field(s,'A','W-sea','world');assert.equal(s.life.final,10);const before=s.players.A.time;
 s=activateTime(s,uid);assert.equal(s.life.final,10,'no change before response resolution');s=settle(s);
 assert.equal(s.life.final,9+i);assert.equal(s.players.A.time,before-2);assert.ok(s.players.A.discard.includes(old));assert.equal(s.players.A.board.world,uid);
 s=fixture(10+i);const late=hand(s,'A',id);assert.equal(actions(s).some(a=>a.source===late),false,'past rounds cannot be selected');
});
test('ordinary world replacement leaves final unchanged; same-number time placement is legal',()=>{
 let s=fixture();const one=hand(s,'A','W-time-xi');s=settle(activateTime(s,one));const two=hand(s,'A','W-time-xi');s=settle(activateTime(s,two));assert.equal(s.life.final,11);assert.ok(s.players.A.discard.includes(one));const sea=hand(s,'A','W-sea');s=settle(act(s,actions(s).find(a=>a.source===sea&&a.kind==='place')));assert.equal(s.life.final,11);assert.ok(s.players.A.discard.includes(two));
});
test('special counters alternate, allow equal numbers, charge each placement and resolve only last time effect',()=>{
 let s=fixture();const a=hand(s,'A','W-time-ix'),b=hand(s,'B','W-time-ix'),c=hand(s,'A','W-time-xii');
 s=activateTime(s,a);assert.equal(actions(s).some(x=>x.source===c&&x.counter),false,'cannot counter own waiting card');s=pump(s,s=>e.actor(s)==='B');
 assert.ok(actions(s).some(x=>x.source===b&&x.counter&&x.cost===2));s=activateTime(s,b);assert.equal(s.life.final,10);s=pump(s,s=>e.actor(s)==='A');s=activateTime(s,c);assert.equal(s.life.final,10);s=settle(s);
 assert.equal(s.life.final,12);assert.equal(s.life.events.filter(x=>x.op==='timeSet').length,1);assert.equal(s.players.A.time,6);assert.equal(s.players.B.time,8);assert.equal(loc(s,'A',a),'discard');assert.equal(loc(s,'B',b),'discard');assert.equal(loc(s,'A',c),'world');
});
test('time counters require an opposing waiting time effect and sufficient time',()=>{
 let s=fixture();const quick=hand(s,'A','E-nagaiki'),counter=hand(s,'B','W-time-xii');s=act(s,offer(s,quick));s=pump(s,s=>e.actor(s)==='B');assert.equal(actions(s).some(x=>x.source===counter),false);
 s=fixture();const a=hand(s,'A','W-time-ix'),b=hand(s,'B','W-time-xii');s=activateTime(s,a);s=pump(s,s=>e.actor(s)==='B');s.players.B.time=1;assert.equal(actions(s).some(x=>x.source===b),false);
});
for(const [main,expected,decline] of [['M-starfish-07','bottom',false],['M-coral-07','world',false],['M-dandelion-04','world',false],['M-dandelion-04','discard',true],['M-salmon-01','discard',false]])test(`U12 ${main} ${decline?'decline':'accept'}: replacement cannot restore negated time effect`,()=>{
 let s=fixture();field(s,'A',main);if(main==='M-coral-07'){field(s,'A','C-owl','companions');field(s,'A','P-grove_deer','partner');}const payment=main==='M-dandelion-04'?hand(s,'A','W-time-x'):null;
 const a=hand(s,'A','W-time-ix'),b=hand(s,'B','W-time-xii');s=activateTime(s,a);s=pump(s,s=>e.actor(s)==='B');s=activateTime(s,b);let choices=0;
 s=settle(s,state=>{if(state.choice?.kind!=='replacement')return null;choices++;assert.equal(state.choice.actor,'A');const options=actions(state);return decline?options.at(-1):options[0];});
 assert.equal(s.life.final,12);assert.equal(loc(s,'A',a),expected);assert.equal(s.life.events.filter(x=>x.op==='timeSet').length,1);assert.equal(choices>0,main!=='M-salmon-01');if(payment&&!decline)assert.ok(s.players.A.discard.includes(payment));
});
for(const final of [9,10,11,12])test(`final ${final}: finish after B's turn; 100 hold only before final round`,()=>{
 let s=fixture(final,'A');s.life.final=final;s.players.A.growth=100;s.players.A.reached=0;
 s=pump(act(s,actions(s).find(a=>a.kind==='pass')),s=>s.turn==='B'&&s.phase==='normal'&&!s.choice);assert.notEqual(s.phase,'finished');assert.equal(s.turn,'B');
 s=pump(act(s,actions(s).find(a=>a.kind==='pass')),s=>s.phase==='finished');assert.equal(s.phase,'finished');assert.equal(s.round,final);assert.equal(s.result.winner,'A');
 s=fixture(final-1,'A');s.life.final=final;s.players.A.growth=100;s.players.A.reached=0;s=pump(act(s,actions(s).find(a=>a.kind==='pass')),s=>s.phase==='finished');assert.equal(s.phase,'finished');assert.equal(s.round,final-1);assert.equal(s.result.winner,'A');
});
test('hayajimai: losing, exactly one round left, +15/+10/+5/+5 and once per turn',()=>{
 for(const [final,gain] of [[9,15],[10,10],[11,5],[12,5]]){let s=fixture(final-1);s.life.final=final;s.players.B.growth=60;const uid=hand(s,'A','E-hayajimai');s=use(s,uid);assert.equal(s.players.A.growth,40+gain);s.players.A.growth=40;const second=hand(s,'A','E-hayajimai');assert.equal(!!offer(s,second),false);}
 for(const [round,A,B] of [[8,40,60],[9,60,60],[9,65,60],[10,40,60]]){const s=fixture(round);s.players.A.growth=A;s.players.B.growth=B;const uid=hand(s,'A','E-hayajimai');assert.equal(!!offer(s,uid),false);}
});
test('nagaiki: both seats, resolve-time losing condition, compare before base +5, repeat allowed',()=>{
 for(const seat of ['A','B'])for(const [final,own,other,gain] of [[10,40,60,5],[11,50,55,15],[12,55,55,5],[12,60,55,5]]){let s=fixture(9,seat);s.life.final=final;s.players[seat].growth=own;s.players[seat==='A'?'B':'A'].growth=other;const uid=hand(s,seat,'E-nagaiki');s=use(s,uid);assert.equal(s.players[seat].growth,own+gain);const second=hand(s,seat,'E-nagaiki');assert.ok(offer(s,second));}
 let s=fixture(9);s.life.final=11;s.players.A.growth=50;s.players.B.growth=55;const uid=hand(s,'A','E-nagaiki');s=act(s,offer(s,uid));s.players.B.growth=50;s=settle(s);assert.equal(s.players.A.growth,55,'condition evaluated at resolution');
});
test('photo: final round only, count each companion/partner/ordinary world, cap15, exclude time worlds, once per turn',()=>{
 for(const [companions,partner,world,gain] of [[0,false,null,0],[1,false,'W-time-x',5],[1,true,'W-sea',15],[3,true,'W-sea',15]]){let s=fixture(10);for(let i=0;i<companions;i++)field(s,'A','C-owl','companions');if(partner){field(s,'A','M-dog-01');field(s,'A','P-grove_deer','partner');}if(world)field(s,'A',world,'world');const uid=hand(s,'A','E-omoide-photo');s=use(s,uid);assert.equal(s.players.A.growth,40+gain);assert.equal(!!offer(s,hand(s,'A','E-omoide-photo')),false);}
 const s=fixture(9),uid=hand(s,'A','E-omoide-photo');assert.equal(!!offer(s,uid),false);s.life.final=9;assert.ok(offer(s,uid));
});
test('new-card real command stream saves midgame and resumes to identical finished state',()=>{
 const deck=[...e.DEFAULT_DECK];ids.forEach((id,i)=>deck[i]=id);for(const [i,id] of ['E-hayajimai','E-nagaiki','E-omoide-photo'].entries())deck[i+4]=id;
 let s=e.createGame(4242,{A:deck,B:deck});const choose=state=>{const all=actions(state);return all.find(a=>a.kind==='place'&&ids.includes(state.cards[a.source]?.cardId))??all.find(a=>a.kind==='trigger')??all.find(a=>a.kind==='programPlay'&&state.cards[a.source]?.cardId==='E-nagaiki')??passive(state);};
 s=pump(s,s=>s.round===8&&s.phase==='normal',choose);assert.equal(s.round,8);assert.ok(s.life.events.length>0,'real game exercised time cards');const raw=e.save(s),back=e.restore(raw);assert.equal(e.save(back),raw);assert.deepEqual(back,s);const done=pump(s,s=>s.phase==='finished',choose),restored=pump(back,s=>s.phase==='finished',choose);assert.equal(done.phase,'finished');assert.deepEqual(restored,done);assert.deepEqual(e.restore(e.save(done)),done);
});
test('frozen hotseat7 replay fingerprints and save bytes remain unchanged',()=>{
 const data=JSON.parse(fs.readFileSync(path.join(here,'fixtures/hotseat7-saves.json'),'utf8'));assert.ok(data.games.length>=10);
 for(const row of data.games){const s=e.restore(row.save);assert.equal(e.save(s),row.save);const actual=createHash('sha256').update(JSON.stringify({round:s.round,turn:s.turn,phase:s.phase,result:s.result,players:s.players,history:s.history},(key,value)=>key==='onlyVersions'?undefined:value)).digest('hex');assert.equal(actual,row.fingerprint,row.lover);}
});
test('frozen hotseat1/2/5 saves preserve prior rules, outcomes and replay bytes',()=>{
 const one=JSON.parse(fs.readFileSync(path.join(here,'hotseat1-saves.json'),'utf8'));
 for(const row of [one.mid,one.finished]){const raw=JSON.stringify(row.save),s=e.restore(raw);assert.equal(e.save(s),raw);assert.equal(s.version,'hotseat-1');assert.equal(s.revision,row.revision);if(row.result)assert.deepEqual(s.result,row.result);}
 for(const [file,version] of [['doodle-jump-hotseat2-saves.json','hotseat-2'],['frogger-hotseat5-saves.json','hotseat-5']]){
  const data=JSON.parse(fs.readFileSync(path.join(here,file),'utf8'));
  for(const row of data.rows){const raw=JSON.stringify(row.save),s=e.restore(raw);assert.equal(s.version,version);assert.equal(e.save(s),raw);assert.deepEqual(s.result,row.result);const hash=createHash('sha256').update(JSON.stringify({players:s.players,result:s.result,log:beforeMirrorTitle(s.log)})).digest('hex');assert.equal(hash,row.stateSha256,row.case);}
 }
});
