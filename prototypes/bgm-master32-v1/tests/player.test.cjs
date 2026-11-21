const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('loop changes during loading apply to the source that eventually starts',async()=>{
 const {Transport}=require('../player.js');let resolve;
 const ctx={state:'running',currentTime:0,destination:{},resume:async()=>{},createGain:()=>({gain:{value:1},connect(){}}),createBufferSource:()=>({connect(){},start(){},stop(){},disconnect(){}})};
 const t=new Transport({context:ctx,load:()=>new Promise(r=>resolve=r)});
 const p=t.play({id:'a',loop:true,duration:10},false);t.setLoop(true);resolve({duration:10});await p;assert.equal(t.node.loop,true);
});
test('stopping while a file loads prevents late playback',async()=>{
 const file=path.resolve(__dirname,'../player.js');assert.ok(fs.existsSync(file),'player is not implemented');
 const {Transport}=require(file);let resolve,starts=0;
 const ctx={state:'running',sampleRate:44100,currentTime:0,destination:{},resume:async()=>{},createGain:()=>({gain:{value:1,setTargetAtTime(){}},connect(){}}),createBuffer:()=>({}),createBufferSource:()=>({connect(){},start(){starts++},stop(){},disconnect(){}})};
 const t=new Transport({context:ctx,load:()=>new Promise(r=>resolve=r)});
 const pending=t.play({id:'a',loop:true,duration:10});t.stop();resolve({duration:10});await pending;
 assert.equal(starts,0);assert.equal(t.state,'stopped');
});
test('a later selection wins when an earlier decode completes last',async()=>{
 const file=path.resolve(__dirname,'../player.js');assert.ok(fs.existsSync(file));
 const {Transport}=require(file);const resolvers={},started=[];
 const ctx={state:'running',currentTime:0,destination:{},resume:async()=>{},createGain:()=>({gain:{value:1,setTargetAtTime(){}},connect(){}}),createBufferSource:()=>({connect(){},start(){started.push(this.buffer.id)},stop(){},disconnect(){}})};
 const t=new Transport({context:ctx,load:s=>new Promise(r=>resolvers[s.id]=r)});
 const a=t.play({id:'a',duration:4}),b=t.play({id:'b',duration:4});resolvers.b({id:'b'});await b;resolvers.a({id:'a'});await a;
 assert.deepEqual(started,['b']);assert.equal(t.track.id,'b');
});
