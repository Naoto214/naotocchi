import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as e from '../engine.mjs';
import {advanceResponses} from '../auto-progress.mjs';
import {HotseatSession} from '../ui-session.mjs';
import {CpuSession} from '../cpu-session.mjs';

function fixture(){
 const s=e.createGame(30261019);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';
 for(const p of Object.values(s.players)){p.deck.push(...p.hand);p.hand=[];p.time=10;}
 return s;
}
function put(s,seat,id){const p=s.players[seat],x=p.deck.shift();s.cards[x].cardId=id;p.hand.push(x);return x;}
function go(s,kind,p=()=>true){const a=e.legalActions(s).find(a=>a.kind===kind&&p(a));assert.ok(a,kind);return e.act(s,e.actor(s),s.revision,a.id);}
const jintori=(s,source)=>e.legalActions(s).find(a=>a.source===source&&a.kind==='play');

test('jintori text, time and method match the immutable official source',()=>{
 const c=e.CARDS['G-area-claim'],text='たまごを除く自分の場のカードが7枚以上なら、自分のそだち+10。9枚あるなら、さらに自分のそだち+5。';
 assert.equal(c.text,text);assert.equal(c.cost,3);assert.equal(c.method,'すぐつかう');
 const source=readFileSync(new URL('../../../docs/card-game/85-play-batch-4-card-text-draft.md',import.meta.url),'utf8');assert.ok(source.includes(text));
 const rules=readFileSync(new URL('../../../docs/card-game/06-action-chain-checkpoint.md',import.meta.url),'utf8');assert.ok(rules.includes('「空撃ち禁止」という独立基本ルールは設けない'));
});
test('jintori can respond to own and opponent ordinary actions; fewer than seven is legal',()=>{
 for(const turn of ['A','B']){
  let s=fixture();s.turn=turn;s.priority=turn;
  const area=put(s,'A','G-area-claim'),person=put(s,turn,'C-box');
  s=go(s,'place',a=>a.source===person);if(e.actor(s)!=='A')s=go(s,'pass');
  assert.equal(s.phase,'response');assert.ok(jintori(s,area));
  assert.equal(advanceResponses(s).steps.length,0,'legal response must not auto-pass');
  s.players.A.time=2;assert.equal(jintori(s,area),undefined);
 }
});
test('a passed opportunity returns only after a new opposing link; same physical card cannot be reused',()=>{
 let s=fixture();const a=put(s,'A','G-area-claim'),a2=put(s,'A','G-area-claim'),b=put(s,'B','G-area-claim');
 s.phase='response';s=go(s,'pass');assert.equal(e.actor(s),'B');
 s=go(s,'play',x=>x.source===b);assert.equal(s.chain.length,1);assert.equal(s.passes,0);
 s=go(s,'pass');assert.equal(e.actor(s),'A');assert.ok(jintori(s,a));
 s=go(s,'play',x=>x.source===a);assert.equal(s.players.A.time,7);assert.ok(!s.players.A.hand.includes(a));assert.equal(jintori(s,a),undefined);
 assert.ok(jintori(s,a2),'another copy is legal in the same chain when time permits');
 s=go(s,'play',x=>x.source===a2);assert.equal(s.chain.length,3);assert.equal(s.players.A.time,4);
 s=go(go(s,'pass'),'pass');assert.equal(s.chain.length,0);assert.ok(s.players.A.discard.includes(a)&&s.players.A.discard.includes(a2));assert.ok(s.players.B.discard.includes(b));
 e.validate(s);
});
test('jintori counts the field at resolution, excludes egg and activation; 0/7/8/9 produce 0/10/10/15',()=>{
 for(const [count,gain] of [[0,0],[7,10],[8,10],[9,15]]){
  let s=fixture();const p=s.players.A,b=p.board;
  const place=(id,slot)=>{const x=put(s,'A',id);p.hand.pop();if(slot==='companions')b.companions.push(x);else if(slot==='prepared')b.prepared.push({id:x,faceDown:true});else b[slot]=x;};
  if(count){place('M-starfish-01','main');place('P-anglerfish','partner');place('W-countryside','world');for(let i=0;i<3;i++)place('C-box','companions');for(let i=6;i<count;i++)place('G-real-fishing','prepared');}
  const area=put(s,'A','G-area-claim'),before=p.growth;s=go(s,'play',a=>a.source===area);assert.equal(s.players.A.time,7);
  s=go(go(s,'pass'),'pass');assert.equal(s.players.A.growth-before,gain);assert.ok(s.players.A.discard.includes(area));e.validate(s);
 }
});
test('one explicit pass completes an empty response with no duplicate decision in CPU and two-player modes',()=>{
 for(const session of [new HotseatSession({autoAdvance:true}),new CpuSession()]){
  const s=fixture();put(s,'A','G-area-claim');s.phase='response';s.players.B.time=0;
  session.start(s);session.reveal();const v=session.projection;
  assert.equal(v.phase,'response');assert.ok(v.actions.some(a=>a.kind==='play'));
  const pass=v.actions.find(a=>a.kind==='pass');session.commit(pass.id,v.revision,'A');
  assert.equal(session.projection.phase,'normal');assert.equal(session.projection.turn,'A');
  assert.equal(session.projection.revision,v.revision+2);assert.equal(session.projection.autoLog.length,1);
  const saved=session.save();assert.throws(()=>session.commit(pass.id,v.revision,'A'));assert.equal(session.save(),saved);
 }
});
