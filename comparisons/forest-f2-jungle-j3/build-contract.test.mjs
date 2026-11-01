import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const out=process.env.F2J3_OUT||'../site-f2j3/dist';
test('owner play retains the real game clock; frozen time is explicit QA only',()=>{
 const js=fs.readFileSync(out+'/comparison-script.js','utf8');
 assert.match(js,/if\(!new URLSearchParams\(location.search\).has\('qa'\)\)setInterval\(loop, TICK_MS\);/);
 const gallery=fs.readFileSync(new URL('./gallery.js',import.meta.url),'utf8');assert.ok(!gallery.includes('qa=1'));
});
test('comparison adds no floating control over the original 5+4/UI',()=>{
 const html=fs.readFileSync(out+'/play.html','utf8');assert.ok(!html.includes('comparison-controls.js'));
});
