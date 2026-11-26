import {usesAutumnLeaves,paintAutumnLeaves} from './home-autumn-leaves.mjs?v=059657479bfe';
import {extendVisibleGroundNavigation} from './home-visible-ground-navigation.mjs?v=3a36d9ce7eab';
import {createDayparts,atmosphere,DAYPARTS} from './home-dayparts.mjs';
import {fallingKind,paintFalling,paintWeatherVeil} from './home-atmosphere-fx.mjs';
import {paintLiving} from './living/living.mjs';
import {layersFor,createClimate} from './home-climate.mjs';
import {ART_CANDIDATES,selectRecoveredScene} from './home-production-manifest.mjs';
import {artTransform,paintBackdrop,backdropComposition} from './home-production-transform.mjs';
import {createRecoveredNavigation} from './home-recovered-navigation.mjs?v=57267701d610';
// Use the ground line shared by each region's four daypart paintings. Keep
// the artwork uniform across the complete walking frame. Only the remaining
// source foreground under the controls can be resampled, by at most 1.4×.
export function forestGroundCrop(host,frameTop,frameBottom){
 const horizon=.56;
 if(!Number.isFinite(frameTop+frameBottom)||frameTop>=frameBottom)return null;
 const groundY=frameTop-host.top+24;
 const footer=Math.min(host.height,frameBottom-host.top+4);
 const coverHeight=Math.max(host.width*1.5,host.height);
 const height=Math.max(coverHeight,(footer-groundY+(host.height-footer)/1.4)/(1-horizon));
 const width=height/1.5;
 return {left:(host.width-width)/2,top:Math.min(0,groundY-horizon*height),width,height,footer};
}
function paintCover(context,image,rect,host){
 context.drawImage(image,rect.left,rect.top,rect.width,rect.height);
 if(rect.footer==null||rect.footer>=host.height||rect.top+rect.height>=host.height)return;
 const sourceTop=(rect.footer-rect.top)/rect.height*image.naturalHeight;
 context.drawImage(image,0,sourceTop,image.naturalWidth,image.naturalHeight-sourceTop,
  rect.left,rect.footer,rect.width,host.height-rect.footer);
}
export function createHomeWorld(options){
 const {container,document:doc,window:win=window,onStatus=()=>{}}=options;
 const painting=doc.createElement('canvas');let paintingKey='';
 // The finished backdrop — painting, weather veil and the living layer — is kept here and
 // refreshed at its own pace. Leaves, rain, snow and petals are drawn over a copy at 30 fps.
 const backdrop=doc.createElement('canvas'),ctx=backdrop.getContext('2d');let lastFrame='';
 // 'living' adds swaying plants, water and light; 'falling' keeps only the falling layers;
 // 'maximum' drives the living layer at full strength with wind, flow, glitter and fireflies;
 // 'final' is the calm living layer with seamless plant sway and independent lights.
 const fxMode=options.environmentFx||win.NaotocchiEnvironmentFx||'final',wantLiving=fxMode!=='falling',maximum=fxMode==='maximum',final=fxMode==='final';
 // How trees move in the final mode. A function lets the comparison switch it while running.
 const treeSway=()=>(typeof options.treeSway==='function'?options.treeSway():options.treeSway)||win.NaotocchiTreeSway||'tips2';
 // Wind and particle amounts drift over time, differently on every visit. `options.climate()`
 // lets the trial page pin a level, speed time up, or supply measured weather.
 const climate=createClimate((Math.random()*2147483647)|0),pinned=()=>(typeof options.climate==='function'?options.climate():options.climate)||win.NaotocchiClimate||{};
 let air={wind:1};
 const windBoost=()=>Number(typeof options.wind==='function'?options.wind():options.wind)||0;
 // Repaint interval of the living layer. It follows the frame pacing the whole home achieves:
 // slow frames step it down and finally off, sustained smooth frames step it back up.
 const PACES=[33,66,100,160];let level=1,pace=34,slowFor=0,fastFor=0,holdUp=8,clock=0,raised=-99;
 // The home steps at 30 fps (15 on the lightest tier); `nominal` is that interval in ms.
 function follow(dt,nominal){if(!(dt>0)||dt>.25)return;clock+=dt;
  // Start-up frames and single long hitches say nothing about the steady pace.
  if(clock<6)return;pace=pace*.95+Math.min(dt,.12)*50;
  slowFor=pace>nominal*1.3?slowFor+dt:0;fastFor=pace<nominal*1.12?fastFor+dt:0;
  if(slowFor>2.5&&level<PACES.length){level++;slowFor=0;fastFor=0;if(clock-raised<20)holdUp=Math.min(120,holdUp*2);}
  else if(fastFor>holdUp&&level>0){level--;fastFor=0;slowFor=0;raised=clock;}
  win.NaotocchiEnvironmentStats={level,interval:PACES[level]||0,pace};}
 const dayparts=createDayparts(win);let fade=null,fxKey='';
 const fx=doc.createElement('div');fx.className='home-dayparts-fx';container.appendChild(fx);
 const canvas=doc.createElement('canvas');canvas.className='home-art-canvas';container.appendChild(canvas);const screen=canvas.getContext('2d');
 let portraitCrop=null;
 let env={},spec=null,img=null,loaded=false,error=null,generation=0,time=0,dead=false,nav=null,navKey='',revision=0,lastPaint='';
 const displayRect=e=>win.NaotocchiHomeViewport?.presentationRect?.(e)||e.getBoundingClientRect();
 const geometry=()=>{const host=displayRect(container),r=displayRect(doc.getElementById('castStage'));return {host,stage:{left:r.left-host.left,top:r.top-host.top,width:r.width,height:r.height}};};
 // Unknown regions already resolve to the recovered Home painting.
 function setEnvironment(e){if(dead)return;env={...e};const selected=selectRecoveredScene(e.region);
  canvas.style.display='';fx.hidden=false;dayparts.select(e.region,e.time);
  if(spec===selected)return;
  spec=selected;portraitCrop=null;error=null;nav=null;navKey='';lastPaint='';revision++;const token=++generation;
  // Keep the previous successful painting visible while either new image loads.
  const next=new win.Image();next.decoding='async';next.onload=()=>{if(dead||token!==generation||dayparts.frame(0).image)return;img=next;loaded=true;lastPaint='';onStatus('art-25d');};
  next.onerror=()=>{if(dead||token!==generation)return;error='旧背景画像を読み込めませんでした';};
  next.src=ART_CANDIDATES.find(a=>a.id===spec.candidate).src;onStatus(loaded?'art-25d':'art-25d-loading');
 }

 function navigation(rect){
  if(!spec)return null;
  const viewport=win.visualViewport,stableGrid=doc.body?.dataset?.homeDisplayVersion==='18'&&(viewport?.width||win.innerWidth)<=(viewport?.height||win.innerHeight);
  const {host}=geometry(),stage={left:rect.left-host.left,top:rect.top-host.top,width:rect.width,height:rect.height};
  const p=win.NaotocchiHomeViewport?.residentPresentation?.(),real=container.getBoundingClientRect();
  const addVisible=stableGrid&&p&&!p.landscape&&doc.body.dataset.homeViewportVersion==='12'&&doc.body.dataset.homeTinyOverview==='true';
  const width=Math.max(real.width,real.height/1.5),height=width*1.5,cover={left:real.left+(real.width-width)/2,top:real.top+(real.height-height)/2,width,height};
  const selectedLayout=win.homeForestLayout;
  const crop=addVisible&&spec.region==='forest'&&(!selectedLayout||selectedLayout==='BEST')
   ?forestGroundCrop(real,p.y,doc.querySelector?.('.screen-frame')?.getBoundingClientRect().bottom):null;
  const floorCover=crop?{...crop,left:real.left+crop.left,top:real.top+crop.top}:cover;
  const key=JSON.stringify([env.region,host.width,host.height,stage,stableGrid,addVisible&&[p.x,p.y,p.scaleX,p.scaleY,floorCover]]);
  if(key!==navKey){
   navKey=key;portraitCrop=crop;const paintedProjection=addVisible ? q=>({
     x:(p.x+(rect.left+q.x-p.x)*p.scaleX-floorCover.left)/floorCover.width,
     z:(p.y+(rect.top+q.y-p.y)*p.scaleY-floorCover.top)/floorCover.height
   }) : null;
   const legacy=createRecoveredNavigation(spec,host,stage,{stableGrid,expandCity:stableGrid,staticGeometry:true,paintedProjection});
   nav=addVisible?extendVisibleGroundNavigation(legacy,{spec,stage:rect,presentation:p,cover:floorCover}):legacy;
   revision++;lastPaint='';
  }
  return nav;
 }
 function draw(dt,flags={}){if(dead||flags.paused)return;if(!spec)return;
  fade=dayparts.frame(dt,flags.reducedMotion);if(fade.image){img=fade.image;loaded=true;onStatus('art-25d');}error=fade.error;
  if(!flags.reducedMotion)time+=Math.max(0,Math.min(1,Number(dt)||0))*1000;
  const mood=atmosphere(env),night=env.time==='night';
  const layers=layersFor(env),held={measured:env.conditions,...pinned()},clock=time/1000;
  const amount=(kind,at)=>climate.density(kind,at,env,held);
  air={wind:climate.wind(clock,env,held),rain:amount('rain',clock),snow:amount('snow',clock),petal:amount('petal',clock),leaf:amount('leaf',clock),layers};options.onClimate?.(air);
  const leafScene=!flags.reducedMotion&&layers.leaves>0,falls=!flags.reducedMotion&&(leafScene||!!layers.precipitation||layers.petals>0);
  if(wantLiving&&!flags.reducedMotion)follow(Number(dt)||0,flags.tier>=2?66:33);
  const living=wantLiving&&level<PACES.length;
  const fullBackdrop=doc.body.dataset.homeViewportVersion==='12'&&doc.body.dataset.homeTinyOverview==='true';
  const native=geometry(),host=fullBackdrop?container.getBoundingClientRect():native.host,stage=native.stage;
  const v15=['15','16','17','18'].includes(doc.body.dataset.homeDisplayVersion),v14=v15||doc.body.dataset.homeDisplayVersion==='14';
  const contain=fullBackdrop&&['13','14','15','16','17','18'].includes(doc.body.dataset.homeDisplayVersion)&&win.NaotocchiHomeViewport?.residentPresentation?.()?.landscape;
  const cover=(fullBackdrop&&!contain&&portraitCrop)||backdropComposition(host,stage).cover,cw=v14?host.height/1.5:Math.min(host.width,host.height/1.5);
  const t=contain?{width:cw,height:cw*1.5,left:(host.width-cw)/2,top:(host.height-cw*1.5)/2}:fullBackdrop?cover:artTransform(host,stage),stamp=JSON.stringify([fullBackdrop,contain,host.width,host.height,t.top,t.footer,env.time,env.weather,env.season,loaded,img?.src,fade.alpha,flags.reducedMotion,living,Math.floor(time/(living&&!flags.reducedMotion?PACES[level]:120))]),frame=falls?String(Math.floor(time/33)):'';if(stamp===lastPaint&&frame===lastFrame)return;
  const dpr=Math.min(2,win.devicePixelRatio||1),W=Math.round(host.width*dpr),H=Math.round(host.height*dpr);if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;lastPaint='';}
  if(stamp!==lastPaint){lastPaint=stamp;if(backdrop.width!==W||backdrop.height!==H){backdrop.width=W;backdrop.height=H;}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=contain&&v15?'#ffffff':contain&&v14?'#eee8dc':env.region==='city'?'#ac8c90':env.region==='forest'?'#173d35':'#b5d4d9';ctx.fillRect(0,0,host.width,host.height);
  if(loaded&&img){
  const key=JSON.stringify([fullBackdrop,contain,generation,W,H,t.left,t.top,t.width,t.height,t.footer,stage.top,stage.height,img?.src]);
  if(key!==paintingKey){paintingKey=key;painting.width=W;painting.height=H;const pc=painting.getContext('2d');pc.setTransform(dpr,0,0,dpr,0,0);if(contain){
    // Same image supplies edge colours; the complete original remains sharp.
    if(!v14){pc.save();pc.filter='blur(18px)';pc.drawImage(img,cover.left-20,cover.top-20,cover.width+40,cover.height+40);pc.restore();}
    pc.drawImage(img,t.left,t.top,t.width,t.height);
   }else if(fullBackdrop)paintCover(pc,img,t,host);else paintBackdrop(pc,img,host,stage);}
  if(fade.previous&&fade.alpha<1){
   ctx.save();if(contain||fullBackdrop)paintCover(ctx,fade.previous,t,host);else paintBackdrop(ctx,fade.previous,host,stage);ctx.restore();
   ctx.save();ctx.globalAlpha=fade.alpha;ctx.drawImage(painting,0,0,host.width,host.height);ctx.restore();
  }else ctx.drawImage(painting,0,0,host.width,host.height);
  doc.body.style.setProperty('--dayparts-shadow',mood.cloud?'.48':'.8');
  // A pale, graduated weather veil preserves luminous highlights at night.
  if(fade.image)paintWeatherVeil(ctx,t,env,mood);
  const fk=JSON.stringify([env.region,env.weather,env.season,env.time,flags.reducedMotion,flags.tier]);
  if(fk!==fxKey){fxKey=fk;const model=win.NaotocchiWorldScene?.resolveScene?.(env);fx.innerHTML=model?win.NaotocchiWorldScene.sceneMarkup({...model,water:null,particle:living||fallingKind(mood)||mood.particle==='leaf'?'none':mood.particle},{tier:flags.tier,reducedMotion:flags.reducedMotion}).atmosphere:'';fx.dataset.region=env.region;fx.dataset.frost=String(mood.frost);}
  Object.assign(fx.style,{left:t.left+'px',top:t.top+'px',width:t.width+'px',height:t.height+'px'});
  // A representative painting is retained. This restrained overlay is not a
  // claim that baked sunset/sunbeams have become a completed night artwork.
  if(!fade.image&&(env.time==='night'||env.weather==='rain')){ctx.fillStyle=env.time==='night'?'rgba(21,30,73,.24)':'rgba(38,57,78,.15)';if(contain&&v15)ctx.fillRect(t.left,t.top,t.width,t.height);else ctx.fillRect(0,0,host.width,host.height);}
  if(living&&fade.image)paintLiving(ctx,t,fade,time/1000,env,flags.reducedMotion,{maximum,final,treeSway:treeSway(),wind:windBoost(),daySource:region=>DAYPARTS[region]?.day,layers,level:air.wind,document:doc});
  else if(!flags.reducedMotion){ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<7;i++){const u=.18+(i*.117)% .65,v=spec.accent==='water'?.28+(i%3)*.035:.16+(i%4)*.13,x=(contain?t.left:0)+u*t.width,y=t.top+v*t.height+Math.sin(time/2400+i)*3;ctx.globalAlpha=.08+.12*(.5+.5*Math.sin(time/1500+i));ctx.fillStyle=spec.accent==='glow'?'#ffdb9b':'#fffad4';ctx.beginPath();ctx.ellipse(x,y,spec.accent==='water'?7:1.4,spec.accent==='water'?1:1.4,0,0,Math.PI*2);ctx.fill();}ctx.restore();}
  }}
  lastFrame=frame;screen.setTransform(1,0,0,1,0,0);screen.drawImage(backdrop,0,0);
  if(!falls||!loaded||!img)return;
  screen.setTransform(dpr,0,0,dpr,0,0);
  if(leafScene){
   const layer=(picture,opacity)=>{
    const scene=picture?.src?.match(/\/([a-z_]+)-(morning|day|evening|night)\.webp(?:\?|$)/);
    const share=scene?layersFor({...env,region:scene[1],time:scene[2]}).leaves:0;
    if(opacity>0 && share>0)
     paintAutumnLeaves(screen,t,scene[1],scene[2],time/1000,opacity,at=>share*amount('leaf',at));
   };
   if(fade.previous)layer(fade.previous,1-fade.alpha);
   layer(fade.image,fade.alpha);
  }
  paintFalling(screen,t,env,mood,time/1000,{tier:flags.tier,document:doc,lively:maximum,layers,amount});
 }
 return {pointIndependentOcclusion:true,setEnvironment,navigation,draw,observationPoints(n){return spec.points.map(([x,z,action,tag])=>({...n.project({x,z}),activity:action,id:'art-'+env.region+'-'+tag,tag,target:n.project({x:x+.02,z:z-.04})})).filter(p=>n.valid(p));},
  occlusion(p){if(!spec||!nav)return [];const {host,stage}=geometry();
   if(['17','18'].includes(doc.body.dataset.homeDisplayVersion)&&doc.body.dataset.homeTinyOverview==='true'){
    // Match the displayed painting, then invert only the resident presentation.
    // Native navigation, floor polygons and sprite foot coordinates are unchanged.
    const real=container.getBoundingClientRect(),vp=win.NaotocchiHomeViewport;
    const landscape=vp?.residentPresentation?.()?.landscape;
    const terrain=portraitCrop||backdropComposition(real,stage).cover;
    const width=landscape?real.height/1.5:terrain.width,height=width*1.5;
    const left=real.left+(real.width-width)/2,top=real.top+(landscape?(real.height-height)/2:terrain.top);
    return spec.foreground.map(poly=>poly.map(([x,z])=>{const p=vp.unscalePoint({x:left+x*width,y:top+z*height});return [p.x-host.left,p.y-host.top];}));
   }
   const t=artTransform(host,stage);return spec.foreground.map(poly=>poly.map(([x,y])=>[t.left+x*t.width,t.top+y*t.height]));},
  stats:()=>({mode:'art-25d',region:env.region,candidate:spec?.candidate,loaded,error,destroyed:dead,animationTime:time,projectionRevision:revision,renderer:{mode:'canvas-2d-art',objects:spec?.foreground.length||0,images:loaded?1:0,decodedBytes:loaded?1024*1536*4:0}}),
  destroy(){dead=true;generation++;dayparts.destroy();fx.remove();img=null;canvas.remove();}};
}
