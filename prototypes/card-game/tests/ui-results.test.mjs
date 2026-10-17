import test from 'node:test';import assert from 'node:assert/strict';
import * as e from '../engine.mjs';import {HotseatSession} from '../ui-session.mjs';import * as ui from '../ui-presentation.mjs';
const start=(s=e.createGame(4),automatic=true)=>{const x=new HotseatSession({autoAdvance:automatic});x.start(s);x.reveal();return x;};
const step=(x,kind,p=()=>true)=>{const v=x.projection,a=v.actions.find(a=>a.kind===kind&&p(a));assert.ok(a,kind);x.commit(a.id,v.revision,x.viewer);return a;};
const rows=x=>(x.projection.results??[]).flatMap(g=>g.rows);
const fixture=()=>{const s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.players.A.time=10;s.players.B.time=0;return s;};
const put=(s,seat,id,zone='hand')=>{const n=s.players[seat].deck.shift();s.cards[n].cardId=id;s.players[seat][zone].push(n);return n;};
test('initial cards are a snapshot, egg return and birth draw have exact private identities',()=>{
 const x=start(),v=x.projection;assert.ok(v.results?.length,'result journal missing');assert.match(v.results[0].heading,/開始/);assert.equal(rows(x).filter(r=>r.kind==='initial')[0].cards.length,7);
 const returned=step(x,'choose',a=>a.choiceCard.includes('G-hit-blow'));const r=rows(x).find(r=>r.kind==='return');assert.equal(r.cards[0].id,returned.choiceCard);assert.equal(x.projection.phase,'normal');
 step(x,'place',a=>a.source.includes('M-beetle-01'));step(x,'trigger');const before=e.restore(x.save()),expected=before.players.A.deck[0];step(x,'choose');
 const draw=rows(x).findLast(r=>r.kind==='draw');assert.equal(draw.cards[0].id,expected);assert.ok(x.projection.players.A.hand.some(c=>c.id===expected));assert.equal(x.projection.phase,'normal');
 x.hide();assert.ok(rows(x).every(r=>!r.cards?.some(c=>c.id===expected)));assert.doesNotMatch(JSON.stringify(x.projection.results),new RegExp(expected));
});
test('growth, time, birth and current stats use exact committed values',()=>{
 const x=start();step(x,'choose',a=>a.choiceCard.includes('G-hit-blow'));step(x,'place',a=>a.source.includes('M-beetle-01'));
 assert.ok(rows(x).some(r=>r.kind==='time'&&r.before===1&&r.after===0));assert.ok(rows(x).some(r=>r.kind==='birth'));assert.ok(rows(x).some(r=>r.kind==='power'&&r.after===x.projection.players.A.stats.power));
 let s=fixture();const source=put(s,'A','I-c_coin2');s.cards[s.players.A.deck[0]].cardId='M-beetle-01';const y=start(s);step(y,'play',a=>a.source===source);step(y,'pass');
 const g=rows(y).find(r=>r.kind==='growth');assert.deepEqual([g.before,g.after,g.delta],[20,25,5]);assert.match(ui.workflowMarkup(y.projection,y.viewer),/20 → 25/);
});
test('automatic chain results preserve command order and actual LIFO log without attributing net changes',()=>{
 const s=fixture(),one=put(s,'A','I-c_coin2'),two=put(s,'A','G-hit-blow');const x=start(s,false);step(x,'play',a=>a.source===one);step(x,'play',a=>a.source===two);step(x,'pass');x.reveal();step(x,'pass');x.reveal();
 const result=x.projection.results.at(-1);assert.ok(result.trace.findIndex(t=>t.includes('ヒット'))<result.trace.findIndex(t=>t.includes('コイン')));assert.match(result.heading,/解決/);assert.ok(result.combined);assert.deepEqual([...x.projection.results].map(g=>g.revision),[...x.projection.results].map(g=>g.revision).sort((a,b)=>a-b));
});
test('restore reconstructs result history, starts concealed and stale clicks add no results',()=>{
 const x=start();const old=x.projection,a=step(x,'choose',a=>a.choiceCard.includes('G-hit-blow'));const saved=x.save(),results=x.projection.results;
 assert.throws(()=>x.commit(a.id,old.revision,'A'));assert.equal(x.save(),saved);assert.deepEqual(x.projection.results,results);
 const y=new HotseatSession({autoAdvance:true});y.restore(saved);assert.equal(y.viewer,null);assert.ok(y.projection.results.flatMap(g=>g.rows).every(r=>!r.cards?.length||!['initial','return','draw'].includes(r.kind)));y.reveal();assert.deepEqual(y.projection.results,results);assert.equal(y.save(),saved);
});
test('B draw remains hidden through handoff and appears only after B reveal',()=>{
 const x=start();step(x,'choose',a=>a.choiceCard.includes('G-hit-blow'));step(x,'pass');assert.equal(x.viewer,null);assert.equal(x.actor,'B');assert.ok(rows(x).filter(r=>r.kind==='draw').every(r=>!r.cards?.length));x.reveal();assert.equal(rows(x).findLast(r=>r.kind==='draw').cards.length,2);assert.equal(rows(x).findLast(r=>r.kind==='time').after,1);
});
test('result notice is noninteractive, shows draw art and full history remains available',()=>{
 const x=start();step(x,'choose',a=>a.choiceCard.includes('G-hit-blow'));step(x,'place',a=>a.source.includes('M-beetle-01'));step(x,'trigger');step(x,'choose');const g=x.projection.results.at(-1);
 assert.equal(typeof ui.resultNoticeMarkup,'function');const html=ui.resultNoticeMarkup(g);assert.match(html,/result-notice/);assert.match(html,/card-face/);assert.doesNotMatch(html,/<button|data-action|data-inspect/);assert.match(ui.workflowMarkup(x.projection,'A'),/直近の効果結果/);
});
const go=(s,kind,p=()=>true)=>{const a=e.legalActions(s).find(a=>a.kind===kind&&p(a));assert.ok(a,kind);return e.act(s,e.actor(s),s.revision,a.id);};
test('same-command negation is reported from actual history after links leave the chain',async()=>{
 const {captureResult}=await import('../ui-results.mjs');let s=fixture();s.players.B.time=10;const trap=put(s,'B','G-space-gunner-3d');s.players.B.hand.pop();s.players.B.board.prepared.push({id:trap,faceDown:true,setSerial:0});const play=put(s,'A','G-dot-eater');s=go(s,'programPlay',a=>a.source===play);s=go(s,'trigger',a=>a.source===trap);s=go(s,'pass');const before=s;s=go(s,'pass');assert.equal(s.chain.length,0);const g=captureResult(before,s).public;assert.ok(g.rows.some(r=>r.kind==='negate'&&r.cards[0].id===play));assert.equal(g.rows.some(r=>r.kind==='draw'),false);
});
test('prevention displays its recorded outcome without claiming prevented loss happened',async()=>{
 const {captureResult}=await import('../ui-results.mjs');let s=fixture();const hedgehog=put(s,'B','C-hedgehog');s.players.B.hand.pop();s.players.B.board.companions.push(hedgehog);const play=put(s,'A','G-gomoku-9');for(let i=0;i<2;i++){const id=put(s,'A','G-real-fishing');s.players.A.hand.pop();s.players.A.board.prepared.push({id,faceDown:true,setSerial:0});}s=go(s,'programPlay',a=>a.source===play&&a.variant==='opponent');s=go(go(s,'pass'),'pass');assert.equal(s.choice.kind,'quantity_prevention');const before=s;s=go(s,'choose');const g=captureResult(before,s).public;assert.ok(g.rows.some(r=>/防止/.test(r.text)));assert.ok(!g.rows.some(r=>r.kind==='growth'&&r.delta<0));assert.equal(s.players.B.growth,20);
});
test('consecutive growth events retain individual actual amounts rather than one net total',async()=>{
 const {captureResult}=await import('../ui-results.mjs');let s=fixture();const one=put(s,'A','G-dot-eater'),two=put(s,'A','G-dot-eater');s=go(s,'programPlay',a=>a.source===one);s=go(s,'programPlay',a=>a.source===two);s=go(s,'pass');const before=s;s=go(s,'pass');const changes=captureResult(before,s).public.rows.filter(r=>r.kind==='growth');assert.deepEqual(changes.map(r=>[r.before,r.after]),[[20,25],[25,30]]);assert.equal(s.players.B.growth,30);
});
test('actual power and wisdom reductions after prevention match engine stats',async()=>{
 const {captureResult}=await import('../ui-results.mjs');let s=fixture();const main=put(s,'B','M-cat-06');s.players.B.hand.pop();s.players.B.board.main=main;s.cards[main].generation++;const illness=put(s,'A','E-big-illness');s=go(s,'programPlay',a=>a.source===illness);s=go(go(s,'pass'),'pass');assert.equal(s.choice.kind,'quantity_prevention');const before=s;s=go(s,'choose',a=>a.label.includes('ちえ'));const r=captureResult(before,s).public.rows;for(const stat of ['power','wisdom']){const n=r.find(r=>r.kind===stat&&r.seat==='B');assert.equal(n.before,e.stats(before,'B')[stat]);assert.equal(n.after,e.stats(s,'B')[stat]);assert.equal(n.delta,stat==='power'?-2:-1);}
});
test('result capture is read-only, same-source time skip and discarded card are reported',async()=>{
 const {captureResult}=await import('../ui-results.mjs');let s=fixture();const main=put(s,'A','M-beetle-01');s.players.A.hand.pop();s.players.A.board.main=main;s.cards[main].generation++;const next=put(s,'A','M-beetle-02');const before=s;s=go(s,'place',a=>a.source===next&&a.variant==='time_skip');const snapshots=[JSON.stringify(before),JSON.stringify(s)],g=captureResult(before,s).A;assert.ok(g.rows.some(r=>r.text.includes('ときおくり')&&r.cards[0].id===next));assert.ok(g.rows.some(r=>r.kind==='discard'&&r.cards[0].id===main));assert.deepEqual([JSON.stringify(before),JSON.stringify(s)],snapshots);
});
test('restore suppresses old transient notifications, preserving history and future results',()=>{const x=start();step(x,'choose',a=>a.choiceCard.includes('G-hit-blow'));const saved=x.save(),revision=x.projection.revision;x.restore(saved);assert.ok(x.projection.results.length);assert.equal(x.projection.resultSince,revision+1);x.reveal();assert.equal(x.projection.results.some(g=>g.revision>=x.projection.resultSince),false);step(x,'place',a=>a.source.includes('M-beetle-01'));assert.ok(x.projection.results.some(g=>g.revision>=x.projection.resultSince));});
test('natural first turn result evidence preserves automation and private projections',async()=>{
 const x=start();step(x,'choose',a=>a.choiceCard.includes('G-hit-blow'));step(x,'place',a=>a.source.includes('M-beetle-01'));step(x,'trigger');step(x,'choose');const a=x.projection;step(x,'pass');assert.equal(x.viewer,null);const hidden=x.projection;x.reveal();const b=x.projection;assert.equal(b.turn,'B');assert.equal(b.players.B.time,1);assert.equal(b.players.B.hand.length,7);assert.equal(b.autoLog.length,9);
 if(process.env.QA7_TRACE){const {writeFileSync}=await import('node:fs');writeFileSync(process.env.QA7_TRACE,JSON.stringify({seed:4,scope:'Natural fixture results; A normal after birth effect, handoff, B first start',A:a.results,hidden:hidden.results,B:b.results,automaticPasses:b.autoLog.length},null,2)+'\n');}
});
