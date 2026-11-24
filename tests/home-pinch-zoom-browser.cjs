// Pinch zoom is a view-only camera. This browser gate proves, per region,
// width and household size, that zooming leaves every layout/movement input
// byte-identical, that taps and drags land on the resident under the finger,
// and that 1.0x leaves no trace in the DOM.
// Chromium uses real multi-touch (CDP). WebKit has no multi-touch driver, so
// it receives the same two-pointer sequence as synthetic touch PointerEvents.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const REGIONS=['home','forest','river_lake','city','countryside','mountain','snow','sea','jungle','desert','deepsea','star_stop','memory_lake'];
const full=process.env.HOME_ZOOM_MATRIX==='full';
const WIDTHS=full?[320,375,390,430]:[320,390],COUNTS=full?[1,2,5,10,28]:[1,5,28];
const engines=(process.env.HOME_LAYOUT_ENGINES||'chromium,webkit').split(',');
const output=path.resolve('test-results/home-pinch-zoom');fs.mkdirSync(output,{recursive:true});
let root=process.env.HOME_ZOOM_ROOT;
if(!root){root=fs.mkdtempSync(path.join(os.tmpdir(),'home-zoom-'));execFileSync('python3',['tools/pages/package.py','--out',root,'--report',path.join(output,'package.json')],{stdio:'inherit'});}
execFileSync(process.execPath,['tools/home-cast-size-qa.cjs',root],{stdio:'inherit'});
{// Read-only test hook: region/time selection and model inspection.
 const file=path.join(root,'qa-cast-script.js');let s=fs.readFileSync(file,'utf8');const mark='HomeCastSizeQA.set();\n})();';assert.ok(s.endsWith(mark));
 fs.writeFileSync(file,s.slice(0,-mark.length)+"HomeCastSizeQA.set();\nwindow.__zoomQA={scene(region,time,count){HomeCastSizeQA.set({count});state.regionId=region;state.lifetime.timeMode=time;homeCastLayoutKey='';render();homeDiorama.sync();window.dispatchEvent(new Event('resize'));},model:()=>homeDiorama.model,nav:()=>homeDiorama.inspectScene()?.navigation};\n})();");}
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.m4a':'audio/mp4'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(path.resolve(root)+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});

const inspect=()=>{const m=__zoomQA.model(),st=document.getElementById('castStage'),fr=st.closest('.screen-frame'),w=document.querySelector('.home-living-world');
 const css=e=>e?e.getAttribute('style')||'':'';
 return {zoom:NaotocchiHomeZoom.state().zoom,
  inputs:JSON.stringify({presentation:NaotocchiHomeViewport.residentPresentation(),stage:NaotocchiHomeViewport.presentationRect(st),scroll:[fr.scrollTop,fr.scrollLeft],bounds:m.snapshot().map(a=>[a.key,a.w,a.h,m.bounds(a)]),envelope:st.__homeResidentEnvelope||null,vars:['--home-center-scroll','--home-center-overflow','--home-v12-content-height'].map(k=>document.body.style.getPropertyValue(k))}),
  dom:JSON.stringify({stage:css(st),frame:css(fr),world:[...(w?.children||[])].map(css),label:css(st.querySelector('.diorama-selected-label')),flag:document.body.dataset.homeZoom||''})};};
const visible=()=>{const f=document.querySelector('.screen-frame').getBoundingClientRect();
 return __zoomQA.model().snapshot().map(a=>{const e=document.querySelector('[data-diorama-actor="'+a.key+'"]'),im=e?.querySelector('.character-asset')||e;if(!im)return null;const r=im.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height*.62;
  return x>f.left+16&&x<f.right-16&&y>f.top+16&&y<f.bottom-16?{key:a.key,x,y}:null;}).filter(Boolean);};

