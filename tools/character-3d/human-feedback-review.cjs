// Reuse the existing wave renderer, source-only before rows, and normal capture conditions.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),sharp=require('sharp');
const {serve}=require('./shot.cjs');
async function run(out){
 const before=require('../../docs/qa/character-3d-full-v0/author-soft-hair-20261011/before-specs.json'),current=require('../../character-3d/nonplayer-spec.js')(),views=['front','34','side','back'];
 fs.mkdirSync(out,{recursive:true});const srv=await serve(),browser=await require('playwright').chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),records=[],errors=[];
 const selected=require('../../.github/character-3d-nonplayer-qa.json').keys;assert.ok(selected.length&&selected.every(key=>before.rows[key]),'exact saved before rows required');
 try{for(const [key,row]of Object.entries(before.rows).filter(([key])=>selected.includes(key))){
  assert.equal(current[key].asset,row.asset,'immutable original design');const original=await sharp(row.asset).trim().resize(280,280,{fit:'contain',background:'#eee9dd'}).extend({top:20,bottom:20,left:20,right:20,background:'#eee9dd'}).png().toBuffer(),tiles=[];
  for(const [y,version]of ['before','after'].entries()){
   const page=await browser.newPage({viewport:{width:320,height:320},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(String(e)));
   if(version==='before')await page.route('**/character-3d/nonplayer-spec.js',route=>route.fulfill({contentType:'text/javascript',body:'globalThis.NaotocchiNonPlayerWave=()=>('+JSON.stringify(before.rows)+');'}));
   tiles.push({input:original,left:0,top:40+y*360});
   for(const [x,view]of views.entries()){
    await page.goto('http://127.0.0.1:'+srv.address().port+'/character-3d/wave-review.html?'+new URLSearchParams({id:key,stage:'0',view,emotion:'normal',walk:'0',reduced:'0'}));
    await page.waitForFunction(()=>window.__wave?.ready);const info=await page.evaluate(()=>window.__wave);assert.equal(info.id,key);assert.equal(info.view,view);
    const file=key.replace(':','-')+'-'+version+'-'+view+'.jpg';await page.screenshot({path:path.join(out,file),type:'jpeg',quality:92});records.push({version,file,...info});tiles.push({input:path.join(out,file),left:(x+1)*320,top:40+y*360});
   }await page.close();
  }
  const label=Buffer.from('<svg width="1600" height="720"><g font-family="sans-serif" font-size="18" fill="#34332f"><text x="12" y="26">2D original | BEFORE — front / 3-4 / side / back</text><text x="12" y="386">2D original | AFTER — front / 3-4 / side / back</text></g></svg>');
  tiles.push({input:label,left:0,top:0});await sharp({create:{width:1600,height:720,channels:3,background:'#eee9dd'}}).composite(tiles).jpeg({quality:94}).toFile(path.join(out,key.replace(':','-')+'-comparison.jpg'));
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'comparison-metadata.json'),JSON.stringify({beforeCommit:before.sourceCommit,afterCommit:process.env.GITHUB_SHA||null,renderer:'existing wave-review.html; per-model bounding-box fit; unchanged lighting and poses',originalNote:'Single original 2D repeated in both rows; no invented side/back original',beforeSpecSha256:crypto.createHash('sha256').update(JSON.stringify(before.rows)).digest('hex'),records,errors},null,2)+'\n');
 }finally{await browser.close();srv.close();}
}
if(require.main===module)run(process.argv[2]||'test-results/full-rollout/nonplayer').catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
