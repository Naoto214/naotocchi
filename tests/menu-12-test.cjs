const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
test('menu retains existing destinations in the requested order and includes the prepared entry',()=>{
 const grid=html.match(/<div class="menu-grid">([\s\S]*?)\n          <\/div>/)[1];
 const labels=[...grid.matchAll(/<span class="menu-label">([\s\S]*?)<\/span>/g)].map(m=>m[1].replace(/<[^>]+>/g,''));
 assert.deepEqual(labels,['せかい','あいてむ','ずかん','じっせき','シールちょう','でざいん','ゲームをえらぶ','クイック','なおぽよ。','なおころ。','CARD GAME','ものがたり']);
 assert.match(grid,/href="prototypes\/naopoyo\/"/);assert.match(grid,/href="prototypes\/card-game\/"/);assert.match(grid,/href="prototypes\/madoromi-white-reader-20261027\/dist\/\?from=game#top"/);
 assert.match(html,/ころがるサイコロ、かわる人生。/);assert.match(html,/ただいま準備中！/);
});

test('prepared dialog keeps Escape from closing the underlying menu',()=>{
 assert.match(html, /<dialog id="naokoroDialog"[^>]*onkeydown="if \(event.key === 'Escape'\) event.stopPropagation\(\)"/);
});

test('browser Back dismisses the prepared dialog before the menu and keeps menu history', async()=>{
 const {harness}=require('./helpers/runtime-harness.cjs');
 const h=harness({deterministic:true}),flush=()=>new Promise(resolve=>setImmediate(resolve));
 for(const id of ['wipeOverlay','wipeConfirmOverlay','lifeCardOverlay']) h.get(id).classList.add('hidden');
 const calls=[];h.sandbox.history={pushState:()=>calls.push('push'),back:()=>calls.push('back')};
 h.dispatch(h.get('menuBtn'),'click');h.api.render();await flush();
 assert.equal(h.get('menuOverlay').classList.contains('hidden'),false);
 const dialog=h.get('naokoroDialog');dialog.open=true;dialog.close=()=>{dialog.open=false;};
 h.dispatch(h.window,'popstate',{bubbles:false});await flush();
 assert.equal(dialog.open,false,'Back closes native dialog');
 assert.equal(h.get('menuOverlay').classList.contains('hidden'),false,'menu remains open');
 assert.deepEqual(calls,['push','push'],'menu history layer is restored');
 h.dispatch(h.window,'popstate',{bubbles:false});await flush();
 assert.equal(h.get('menuOverlay').classList.contains('hidden'),true,'next Back closes menu normally');
});
