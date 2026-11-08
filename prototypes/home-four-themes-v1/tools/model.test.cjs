const {test}=require('node:test');const assert=require('node:assert/strict');
const S=(()=>{try{return require('../selection.js')}catch{return {}}})();
test('exact local-day boundaries including midnight',()=>{
 for(const [h,m,slot] of [[0,0,'night'],[4,59,'night'],[5,0,'morning'],[9,59,'morning'],[10,0,'day'],[15,59,'day'],[16,0,'evening'],[18,59,'evening'],[19,0,'night'],[23,59,'night']])assert.equal(S.slotAt(h*60+m),slot);
});
test('four selected objects and both deferred objects retain original identity',()=>{
 const F=require('../../main-theme-favorites-20261108/favorites.js');
 assert.deepEqual(S.THEMES.map(x=>x.title),['そよかぜのまど','いつものにわ','ほしふるみずうみ','ほしぞらのやくそく']);
 for(const x of [...S.THEMES,...S.DEFERRED])assert.equal(x.song,F.FAVORITES.find(f=>f.id===x.id).song);
 assert.deepEqual(S.DEFERRED.map(x=>x.id),['kisetsu','ohayo']);
});
test('sequence stops after night unless repeated; single repeats its own track',()=>{
 assert.equal(S.nextSlot('morning',true,false),'day');assert.equal(S.nextSlot('evening',true,false),'night');
 assert.equal(S.nextSlot('night',true,false),null);assert.equal(S.nextSlot('night',true,true),'morning');
 assert.equal(S.nextSlot('day',false,true),'day');assert.equal(S.nextSlot('day',false,false),null);
});
