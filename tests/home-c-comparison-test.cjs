const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('C comparison preserves four candidates and the same formal roster in every scene',()=>{
 const d=JSON.parse(fs.readFileSync('home-c-comparison-data.json','utf8'));
 assert.deepEqual(d.candidates.map(c=>c.id),['current','a','b','c']);
 assert.equal(d.candidates.find(c=>c.id==='c').interactive,false);
 for(const c of d.candidates){assert.ok(fs.existsSync(c.src));for(const mode of ['egg','six','twentyeight']){
 const cast=c.casts[mode];assert.equal(cast.length,({egg:1,six:6,twentyeight:28})[mode]);
 assert.deepEqual(cast.map(a=>a.src),d.candidates[0].casts[mode].map(a=>a.src));
 for(const a of cast){assert.ok(fs.existsSync(a.src));assert.ok(a.x>0&&a.x<1&&a.y>0&&a.y<1);}
 }}
});
test('C remains clearly static and cannot write or clear any game save',()=>{
 const js=fs.readFileSync('tools/home-c-comparison.js','utf8');assert.doesNotMatch(js,/localStorage|sessionStorage/);
 const html=fs.readFileSync('tools/home-c-comparison.html','utf8');assert.match(html,/2\.5D.*未接続/);assert.match(html,/静止合成/);
});
