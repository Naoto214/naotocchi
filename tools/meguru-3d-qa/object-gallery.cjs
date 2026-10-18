// Static, isolated World prop/family inspection. Uses production geometry and
// renderer. No actors, surroundings, animation or performance claims in this fixture.
// node object-gallery.cjs <root> <outDir> [selection-json]
const fs=require('fs'),path=require('path'),http=require('http'),pw=require('playwright');
const ROOT=path.resolve(process.argv[2]),OUT=path.resolve(process.argv[3]);fs.mkdirSync(OUT,{recursive:true});
const SELECTION=process.argv[4]?path.resolve(process.argv[4]):path.join(ROOT,'tools/meguru-3d-qa/shots-visual-quality-v2-gallery.json');
process.chdir(ROOT);
const {harness}=require(path.join(ROOT,'tests/helpers/runtime-harness.cjs'));
const h=harness({deterministic:true,fullDisplay:true,pinDate:true}),M=h.api.meguruMod,reg=M.buildRegistry();
const selected=JSON.parse(fs.readFileSync(SELECTION,'utf8'));
const cache=new Map(),items=selected.map(s=>{if(!cache.has(s.region))cache.set(s.region,M.worldObjects3d(M.buildWorld(s.region,reg,{world3d:true})).objects);const ob=cache.get(s.region).find(o=>o.id===s.target);if(!ob)throw Error('Missing target '+s.target);return {name:s.name,region:s.region,ob,distance:s.galleryDistance,yaw:s.galleryYaw};});
const html='<!doctype html><style>body{margin:0}canvas{width:600px;height:600px}</style><canvas width="600" height="600"></canvas><script src="/meguru.js"></script>';
(async()=>{
 const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}const f=path.resolve(ROOT,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)){res.statusCode=404;return res.end();}res.setHeader('Content-Type',/\.m?js$/.test(f)?'text/javascript':'application/octet-stream');fs.createReadStream(f).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await pw.chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM,args:['--use-gl=angle','--enable-unsafe-swiftshader']});
 try {const page=await browser.newPage({viewport:{width:600,height:600}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/.test(m.text()))errors.push(m.text());});
 await page.goto('http://127.0.0.1:'+server.address().port);
 for(const item of items){
 const result=await page.evaluate(async item=>{
  if(window.galleryRenderer)window.galleryRenderer.destroy();
  const M=installNaotocchiMeguru({getState:()=>({lifetime:{}})}),canvas=document.querySelector('canvas');
  const ob={...item.ob,x:0,z:500};if(ob.collision)ob.collision={...ob.collision,x:0,z:500};
  // Minimal stage, same part descriptors/materials. Translation does not change shape.
  const prof={...M.REGION3D[item.region],relief:{},fog:[3000,5000]};
  const proxy={...M,ACTOR_SIZE:0,REGION3D:{...M.REGION3D,[item.region]:prof},streams3d:()=>[],worldObjects3d:()=>({objects:[ob]}),glyphSprite:()=>null,spriteFor:()=>null,createCanvasRenderer:()=>({draw(){},resize(){},destroy(){}})};
  const {createMeguru3D}=await import('/meguru-3d.mjs');
  const renderer=createMeguru3D(proxy,{onFallback:e=>{throw e;}})({canvas,ctx:null,W:600,H:600});window.galleryRenderer=renderer;
  renderer.setOccluderFade(false);renderer.setAdaptiveDpr(false);renderer.setAnimLevel(0);
  let top=50,radius=30;for(const p of ob.parts){top=Math.max(top,(p.y||0)+(p.h||p.r||0));radius=Math.max(radius,Math.abs(p.dx||0)+(p.rx||p.r||p.len/2||0),Math.abs(p.dz||0)+(p.rz||p.r||p.w/2||0));}
  const yaw=item.yaw??((ob.collision?.ang||ob.rot||0)-Math.PI/2+0.45),dist=item.distance||Math.max(65,radius*3,top*2.0);
  const world={world3d:true,regionId:item.region,halfW:1500,len:3000,ground:['#b6bf98','#9ca981'],path:'#c5b68d',spots:[],segments:[],props:[],areas:[],marks:[],terrain:null};
  const view={world,player:{x:0,z:500,heading:0},party:[],residents:[],camera:{x:0,z:500,yaw,dist,height:1},env:{time:'day',weather:'sunny',season:'summer'},mood:{},frame:1};
  renderer.draw(view,0);return {active:renderer.is3D,stats:renderer.stats3d(),camera:view.camera};
 },item);
 if(!result.active||errors.length)throw Error(JSON.stringify(errors));
 await page.screenshot({path:path.join(OUT,item.name+'.jpg'),type:'jpeg',quality:90});console.log(item.name,JSON.stringify({active:result.active,triangles:result.stats.triangles,calls:result.stats.calls,camera:result.camera}));
 }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
