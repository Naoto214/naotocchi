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
