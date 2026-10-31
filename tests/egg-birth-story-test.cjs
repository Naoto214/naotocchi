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