async function run(name,engine){
 const browser=await engine.launch({headless:true}),failures=[],rows=[];
 try{for(const width of WIDTHS){
  const context=await browser.newContext({viewport:{width,height:width===320?568:width===375?667:width===390?844:932},deviceScaleFactor:2,hasTouch:true,isMobile:name!=='firefox'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/qa-cast.html?count=5`,{waitUntil:'load'});
  await page.waitForFunction(()=>window.__zoomQA&&window.NaotocchiHomeZoom&&__zoomQA.nav(),null,{timeout:60000});
  const cdp=name==='chromium'?await context.newCDPSession(page):null;
  // fingers: [[x,y],...] currently down; diffed against the previous set.
  let held=[];
  const fingers=async next=>{
   if(cdp){const type=next.length>held.length?'touchStart':next.length<held.length?'touchEnd':'touchMove';await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:next.map((p,i)=>({x:p[0],y:p[1],id:i,radiusX:8,radiusY:8,force:1}))});}
   else await page.evaluate(([prev,next])=>{const fire=(type,i,p)=>{const t=document.elementFromPoint(p[0],p[1])||document.body;t.dispatchEvent(new PointerEvent(type,{pointerId:100+i,pointerType:'touch',isPrimary:i===0,clientX:p[0],clientY:p[1],bubbles:true,cancelable:true,composed:true,button:type==='pointermove'?-1:0,buttons:type==='pointerup'?0:1}));};
     for(let i=0;i<Math.max(prev.length,next.length);i++){if(i>=prev.length)fire('pointerdown',i,next[i]);else if(i>=next.length)fire('pointerup',i,prev[i]);else if(prev[i][0]!==next[i][0]||prev[i][1]!==next[i][1])fire('pointermove',i,next[i]);}},[held,next]);
   held=next;await page.waitForTimeout(18);};
  const tap=async(x,y)=>{await fingers([[x,y]]);await page.waitForTimeout(30);await fingers([]);await page.waitForTimeout(90);};
  const pinch=async(cx,cy,from,to)=>{await fingers([[cx-from,cy]]);await fingers([[cx-from,cy],[cx+from,cy]]);for(let i=1;i<=8;i++){const d=from+(to-from)*i/8;await fingers([[cx-d,cy],[cx+d,cy]]);}await fingers([]);await page.waitForTimeout(120);};
  const relayout=()=>page.evaluate(()=>new Promise(r=>{document.getElementById('castStage').dispatchEvent(new CustomEvent('home-paint-envelope'));requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r)));}));
  for(const region of REGIONS)for(const count of COUNTS){
   const label=[name,width,region,count].join('/'),fail=m=>failures.push(label+': '+m);
   await page.evaluate(([r,c])=>{NaotocchiHomeZoom.reset(false);__zoomQA.scene(r,r==='city'?'night':'day',c);},[region,count]);
   await page.waitForFunction(c=>__zoomQA.nav()&&__zoomQA.model().snapshot().length===c&&document.querySelectorAll('[data-diorama-actor]').length>=c,count,{timeout:30000});
   await page.waitForTimeout(450);await relayout();
   const before=await page.evaluate(inspect),nav=await page.evaluateHandle(()=>__zoomQA.nav());
   const frame=await page.evaluate(()=>{const r=document.querySelector('.screen-frame').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
   await pinch(frame.x,frame.y,22,70);
   const zoomed=await page.evaluate(inspect);
   if(!(zoomed.zoom>1.5))fail('pinch did not zoom: '+zoomed.zoom);
   await relayout();
   const afterLayout=await page.evaluate(inspect);
   if(afterLayout.inputs!==before.inputs)fail('layout/movement inputs changed under zoom');
   if(!await page.evaluate(n=>n===__zoomQA.nav(),nav))fail('navigation was rebuilt under zoom');
   // Every zoomed tap must choose exactly what the same world point chooses at
   // 1.0x (the existing front-most rule), for residents that are standing still.
   let taps=0,hits=0;const probes=[];
   for(const a of (await page.evaluate(visible)).slice(0,6)){await tap(a.x,a.y);probes.push(await page.evaluate(a=>{const z=NaotocchiHomeZoom.state(),m=__zoomQA.model();return {...a,wx:(a.x-z.x)/z.zoom,wy:(a.y-z.y)/z.zoom,got:m.selected(),still:!m.snapshot().some(b=>b.target)};},a));}
   const view=await page.evaluate(()=>NaotocchiHomeZoom.state());
   await page.evaluate(()=>NaotocchiHomeZoom.reset(false));
   for(const q of probes){await tap(q.wx,q.wy);const want=await page.evaluate(()=>({key:__zoomQA.model().selected(),still:!__zoomQA.model().snapshot().some(b=>b.target)}));if(!q.still||!want.still)continue;taps++;if(q.got===want.key)hits++;else fail('zoomed tap on '+q.key+' selected '+q.got+', same point at 1.0x selects '+want.key);}
   await page.evaluate(v=>NaotocchiHomeZoom.set(v.zoom,v.x,v.y),view);await page.waitForTimeout(60);
   // A second finger on a held resident must never start a manual move.
   const held1=(await page.evaluate(visible))[0];
   if(held1){await fingers([[held1.x,held1.y]]);await fingers([[held1.x,held1.y],[held1.x+50,held1.y+30]]);for(let i=1;i<=5;i++)await fingers([[held1.x-i*5,held1.y],[held1.x+50+i*5,held1.y+30]]);await fingers([]);await page.waitForTimeout(80);
    const manual=await page.evaluate(()=>__zoomQA.model().snapshot().filter(a=>a.target&&a.source!=='ambient').map(a=>a.key+':'+a.source));if(manual.length)fail('two-finger gesture moved '+manual);}
   // Two-finger tap returns to 1.0x and leaves the DOM untouched.
   await fingers([[frame.x-30,frame.y],[frame.x+30,frame.y+10]]);await page.waitForTimeout(40);await fingers([]);await page.waitForTimeout(420);await relayout();
   const after=await page.evaluate(inspect);
   if(after.zoom!==1)fail('reset left zoom '+after.zoom);
   if(after.inputs!==before.inputs)fail('inputs differ after reset');
   if(after.dom!==before.dom&&JSON.parse(after.dom).flag!==''||JSON.stringify({...JSON.parse(after.dom),label:0})!==JSON.stringify({...JSON.parse(before.dom),label:0}))fail('1.0x DOM differs after reset: '+after.dom.slice(0,300)+' vs '+before.dom.slice(0,300));
   rows.push({width,region,count,zoom:zoomed.zoom,taps,hits});await nav.dispose();
  }
  // Region change returns to the normal view.
  await page.evaluate(()=>{__zoomQA.scene('forest','day',5);});await page.waitForTimeout(500);
  await page.evaluate(()=>{const r=document.querySelector('.screen-frame').getBoundingClientRect();NaotocchiHomeZoom.zoomAt(r.left+r.width/2,r.top+r.height/2,1.8);});
  assert.ok((await page.evaluate(()=>NaotocchiHomeZoom.state().zoom))>1.7,'programmatic zoom');
  await page.evaluate(()=>{state=null;}).catch(()=>{});
  await page.evaluate(()=>{document.body.classList.remove('region-forest');document.body.classList.add('region-sea');});await page.waitForTimeout(120);
  if((await page.evaluate(()=>NaotocchiHomeZoom.state().zoom))!==1)failures.push(name+'/'+width+': region change kept zoom');
  if(errors.length)failures.push(name+'/'+width+' page errors: '+errors.slice(0,3).join(' | '));
  await context.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(output,name+'.json'),JSON.stringify({rows,failures},null,1));
 const taps=rows.reduce((n,r)=>n+r.taps,0),hits=rows.reduce((n,r)=>n+r.hits,0);
 console.log(`${name}: ${rows.length} conditions, zoomed taps ${hits}/${taps}, failures ${failures.length}`);
 return failures;
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const pw=require('playwright');let failures=[];
 try{for(const name of engines)failures=failures.concat(await run(name,pw[name]));}finally{server.close();}
 if(failures.length){console.error(failures.slice(0,40).join('\n'));process.exit(1);}
})();
