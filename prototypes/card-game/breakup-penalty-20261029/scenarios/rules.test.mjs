// Fixed-position checks of the isolated variants (build/A, B, C, C2). Run: node --test scenarios/
// Same fixture helpers as ../../tests/tier1-direct.test.mjs. Nothing here touches the official modules.
import test from 'node:test';import assert from 'node:assert/strict';
import {dirname,join} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const BUILD=join(dirname(fileURLToPath(import.meta.url)),'..','build');
const V={};for(const v of ['A','B','C','C2'])V[v]=await import(pathToFileURL(join(BUILD,v,'engine.mjs')).href);
const S='E-misunderstanding',AM='E-amicable-breakup';
function kit(e){
 const fixture=()=>{const s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';s.players.A.time=10;s.players.B.time=10;return s;};
 const take=(s,a,c)=>{const x=s.players[a].deck.shift();s.cards[x].cardId=c;return x;};
 const field=(s,a,c,slot='main')=>{const id=take(s,a,c);s.cards[id].generation++;if(slot==='companions')s.players[a].board.companions.push(id);else s.players[a].board[slot]=id;return id;};
 const hand=(s,a,c)=>{const id=take(s,a,c);s.players[a].hand.push(id);return id;};
 const find=(s,pred)=>e.legalActions(s).find(pred);
 const doAction=(s,a)=>{assert.ok(a,'action not legal');return e.act(s,e.actor(s),s.revision,a.id);};
 const settle=(s,pick=()=>null)=>{let g=0;while(s.phase!=='normal'||s.choice){assert.ok(g++<80,'settle loop');if(s.phase==='finished')return s;const acts=e.legalActions(s);
  const a=pick(s,acts)??acts.find(x=>x.kind==='skip')??acts.find(x=>x.kind==='pass')??acts.find(x=>x.kind==='choose'&&x.value!=='cancel')??acts[0];s=e.act(s,e.actor(s),s.revision,a.id);}return s;};
 // A on its turn plays すれちがい at B's lover at stage `stage` (4 = married); B may answer with `answer`.
 const breakup=(stage,{answer=null,partnerCard='P-cliff_goat',seen=null}={})=>{let s=fixture();field(s,'A','M-dog-01');field(s,'B','M-dog-01');const lover=field(s,'B',partnerCard,'partner');s.players.B.relationship=stage;s.players.B.growth=50;
  const m=hand(s,'A',S),am=answer?hand(s,'B',answer):null;s=doAction(s,find(s,a=>a.source===m));
  s=settle(s,(st,acts)=>{seen?.(st,acts);return am?acts.find(a=>a.source===am&&['programPlay','play'].includes(a.kind)):null;});return {s,lover,am};};
 return {fixture,field,hand,find,doAction,settle,breakup};
}
const EXPECT={A:[10,10,10,10,10],B:[5,5,5,5,10],C:[10,10,10,10,10]};
for(const v of ['A','B','C'])test(`${v}: すれちがいによる別れ・離婚の減少（交際0〜3、結婚）`,()=>{
 const k=kit(V[v]);for(let st=0;st<=4;st++){const {s,lover}=k.breakup(st);assert.ok(s.players.B.hand.includes(lover));assert.equal(s.players.B.board.partner,null);assert.equal(s.players.B.growth,50-EXPECT[v][st],`stage ${st}`);}
});
test('C: 円満な別れでの応答なら−10を受けない。すれちがいは対象を失い、こいびとは手札へ（交際は0から）',()=>{
 const k=kit(V.C);for(let st=0;st<=3;st++){const {s,lover,am}=k.breakup(st,{answer:AM});assert.ok(s.players.B.hand.includes(lover));assert.ok(s.players.B.discard.includes(am));assert.equal(s.players.B.growth,50,`stage ${st}`);assert.equal(s.players.B.relationship,null);}
});
test('C: 結婚しているこいびとは対象にできない（離婚の−10は救済しない）',()=>{
 const e=V.C,k=kit(e);let s=k.fixture();k.field(s,'A','M-dog-01');k.field(s,'A','P-cliff_goat','partner');s.players.A.relationship=4;const am=k.hand(s,'A',AM);
 assert.equal(k.find(s,a=>a.source===am),undefined);s.players.A.relationship=3;assert.ok(k.find(s,a=>a.source===am));
});
test('C: 自分のターンに使うと−10なしで手札へ。人物の配置が残っていれば同じターンに出し直せる（出し直しの経路）',()=>{
 const e=V.C,k=kit(e);let s=k.fixture();k.field(s,'A','M-dog-01');k.field(s,'B','M-dog-01');const lover=k.field(s,'A','P-cat_ceo','partner');s.players.A.relationship=2;s.players.A.growth=50;const am=k.hand(s,'A',AM);
 s=k.settle(k.doAction(s,k.find(s,a=>a.source===am)));assert.equal(s.players.A.growth,50);assert.ok(s.players.A.hand.includes(lover));
 const again=k.find(s,a=>a.kind==='place'&&a.source===lover);assert.ok(again,'re-placement offered');
 s=k.doAction(s,again);assert.equal(s.players.A.relationship,0);
});
test('C2: 自分のターンには使えない。相手のターンのすれちがいへの応答では使える',()=>{
 const e=V.C2,k=kit(e);let s=k.fixture();k.field(s,'A','M-dog-01');k.field(s,'A','P-cliff_goat','partner');s.players.A.relationship=1;const am=k.hand(s,'A',AM);
 assert.equal(k.find(s,a=>a.source===am),undefined);
 const {s:t}=k.breakup(2,{answer:AM});assert.equal(t.players.B.growth,50);
});
test('C: とけないゆきだるまは「相手の効果」で別れた時だけ。自分の円満な別れでは発動しない',()=>{
 const e=V.C,k=kit(e);
 const snow=(st,acts)=>acts.some(a=>a.kind==='trigger'&&st.cards[a.source]?.cardId==='P-snowman');
 let opp=false;k.breakup(1,{partnerCard:'P-snowman',seen:(st,acts)=>{if(snow(st,acts))opp=true;}});
 let t=k.fixture();k.field(t,'A','M-dog-01');k.field(t,'B','M-dog-01');k.field(t,'A','P-snowman','partner');t.players.A.relationship=1;const am=k.hand(t,'A',AM);
 let offered=false;t=k.settle(k.doAction(t,k.find(t,a=>a.source===am)),(st,acts)=>{if(snow(st,acts))offered=true;return null;});
 assert.equal(opp,true,'opponent breakup offers the snowman trigger');assert.equal(offered,false,'own amicable breakup does not');
});
test('A・B・C: らぶれたーで残した場合は別れも減少も起きない',()=>{
 for(const v of ['A','B','C']){const e=V[v],k=kit(e);let s=k.fixture();k.field(s,'A','M-dog-01');const main=k.field(s,'B','M-dog-01');const lover=k.field(s,'B','P-cliff_goat','partner');s.players.B.relationship=2;s.players.B.growth=50;
  const paper=k.field(s,'B','I-partner1','prepared');s.players.B.board.prepared=[{id:paper,target:lover,targetGeneration:s.cards[lover].generation,attachedAt:0}];s.players.B.board.partner=lover;
  const m=k.hand(s,'A',S);s=k.settle(k.doAction(s,k.find(s,a=>a.source===m)),(st,acts)=>acts.find(a=>a.kind==='choose'&&/らぶれたー/.test(a.label)));
  assert.equal(s.players.B.board.partner,lover,v);assert.equal(s.players.B.growth,50,v);assert.equal(s.players.B.relationship,2,v);}
});
