import {usesAutumnLeaves,paintAutumnLeaves} from './home-autumn-leaves.mjs?v=059657479bfe';
import {extendVisibleGroundNavigation} from './home-visible-ground-navigation.mjs?v=3a36d9ce7eab';
import {createDayparts,atmosphere} from './home-dayparts.mjs';
import {fxMarkup,paintWeatherVeil} from './home-atmosphere-fx.mjs';
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
 const dayparts=createDayparts(win);let fade=null,fxKey='';
 const fx=doc.createElement('div');fx.className='home-dayparts-fx';container.appendChild(fx);
 const canvas=doc.createElement('canvas');canvas.className='home-art-canvas';container.appendChild(canvas);const ctx=canvas.getContext('2d');
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
  const leafScene=usesAutumnLeaves(env.region,env.time,env);
  const fullBackdrop=doc.body.dataset.homeViewportVersion==='12'&&doc.body.dataset.homeTinyOverview==='true';
  const native=geometry(),host=fullBackdrop?container.getBoundingClientRect():native.host,stage=native.stage;
  const v15=['15','16','17','18'].includes(doc.body.dataset.homeDisplayVersion),v14=v15||doc.body.dataset.homeDisplayVersion==='14';
  const contain=fullBackdrop&&['13','14','15','16','17','18'].includes(doc.body.dataset.homeDisplayVersion)&&win.NaotocchiHomeViewport?.residentPresentation?.()?.landscape;
  const cover=(fullBackdrop&&!contain&&portraitCrop)||backdropComposition(host,stage).cover,cw=v14?host.height/1.5:Math.min(host.width,host.height/1.5);
  const t=contain?{width:cw,height:cw*1.5,left:(host.width-cw)/2,top:(host.height-cw*1.5)/2}:fullBackdrop?cover:artTransform(host,stage),stamp=JSON.stringify([fullBackdrop,contain,host.width,host.height,t.top,t.footer,env.time,env.weather,env.season,loaded,img?.src,fade.alpha,flags.reducedMotion,Math.floor(time/(leafScene&&!flags.reducedMotion?33:120))]);if(stamp===lastPaint)return;lastPaint=stamp;
  const dpr=Math.min(2,win.devicePixelRatio||1),W=Math.round(host.width*dpr),H=Math.round(host.height*dpr);if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=contain&&v15?'#ffffff':contain&&v14?'#eee8dc':env.region==='city'?'#ac8c90':env.region==='forest'?'#173d35':'#b5d4d9';ctx.fillRect(0,0,host.width,host.height);
  if(!loaded||!img)return;
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
  const mood=atmosphere(env),night=env.time==='night';
  doc.body.style.setProperty('--dayparts-shadow',mood.cloud?'.48':'.8');
  // A pale, graduated weather veil preserves luminous highlights at night.
  if(fade.image)paintWeatherVeil(ctx,t,env,mood);
  const fk=JSON.stringify([env.region,env.weather,env.season,env.time,flags.reducedMotion,flags.tier]);
  if(!flags.reducedMotion && env.season==='autumn'){
   const layer=(picture,opacity)=>{
    const scene=picture?.src?.match(/\/([a-z_]+)-(morning|day|evening|night)\.webp(?:\?|$)/);
    if(opacity>0 && scene && usesAutumnLeaves(scene[1],scene[2],env))
     paintAutumnLeaves(ctx,t,scene[1],scene[2],time/1000,opacity);
   };
   if(fade.previous)layer(fade.previous,1-fade.alpha);
   layer(fade.image,fade.alpha);
  }
  if(fk!==fxKey){fxKey=fk;const markup=fxMarkup(env,mood,{tier:flags.tier,reducedMotion:flags.reducedMotion});
   if(markup==null){const model=win.NaotocchiWorldScene?.resolveScene?.(env);delete fx.dataset.fx;fx.innerHTML=model?win.NaotocchiWorldScene.sceneMarkup({...model,water:null,particle:mood.particle},{tier:flags.tier,reducedMotion:flags.reducedMotion}).atmosphere:'';}
   else{fx.dataset.fx='2';fx.innerHTML=markup;}
   fx.dataset.region=env.region;fx.dataset.time=env.time;fx.dataset.frost=String(mood.frost);}
  fx.style.setProperty('--h',t.height+'px');
  Object.assign(fx.style,{left:t.left+'px',top:t.top+'px',width:t.width+'px',height:t.height+'px'});
  // A representative painting is retained. This restrained overlay is not a
  // claim that baked sunset/sunbeams have become a completed night artwork.
  if(!fade.image&&(env.time==='night'||env.weather==='rain')){ctx.fillStyle=env.time==='night'?'rgba(21,30,73,.24)':'rgba(38,57,78,.15)';if(contain&&v15)ctx.fillRect(t.left,t.top,t.width,t.height);else ctx.fillRect(0,0,host.width,host.height);}
  if(!flags.reducedMotion){ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<7;i++){const u=.18+(i*.117)% .65,v=spec.accent==='water'?.28+(i%3)*.035:.16+(i%4)*.13,x=(contain?t.left:0)+u*t.width,y=t.top+v*t.height+Math.sin(time/2400+i)*3;ctx.globalAlpha=.08+.12*(.5+.5*Math.sin(time/1500+i));ctx.fillStyle=spec.accent==='glow'?'#ffdb9b':'#fffad4';ctx.beginPath();ctx.ellipse(x,y,spec.accent==='water'?7:1.4,spec.accent==='water'?1:1.4,0,0,Math.PI*2);ctx.fill();}ctx.restore();}
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
