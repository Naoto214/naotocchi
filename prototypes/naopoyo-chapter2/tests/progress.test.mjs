import test from 'node:test';import assert from 'node:assert/strict';
import {ForestProgress,KEY,QA_KEY,allStages} from '../progress.mjs';
import {KEY as OLD} from '../../naopoyo-chapter1/progress.mjs';
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)}};
test('normal chapter 10 → 11 → 12 → 13 and replay never relocks',()=>{
 const s=memory(),p=new ForestProgress(s);assert.equal(p.allowed('komorebi-fall'),false);
 for(const stage of allStages.slice(0,10))p.clear(stage.id);assert.ok(p.allowed('komorebi-fall'));assert.equal(p.allowed('komorebi-support'),false);
 p.clear('komorebi-fall');p.clear('komorebi-support');assert.ok(p.allowed('komorebi-last-friend'));p.select(allStages[0].id);assert.ok(new ForestProgress(s).allowed('komorebi-last-friend'));
});
test('read-only chapter-one completion seeds trial; all writes are isolated',()=>{
 const s=memory();s.setItem(OLD,JSON.stringify({version:1,cleared:['light-owl-trial'],boards:{sentinel:'retain'}}));s.setItem(OLD+'.board.light-arrival','raw-board');const before=[...s.map];
 const p=new ForestProgress(s);assert.ok(p.allowed('komorebi-fall'));p.clear('komorebi-fall');p.board('komorebi-support',{sentinel:1});
 for(const [k,v]of before)assert.equal(s.getItem(k),v);assert.deepEqual(new ForestProgress(s).data.boards['komorebi-support'],{sentinel:1});
});
test('QA unlocks only 11–20 and never modifies normal progress',()=>{
 const s=memory(),normal=new ForestProgress(s);normal.flush();const saved=s.getItem(KEY);const q=new ForestProgress(s,{qa:true});assert.equal(q.ids.length,10);assert.ok(q.ids.every(id=>q.allowed(id)));q.clear(q.ids[2]);assert.equal(s.getItem(KEY),saved);assert.notEqual(KEY,QA_KEY);
});
test('unknown future save is preserved and corruption backup stays in pilot namespace',()=>{
 const s=memory();s.setItem(KEY,JSON.stringify({version:99}));const p=new ForestProgress(s);p.flush();assert.equal(JSON.parse(s.getItem(KEY)).version,99);
 const z=memory();z.setItem(KEY,'{broken');new ForestProgress(z);assert.equal(z.getItem(KEY+'.damaged'),'{broken');assert.equal(z.getItem(OLD+'.damaged'),null);
});
test('future board slot and outer board copy survive normal autosave',()=>{
 const s=memory(),id='komorebi-fall',future={version:99,stageId:id,current:{opaque:'keep'}};
 s.setItem(KEY,JSON.stringify({version:1,unlocked:[id],current:id,boards:{[id]:future}}));s.setItem(KEY+'.board.'+id,JSON.stringify(future));
 const p=new ForestProgress(s);assert.equal(p.board(id,{version:1}),false);assert.deepEqual(JSON.parse(s.getItem(KEY+'.board.'+id)),future);assert.deepEqual(JSON.parse(s.getItem(KEY)).boards[id],future);
});
test('damaged board slot is preserved before writing a replacement',()=>{
 const s=memory(),id='komorebi-fall';s.setItem(KEY,JSON.stringify({version:1,unlocked:[id],boards:{}}));s.setItem(KEY+'.board.'+id,'{broken board');
 const p=new ForestProgress(s);p.board(id,{version:1});assert.equal(s.getItem(KEY+'.board.'+id+'.damaged'),'{broken board');
});
for(const source of ['whole-save','append-only-marker'])test(`completed old Pilot unlocks new 14 from ${source} without replaying 13`,()=>{
 const s=memory(),oldIds=allStages.slice(0,13).map(s=>s.id),last=oldIds.at(-1),next=allStages[13].id;
 s.setItem(KEY,JSON.stringify({version:1,unlocked:oldIds,cleared:source==='whole-save'?oldIds:oldIds.slice(0,-1),current:'komorebi-fall',boards:{sentinel:{keep:true}},hints:{[last]:2},read:[last]}));
 if(source==='append-only-marker')s.setItem(KEY+'.cleared.'+last,'1');
 const p=new ForestProgress(s);assert.ok(p.allowed(next));assert.equal(p.allowed(allStages[14].id),false);assert.equal(p.data.current,'komorebi-fall');assert.equal(p.data.hints[last],2);assert.deepEqual(p.data.boards.sentinel,{keep:true});
 p.select(next);assert.ok(new ForestProgress(s).allowed(next));assert.equal(s.getItem(OLD),null);assert.equal(s.getItem(QA_KEY),null);
});
test('uncleared final Pilot stage does not unlock 14',()=>{
 const s=memory(),ids=allStages.slice(0,13).map(s=>s.id);s.setItem(KEY,JSON.stringify({version:1,unlocked:ids,cleared:ids.slice(0,-1),current:ids.at(-1)}));assert.equal(new ForestProgress(s).allowed(allStages[13].id),false);
});
test('VERSION 7 progress survives migration without rewriting board or undo history',()=>{
 for(const qa of [false,true]){
  const s=memory(),oldKey='naopoyo.komorebi.magic-rock.20261025.v1'+(qa?'.qa':''),id='komorebi-reverse-stars';
  const raw=JSON.stringify({version:1,cleared:[id],unlocked:[id],boards:{[id]:{version:1,oldPhysics:true}}});
  s.setItem(oldKey,raw);s.setItem(oldKey+'.board.'+id,'old-history');const p=new ForestProgress(s,{qa});
  assert.notEqual(p.actualKey,oldKey);assert.ok(p.data.cleared.includes(id));assert.equal(p.data.boards[id],undefined);
  p.clear(id);assert.equal(s.getItem(oldKey),raw);assert.equal(s.getItem(oldKey+'.board.'+id),'old-history');
 }
});
