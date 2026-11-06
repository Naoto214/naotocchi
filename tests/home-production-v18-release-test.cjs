const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
test('production entry activates approved V18 and serves its current runtime bytes',()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/<body[^>]*data-home-display-version="18"[^>]*data-home-viewport-version="12"[^>]*data-home-production="true"/);
 const body=html.match(/<body\b[^>]*>/)[0];
 assert.match(body,/data-home-hero-percent="110"/);
 assert.match(body,/data-home-population-profile="v1"/);
 for(const file of ['script.js','home-production-touch.js','home-production-diorama.js','home-production-model.js','home-production-layout.css']){
  const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,12);
  assert.ok(html.includes(`${file}?v=${hash}`),`${file} cache token matches approved bytes`);
 }
 assert.doesNotMatch(html,/release-qa|v18-qa|HomeReleaseQA/);
});
