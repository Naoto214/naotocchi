const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),out=path.resolve(process.argv[2]);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=JSON.parse(fs.readFileSync(path.join(root,'tools/pages/allowlist.json'))).files;
let checked=0;for(const file of files){if(file==='index.html')continue;assert.equal(hash(fs.readFileSync(path.join(out,file))),hash(fs.readFileSync(path.join(root,file))),file);checked++;}
for(const file of ['index.html','style.css','app.js','player.js','selection.js','fixture.js'])assert.equal(hash(fs.readFileSync(path.join(out,'prototypes/home-four-themes-v1',file))),hash(fs.readFileSync(path.join(__dirname,'..',file))),file);
const home=fs.readFileSync(path.join(out,'home-audition.html'),'utf8');assert.match(home,/home-audition-runtime.js/);assert.match(home,/prototypes\/home-four-themes-v1\/fixture.js/);
const runtime=fs.readFileSync(path.join(out,'home-audition-runtime.js'),'utf8');assert.ok(!runtime.includes('setInterval(loop, TICK_MS);'));assert.match(runtime,/window.HomeAuditionFixture=/);
assert.equal(fs.readFileSync(path.join(out,'home-production-diorama.js'),'utf8'),fs.readFileSync(path.join(root,'home-production-diorama.js'),'utf8'));
console.log(JSON.stringify({unchangedProductionFiles:checked,previewFiles:6,fixture:'isolated',ok:true}));
