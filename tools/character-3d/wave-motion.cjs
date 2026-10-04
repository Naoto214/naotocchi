// Commit-fixed candidate expression/motion contact sheets; no runtime promotion.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),sharp=require('sharp');
const {serve}=require('./shot.cjs'),SPEC=require('../../character-3d/spec.js');
(async()=>{
 const out=process.argv[2]||'test-results/full-rollout/candidate-motion';fs.mkdirSync(out,{recursive:true});
 const entries=(process.argv[3]||'turtle:3,frog:3,frog:5,frog:7').split(',').map(x=>{const [id,s]=x.split(':');assert.match(id,/^[a-z_]+$/);const stage=Number(s);assert.ok(stage>=1&&stage<=8);return {id,stage};});
 const server=await serve(),base=`http://127.0.0.1:${server.address().port}`,browser=await require('playwright').chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:320,height:320},deviceScaleFactor:1}),errors=[],evidence=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
 for(const {id,stage}of entries){const tiles=[],original=await sharp(path.join('assets/characters',id,'0'+stage+'.png')).trim().resize(280,280,{fit:'contain',background:'#eee9dd'}).extend({top:20,bottom:20,left:20,right:20,background:'#eee9dd'}).png().toBuffer();
 for(const [row,emotion]of SPEC.CANONICAL_EMOTIONS.entries()){
  tiles.push({input:original,left:0,top:row*320});
  for(const [col,pose]of [{moving:false,reduced:false},{moving:true,reduced:false},{moving:false,reduced:true},{moving:true,reduced:true}].entries()){
   const query=new URLSearchParams({id,stage:String(stage),view:'34',emotion,walk:pose.moving?'1':'0',reduced:pose.reduced?'1':'0'});
   await page.goto(base+'/character-3d/wave-review.html?'+query);await page.waitForFunction(()=>window.__wave?.ready);
   const data=await page.evaluate(()=>window.__wave);assert.equal(data.id,id);assert.equal(data.stage,stage);assert.equal(data.emotion,emotion);assert.equal(data.moving,pose.moving);assert.equal(data.reduced,pose.reduced);assert.ok(data.triangles>0);
   const name=`${id}-${stage}-${emotion}-${pose.moving?'walk':'idle'}-${pose.reduced?'reduced':'normal'}.jpg`;await page.screenshot({path:path.join(out,name),type:'jpeg',quality:88});tiles.push({input:path.join(out,name),left:(col+1)*320,top:row*320});evidence.push({...data,file:name});
  }
 }
 await sharp({create:{width:1600,height:SPEC.CANONICAL_EMOTIONS.length*320,channels:3,background:'#eee9dd'}}).composite(tiles).jpeg({quality:90}).toFile(path.join(out,`${id}-${stage}-motion.jpg`));
 }
 assert.deepEqual(errors,[]);assert.equal(evidence.length,entries.length*32);fs.writeFileSync(path.join(out,'motion-evidence.json'),JSON.stringify({source:process.env.GITHUB_SHA||null,environment:'Chromium/SwiftShader; not iPhone',entries,evidence,errors},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
