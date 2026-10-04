// Review candidate family stages before runtime promotion. Real shared builders/rig/motion.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {serve}=require('./shot.cjs');
const sharp=require('sharp');
(async()=>{
 const out=process.argv[2]||'test-results/full-rollout/wave1';fs.mkdirSync(out,{recursive:true});
 const server=await serve(),base=`http://127.0.0.1:${server.address().port}`;
 const browser=await require('playwright').chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:320,height:320},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const evidence=[];
 try{
  const family=process.argv.includes('--human')?'humanoid':process.argv.includes('--fish')?'fish':'rollout';
  const candidates=require('../../character-3d/'+family+'-spec.js')(require('../../character-3d/spec.js').PILOT);
  for(const id of (family==='humanoid'?Object.keys(candidates):family==='fish'?['salmon','clownfish']:['dog','cat','penguin'])){
   const tiles=[];
   const row=candidates[id];
   for(const stage of Object.keys(row.stages).map(Number)){
    const source=await sharp(path.join('assets/characters',id,'0'+stage+'.png')).trim().resize(256,256,{fit:'contain',background:'#eee9dd'}).extend({top:32,bottom:32,left:32,right:32,background:'#eee9dd'}).png().toBuffer();tiles.push({input:source,left:0,top:(stage-1)*320});
    for(const [v,view]of ['front','34','side','back'].entries()){
     await page.goto(`${base}/character-3d/wave-review.html?id=${id}&stage=${stage}&view=${view}`);await page.waitForFunction(()=>window.__wave?.ready);
     const result=await page.evaluate(()=>window.__wave);assert.ok(result.triangles>0);evidence.push(result);
     const file=path.join(out,`${id}-${stage}-${view}.jpg`);await page.locator('body').screenshot({path:file,type:'jpeg',quality:88});tiles.push({input:file,left:(v+1)*320,top:(stage-1)*320});
    }
   }
   await sharp({create:{width:1600,height:2560,channels:3,background:'#eee9dd'}}).composite(tiles).jpeg({quality:90}).toFile(path.join(out,id+'-stages.jpg'));
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify({source:process.env.GITHUB_SHA||null,environment:'Chromium / SwiftShader; not iPhone',evidence,errors},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
