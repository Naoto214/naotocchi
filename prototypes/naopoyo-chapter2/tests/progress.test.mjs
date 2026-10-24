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
test('QA unlocks only 11–13 and never modifies normal progress',()=>{
 const s=memory(),normal=new ForestProgress(s);normal.flush();const saved=s.getItem(KEY);const q=new ForestProgress(s,{qa:true});assert.equal(q.ids.length,3);assert.ok(q.ids.every(id=>q.allowed(id)));q.clear(q.ids[2]);assert.equal(s.getItem(KEY),saved);assert.notEqual(KEY,QA_KEY);
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
