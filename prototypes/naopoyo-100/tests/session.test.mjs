import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanProgress,readProgress,writeProgress,exportProgress,importProgress,STORAGE_KEY,replayActions} from '../session.mjs';

test('corrupt, oversized and foreign saves cannot alter progress',()=>{
 assert.deepEqual(cleanProgress(null).cleared,[]);
 assert.deepEqual(cleanProgress({cleared:['01','999',1,'01'],reviews:{'01':{note:'a'.repeat(3000),rating:'hard',star:true},'999':{note:'bad'}}}).cleared,['01']);
 assert.equal(cleanProgress({reviews:{'01':{note:'a'.repeat(3000)}}}).reviews['01'].note.length,2000);
 assert.throws(()=>importProgress('{bad'));
 assert.throws(()=>importProgress(JSON.stringify({version:9,cleared:['01']})));
});
test('dedicated save round trips notes and discovery without touching old keys',()=>{
 const data=new Map([['naopoyo.time-hand-dungeon.20261102.v8','unchanged']]);
 const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const p=cleanProgress({cleared:['01','100'],discovered:['fixture.exit'],reviews:{'01':{rating:'good',difficulty:'hard',star:true,note:'順序を考えた'}}});
 assert.equal(writeProgress(storage,p),true);assert.deepEqual(readProgress(storage),p);
 assert.equal(data.get('naopoyo.time-hand-dungeon.20261102.v8'),'unchanged');assert.match(STORAGE_KEY,/naopoyo\.hundred/);
 assert.deepEqual(importProgress(exportProgress(p)),p);
});
test('unavailable storage remains playable with a false save result',()=>{
 const storage={getItem:()=>{throw Error('denied')},setItem:()=>{throw Error('quota')}};
 assert.deepEqual(readProgress(storage).cleared,[]);assert.equal(writeProgress(storage,cleanProgress({})),false);
});
test('resume accepts only a legally replayable action history, never injected state',()=>{
 const create=()=>({actors:[{id:'p',x:1,y:1}],moves:0});
 const move=(s,id,dx,dy)=>{if(dx!==1||dy!==0||s.actors[0].x>=3)return {ok:false};s.actors[0].x+=dx;s.moves++;return {ok:true}};
 assert.equal(replayActions({},[{x:1,y:1,dx:1,dy:0}],create,move).state.actors[0].x,2);
 assert.equal(replayActions({},[{x:7,y:1,dx:1,dy:0}],create,move),null);
 assert.equal(replayActions({},[{x:1,y:1,dx:7,dy:0}],create,move),null);
});
