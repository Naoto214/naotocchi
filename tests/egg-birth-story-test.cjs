const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
function boot(){const h=harness({resume:true});h.get('lifeCardOverlay').classList.add('hidden');h.api.render();return h;}
const warm=h=>h.dispatch(h.get('playWithBtn'),'click');
test('egg changes are words only at all four warming stages without changing growth',()=>{
 const h=boot();
 const expected=['たまごが、ほんのりあたたかい。','なかで、なにかがうごいた気がする。','たまごが、こつんとゆれた。','もうすぐ、あえそうだ。'];
 for(let i=0;i<4;i++){warm(h);assert.equal(h.api.state().growth,4*(i+1));assert.equal(h.api.state().stage,'egg');assert.equal(h.api.getMessage(),expected[i]);}
});

test('birth uses the formal first-stage name, once; decoration is transient',()=>{
 const h=boot();h.api.state().lifetime.nextEggLine='dog';h.api.state().items.c_egg_normal=1;
 for(let i=0;i<5;i++)warm(h);
 assert.equal(h.api.getMessage(),'あかちゃんいぬがうまれた！');
 const panel=h.get('petArea').children.find(n=>n.className==='birth-celebration');
 assert.ok(panel);assert.equal(panel.children.filter(n=>n.className==='birth-star').length,8);
 for(let i=0;i<10;i++)h.dispatch(h.get('petArea'),'click');
 assert.equal(h.api.state().lifeLog.filter(n=>n.text==='たまごからうまれた').length,1);
 h.advance(3000);assert.equal(panel.isConnected,false);
});

test('birth has one notice, no central text panel, and the notice styling expires',()=>{
 const h=boot();for(let i=0;i<5;i++)warm(h);
 const decoration=h.get('petArea').children.find(n=>n.className==='birth-celebration');
 assert.ok(decoration);
 assert.equal(decoration.children.some(n=>n.className==='birth-panel'),false);
 assert.equal(decoration['aria-hidden'],'true');
 assert.equal(h.get('message').classList.contains('birth-notice'),true);
 assert.equal(decoration.children.filter(n=>n.className==='birth-star').length,8);
 h.advance(2801);
 assert.equal(h.get('message').classList.contains('birth-notice'),false);
 assert.equal(decoration.isConnected,false);
});

test('an achievement waits until the birth notice finishes',()=>{
 const h=harness({resume:true,homeDiorama:true,productionHome:true,worldScene:true});
 h.get('lifeCardOverlay').classList.add('hidden');h.api.render();
 for(let i=0;i<5;i++)warm(h);
 h.api.showStoryEvent({emoji:'🏆',message:'じっせきのしらせ'});
 assert.equal(h.get('storyFlash').classList.contains('hidden'),true);
 h.advance(2801);
 assert.equal(h.get('storyFlash').classList.contains('hidden'),false);
 assert.match(h.get('storyFlashText').textContent,/じっせき/);
});

test('birth presentation holds the hatch pose until its notice ends',()=>{
 const h=harness({resume:true,homeDiorama:true,productionHome:true,worldScene:true});
 h.get('lifeCardOverlay').classList.add('hidden');h.api.render();
 for(let i=0;i<5;i++)warm(h);
 h.get('storyFlash').classList.add('hidden');
 assert.equal(h.api.homeDioramaBlocked(),true,'birth itself holds the pose without an achievement overlay');
 h.advance(2801);
 h.get('storyFlash').classList.add('hidden');
 assert.equal(h.api.homeDioramaBlocked(),false,'normal free life resumes after celebration');
});
