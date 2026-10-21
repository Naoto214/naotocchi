const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs');
const I=fs.existsSync('individuality.js') ? require('../individuality.js') : {};
test('individuality exposes the life-scoped core',()=>assert.equal(typeof I.create,'function'));
test('twelve fixed three-choice milestones supply 10/8/10/8 opportunities',()=>{
 assert.equal(I.data.events.length,12);
 const n={wonder:0,courage:0,kindness:0,perseverance:0};
 I.data.events.forEach(e=>{assert.equal(e.choices.length,3);e.choices.forEach(c=>n[c.heart]++);});
 assert.deepEqual(Object.values(n),[10,8,10,8]);
});
test('experience derives capped points, duplicate and stale life rejection',()=>{
 const s=I.create('dog',['home','forest'],()=>0.5,'life-1');
 assert.equal(I.points(s,'wonder'),0);
 for(let c=0;c<3;c++) for(let n=0;n<20;n++) I.experience(s,{lifeId:s.lifeId,heart:'wonder',category:c,id:`scene-${n}`});
 assert.equal(I.points(s,'wonder'),72);
 assert.equal(I.experience(s,{lifeId:'old',heart:'courage',category:0,id:'old'}),false);
 assert.equal(I.experience(s,{lifeId:s.lifeId,heart:'wonder',category:0,id:'scene-0'}),false);
 assert.deepEqual([0,7,8,19,20,35,36,59,60,92].map(I.stars),[1,1,2,2,3,3,4,4,5,5]);
});
test('choices persist beyond their cap and pending choices survive normalization',()=>{
 const s=I.create('cat',['home'],()=>0.1,'life-2');I.queue(s,0,90);
 for(const e of I.data.events){const c=e.choices.find(x=>x.heart==='wonder')||e.choices[0];assert.equal(I.choose(s,e.age,c.heart,s.lifeId),true);assert.equal(I.choose(s,e.age,c.heart,s.lifeId),false);}
 assert.equal(I.points(s,'wonder'),20);assert.equal(Object.values(s.events).filter(e=>e.status==='chosen').length,12);
 assert.deepEqual(I.normalize(s,{species:'cat',regions:['home'],age:90}),s);
});
test('all hearts allow 10 natural plus 5 legal choices or 15 natural only',()=>{
 for(const heart of Object.keys(I.data.hearts)) {
  for(const count of [10,15]) {const s=I.create('dog',['home'],()=>0.5,'route');
   for(let n=0;n<count;n++) I.experience(s,{lifeId:s.lifeId,heart,category:n%3,id:`route-${n}`});
   if(count===10){I.queue(s,0,90);for(const e of I.data.events.filter(e=>e.choices.some(c=>c.heart===heart)).slice(0,5)) I.choose(s,e.age,heart,s.lifeId);}
   assert.equal(I.points(s,heart),60);
  }
 }
});
test('normalization retains valid temperament, ignores corrupt experience and does not backfill old milestones',()=>{
 const s=I.normalize(null,{species:'dog',regions:['home'],age:50});assert.equal(I.pending(s).length,0);I.queue(s,50,56);assert.deepEqual(I.pending(s).map(e=>e.age),[56]);
 s.natural.wonder=[null,['ok','ok',{},'x'],99];const fixed=I.normalize(s,{species:'dog',regions:['home'],age:56});assert.equal(I.points(fixed,'wonder'),8);assert.deepEqual(fixed.temperament,s.temperament);
});
test('preferences require three experiences and do not count duplicates',()=>{
 const s=I.create('dog',['home'],()=>0.5,'prefs');
 for(let n=0;n<3;n++) I.prefer(s,'place','home',`home-${n}`,true);
 assert.equal(s.preferences.place.current,'home');const before=JSON.stringify(s.preferences);I.prefer(s,'place','home','home-2',true);assert.equal(JSON.stringify(s.preferences),before);
});
test('three draw distributions agree with their specified exact quantiles',()=>{
 for(const bias of [-1,0,1]) {const counts=[0,0,0,0,0];for(let n=0;n<100000;n++)counts[I.draw(bias,()=> (n+.5)/100000)-1]++;assert.deepEqual(counts,I.data.distributions[bias].map(n=>n*1000));}
});
test('preference switching requires two distinct confirmations; long play stays finite',()=>{
 const s=I.create('dog',['home','forest'],()=>0,'switch');for(let n=0;n<4;n++)I.prefer(s,'place','home',`home-${n}`,n===0);
 assert.equal(s.preferences.place.current,'home');let pending=false;
 for(let n=0;n<1000;n++){const p=s.preferences.place,old=p.current;I.prefer(s,'place','forest',`forest-${n}`,false);if(p.challenger==='forest'&&p.confirmations===1){pending=true;assert.equal(p.current,old);} }
 assert.ok(pending);assert.equal(s.preferences.place.current,'forest');assert.ok(Object.values(s.preferences.place.scores).every(Number.isFinite));assert.ok(s.preferences.place.history.length<=8);
});
