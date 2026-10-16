// Browser microbenchmark only: 27 existing models, synchronized state changes.
const fs=require('fs'),{serve}=require('./shot.cjs');
(async()=>{const srv=await serve();let browser;
try{browser=await require('playwright').chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:800,height:500}});await page.goto('http://127.0.0.1:'+srv.address().port+'/character-3d/gallery.html?bare=1&t=1&id=dog&stage=4');await page.waitForFunction(()=>window.__c3d?.items.length===1);
const data=await page.evaluate(async()=>{
 const T=await import('/vendor/three-0.170.0/three.module.min.js'),rt=await import('/character-3d/runtime.mjs'),an=await import('/character-3d/animate.mjs');
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(45,1.6,.1,100);camera.position.set(0,9,21);camera.lookAt(0,0,0);scene.add(new T.HemisphereLight(0xffffff,0xaaaaaa,2));
 const renderer=new T.WebGLRenderer({antialias:false});renderer.setSize(800,500);renderer.setPixelRatio(1);
 const rows=rt.SPEC.inventory().filter(r=>r.kind==='companion');rows.push({kind:'form',id:'dog',stage:4});if(rows.length!==27)throw Error('inventory '+rows.length);
 const instances=rows.map((r,j)=>{const k=rt.SPEC.specKeyFor(r.kind==='form'?{line:r.id,stage:r.stage-1}:r),i=rt.instantiate(rt.getTemplate(k.id,k.stage));i.holder.position.set((j%9-4)*1.7,0,(Math.floor(j/9)-1)*2);scene.add(i.holder);return i;});
 const measurements=[];
 for(let n=0;n<60;n++){
  const start=performance.now();for(const i of instances){an.setEmotion(i,rt.SPEC.CANONICAL_EMOTIONS[Math.floor(n/5)%12]);an.animate(i,{dt:1/60,moving:false,animLv:2});}
  const animated=performance.now();renderer.render(scene,camera);const end=performance.now();
  measurements.push({cpuAnimationMs:animated-start,renderSubmitMs:end-animated,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
 }
 const percentile=(key,p)=>measurements.slice(12).map(x=>x[key]).sort((a,b)=>a-b)[Math.floor(48*p)];
 const result={actors:instances.length,frames:60,states:12,warmupFrames:12,cpuAnimationMs:{p50:percentile('cpuAnimationMs',.5),p95:percentile('cpuAnimationMs',.95)},renderSubmitMs:{p50:percentile('renderSubmitMs',.5),p95:percentile('renderSubmitMs',.95)},calls:measurements.at(-1).calls,triangles:measurements.at(-1).triangles,environment:'Chromium SwiftShader; isolated 800x500 scene, not World FPS, GPU completion time, iPhone, RAM or baseline comparison'};
 for(const i of instances)rt.disposeInstance(i);renderer.dispose();return result;
});fs.writeFileSync('docs/qa/expression-complete-20261016/load-browser.json',JSON.stringify(data,null,2));console.log(data);
}finally{if(browser)await browser.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
