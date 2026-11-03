const {test}=require('node:test');const assert=require('node:assert/strict');
const clock=require('../world-environment.js');
test('local time boundaries and manual override',()=>{
 for(const [h,m,want] of [[4,59,'night'],[5,0,'morning'],[9,59,'morning'],[10,0,'day'],[15,59,'day'],[16,0,'evening'],[18,59,'evening'],[19,0,'night']])assert.equal(clock.timeOfDay('auto',new Date(2026,10,3,h,m)),want);
 assert.equal(clock.timeOfDay('night',new Date(2026,10,3,10)), 'night');
});
test('52 approved image routes and regional atmosphere',async()=>{
 const {DAYPARTS,atmosphere}=await import('../home-dayparts.mjs');
 assert.equal(Object.keys(DAYPARTS).length,13);
 for(const times of Object.values(DAYPARTS))assert.deepEqual(Object.keys(times).sort(),['day','evening','morning','night']);
 for(const region of ['deepsea','star_stop','memory_lake'])assert.equal(atmosphere({region,weather:'rain',season:'winter',time:'night'}).precipitation,'none');
 assert.equal(atmosphere({region:'home',weather:'snow',season:'winter'}).precipitation,'snow');
});
test('lazy loads, stale completion, failure retention and four-second fade',async()=>{
 const {createDayparts}=await import('../home-dayparts.mjs');let requests=[];
 class Image {set src(v){this.url=v;requests.push(this);}}
 const c=createDayparts({Image});c.select('home','day');assert.equal(requests.length,1);requests[0].onload();
 const first=c.frame(0).image;c.select('home','night');assert.equal(c.frame(0).image,first);requests[1].onerror();assert.equal(c.frame(0).image,first);
 c.select('forest','day');c.select('sea','night');requests[2].onload();assert.equal(c.frame(0).image,first);requests[3].onload();
 assert.equal(c.frame(2).alpha,.5);assert.equal(c.frame(2).alpha,1);
 c.select('home','day');requests[4].onload();assert.equal(c.frame(0,true).alpha,1);
 c.destroy();
});
test('rapid requests queue after current fade instead of jumping to its target',async()=>{
 const {createDayparts}=await import('../home-dayparts.mjs');let requests=[];class Image{set src(v){requests.push(this)}}
 const c=createDayparts({Image});c.select('home','day');requests[0].onload();c.select('home','night');requests[1].onload();
 const before=c.frame(1);c.select('forest','day');requests[2].onload();const after=c.frame(0);assert.equal(after.image,before.image);assert.equal(after.alpha,before.alpha);
 const next=c.frame(3);assert.equal(next.image,requests[2]);assert.equal(next.previous,requests[1]);assert.equal(next.alpha,0);
});
