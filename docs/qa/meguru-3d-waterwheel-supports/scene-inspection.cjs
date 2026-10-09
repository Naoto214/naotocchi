// Static World-prop inspection in the complete production scene. Actor-free fixture;
// no tree/object removal, no fade, no gameplay visibility/performance claims.
// node scene-inspection.cjs <sourceRoot> <outputDir>
const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto'),pw=require('playwright');
const ROOT=path.resolve(process.argv[2]),OUT=path.resolve(process.argv[3]);fs.mkdirSync(OUT,{recursive:true});
const {harness}=require(path.join(ROOT,'tests/helpers/runtime-harness.cjs'));
const h=harness({deterministic:true,fullDisplay:true,pinDate:true}),M=h.api.meguruMod,registry=M.buildRegistry();
const selection=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../tools/meguru-3d-qa/shots-visual-quality-v2-gallery.json'))).filter(x=>['prop-wheel','prop-wheel-river'].includes(x.name));
if(selection.length!==2)throw Error('Expected both production waterwheels');
const items=selection.map(s=>{const world=M.buildWorld(s.region,registry,{world3d:true});const pack=M.worldObjects3d(world),objects=pack.objects;const ob=objects.find(o=>o.id===s.target);if(!ob)throw Error('Missing '+s.target);return {name:s.name,world,pack,streams:M.streams3d(world),ob,objects:objects.length,targetSha256:crypto.createHash('sha256').update(JSON.stringify(ob)).digest('hex')};});
const html='<!doctype html><style>body{margin:0}</style><canvas width="720" height="720"></canvas><script src="/meguru.js"></script>';
(async()=>{
 const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}const f=path.resolve(ROOT,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.statusCode=404;return res.end();}res.setHeader('Content-Type',/\.m?js$/.test(f)?'text/javascript':'application/octet-stream');fs.createReadStream(f).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await pw.chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM,args:['--use-gl=angle','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:720,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/.test(m.text()))errors.push(m.text());});await page.goto('http://127.0.0.1:'+server.address().port);
  const records=[];
  for(const item of items)for(let side=0;side<4;side++){
   const record=await page.evaluate(async({item,side})=>{
    if(window.inspectionRenderer)window.inspectionRenderer.destroy();
    const mod=installNaotocchiMeguru({getState:()=>({lifetime:{}})}),canvas=document.querySelector('canvas');
    // Reuse complete source-generated descriptors/streams, as object-gallery does.
    // Browser-side regeneration in the initial fixture returned fewer objects; retain canonical data.
    // Actor painting alone is disabled. No scene descriptor is filtered or transformed.
    const proxy={...mod,worldObjects3d:()=>item.pack,streams3d:()=>item.streams,ACTOR_SIZE:0,spriteFor:()=>null,createCanvasRenderer:()=>({draw(){},resize(){},destroy(){}})};
    const {createMeguru3D}=await import('/meguru-3d.mjs');const renderer=createMeguru3D(proxy,{onFallback:e=>{throw e;}})({canvas,ctx:null,W:720,H:720});window.inspectionRenderer=renderer;
    renderer.setOccluderFade(false);renderer.setAdaptiveDpr(false);renderer.setAnimLevel(0);
    const ob=item.ob,yaw=(ob.collision?.ang||ob.rot||0)-Math.PI/2+0.45+side*Math.PI/2;
    const view={world:item.world,player:{x:ob.x,z:ob.z,heading:0},party:[],residents:[],camera:{x:ob.x,z:ob.z,yaw,dist:150,height:1},env:{time:'day',weather:'sunny',season:'summer'},mood:{},frame:1};
    renderer.draw(view,0);const stats=renderer.stats3d();return {active:renderer.is3D,triangles:stats.triangles,calls:stats.calls,camera:view.camera,worldObjects:proxy.worldObjects3d(item.world).objects.length};
   },{item,side});
   if(!record.active||record.worldObjects!==item.objects||errors.length)throw Error(JSON.stringify({record,errors}));
   const name=item.name+'-'+side;await page.screenshot({path:path.join(OUT,name+'.jpg'),type:'jpeg',quality:90});records.push({name,region:item.world.regionId,target:item.ob.id,targetSha256:item.targetSha256,...record});console.log(name,JSON.stringify(record));
  }
  fs.writeFileSync(path.join(OUT,'inspection.json'),JSON.stringify({fixture:'actor-free static complete world; no occluder fade; not gameplay or performance QA',errors,records},null,2)+'\n');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
