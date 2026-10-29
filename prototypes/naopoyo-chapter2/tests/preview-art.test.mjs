import test from 'node:test';import assert from 'node:assert/strict';
const art=await import('../preview-art.mjs').catch(()=>({}));
test('preview paints final digits once at destinations and never the obsolete split numbers',()=>{
 assert.equal(typeof art.drawSplitPreview,'function');const calls=[];
 const c=new Proxy({fillText:(v,x,y)=>calls.push({v:String(v),x,y})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const p={actors:[{id:'a',species:'dog',level:3,x:3,y:6},{id:'child',species:'dog',level:1,x:3,y:7}],births:[{id:'child',x:2,y:4,level:1}],rescues:[{x:7,y:7,level:2}]};
 const old=JSON.stringify(p);art.drawSplitPreview(c,p,40);assert.equal(JSON.stringify(p),old);
 assert.deepEqual(calls.filter(c=>['3','1'].includes(c.v)),[{v:'3',x:140,y:247.2},{v:'1',x:140,y:287.2}]);
 assert.ok(calls.some(c=>c.v==='★2'));assert.ok(!calls.some(c=>c.v==='6'));
 calls.length=0;art.drawSplitPreview(c,null,40);assert.equal(calls.length,0);
});
