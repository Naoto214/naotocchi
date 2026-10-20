import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDS,legalActions,validate} from '../engine.mjs';
let book,tutorial;try{book=await import('../rulebook-content.mjs');}catch{}try{tutorial=await import('../tutorial.mjs');}catch{}
test('15 searchable chapters retain canonical examples, glossary and exact official sources',()=>{
 assert.ok(book,'rulebook missing');assert.equal(book.CHAPTERS.length,15);
 for(const ch of book.CHAPTERS){assert.ok(ch.title&&ch.summary&&ch.details.length&&ch.sources.length);for(const id of ch.cards??[])assert.ok(CARDS[id],id);}
 assert.ok(book.searchChapters('逆順').some(c=>c.id===13));assert.ok(book.searchChapters('逆順').length<10,'chapter search must not match every chapter via shared source text');assert.ok(book.searchChapters('１００').some(c=>c.id===2));assert.equal(book.searchChapters('nothing-matches-zz').length,0);
 assert.ok(book.GLOSSARY['そだち']);assert.equal(book.relatedChapter({type:'main'}),7);
 for(const src of book.SOURCES){const original=readFileSync(new URL('../../../docs/card-game/'+src.path,import.meta.url),'utf8');assert.equal(src.text,src.endMarker?original.split(src.endMarker)[0]:original);}
});
test('all nine lessons execute canonical legal commands and validate every checkpoint',()=>{
 assert.ok(tutorial,'tutorial missing');assert.equal(tutorial.LESSONS.length,9);
 for(let i=0;i<9;i++){
  const t=new tutorial.TutorialSession(i);let count=0;
  while(!t.done&&count++<35){validate(t.state);assert.equal(t.projection.players.B.hand,undefined,'opponent hand stays private');const before=JSON.stringify(t.state);const a=t.expectedAction;if(a){assert.ok(legalActions(t.state).some(x=>x.id===a.id));assert.equal(t.perform('forged',t.state.revision,t.epoch),false);assert.equal(JSON.stringify(t.state),before);const rev=t.state.revision,epoch=t.epoch;assert.equal(t.perform(a.id,rev,epoch),true);assert.equal(t.perform(a.id,rev,epoch),false,'stale click rejected');}else t.next();}
  assert.ok(t.done,'lesson '+i+' finishes');validate(t.state);assert.ok(count<35);assert.ok(t.outcome);
 }
});
test('fixed lessons demonstrate cost, person limit, preparation, challenge and reverse chain',()=>{
 assert.ok(tutorial);const run=i=>{const t=new tutorial.TutorialSession(i);while(!t.done){const a=t.expectedAction;if(a)t.perform(a.id,t.state.revision,t.epoch);else t.next();}return t;};
 const birth=run(2);assert.equal(birth.state.players.A.time,0);assert.ok(birth.state.players.A.board.main);
 const change=run(3);assert.equal(change.state.cards[change.state.players.A.board.main].cardId,'M-starfish-01');assert.equal(change.state.players.A.time,2);
 const prep=run(5);assert.equal(prep.state.players.A.board.prepared.length,2);
 const challenge=run(6);assert.equal(challenge.state.players.A.growth,25);
 const chain=run(7);assert.equal(chain.state.chain.length,0);assert.ok(chain.state.log.findIndex(x=>x.includes('じんとりを解決'))<chain.state.log.findIndex(x=>x.includes('ラッキーコインを解決')));
 const end=run(8);assert.equal(end.state.phase,'finished');assert.equal(end.state.result.reason,'R10最終比較');
});
test('progress is independently persisted, reconstructable and invalid data safe',()=>{
 assert.ok(tutorial);const m=new Map([['naotocchi-hotseat-v1','DO NOT CHANGE'],['naotocchi-cpu-match-v1','CPU SAVE']]);const storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
 const p=new tutorial.LearningProgress(storage);p.save({lesson:3,step:1,completed:[0,2]});const q=new tutorial.LearningProgress(storage);assert.deepEqual(q.data.completed,[0,2]);const t=new tutorial.TutorialSession(q.data.lesson,q.data.step);assert.equal(t.step,1);assert.equal(m.get('naotocchi-hotseat-v1'),'DO NOT CHANGE');assert.equal(m.get('naotocchi-cpu-match-v1'),'CPU SAVE');
 m.set(tutorial.LEARNING_KEY,'broken');assert.equal(new tutorial.LearningProgress(storage).data.lesson,0);
});
