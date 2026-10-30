import {ART_CANDIDATES,selectRecoveredScene} from './home-production-manifest.mjs';
import {artTransform} from './home-art-navigation.mjs';
import {createRecoveredNavigation} from './home-recovered-navigation.mjs';
import {createHomeWorld as createLegacyWorld} from './home-world.mjs';
export function createHomeWorld(options){
 const {container,document:doc,window:win=window,onStatus=()=>{}}=options;
 const canvas=doc.createElement('canvas');canvas.className='home-art-canvas';container.appendChild(canvas);const ctx=canvas.getContext('2d');
 let env={},spec=null,img=null,loaded=false,error=null,generation=0,time=0,dead=false,nav=null,navKey='',revision=0,lastPaint='',legacy=null;
 const geometry=()=>{const host=container.getBoundingClientRect(),r=doc.getElementById('castStage').getBoundingClientRect();return {host,stage:{left:r.left-host.left,top:r.top-host.top,width:r.width,height:r.height}};};
 function setEnvironment(e){if(dead)return;env={...e};const selected=selectRecoveredScene(e.region);if(!selected){generation++;canvas.style.display='none';if(!legacy)legacy=createLegacyWorld(options);legacy.setEnvironment(e);return;}
  legacy?.destroy();legacy=null;canvas.style.display='';if(spec===selected&&loaded){onStatus('art-25d');return;}spec=selected;loaded=false;error=null;nav=null;navKey='';lastPaint='';time=0;revision++;const token=++generation;const next=new win.Image();next.decoding='async';next.onload=()=>{if(dead||token!==generation)return;img=next;loaded=true;lastPaint='';onStatus('art-25d');};next.onerror=()=>{if(dead||token!==generation)return;error='背景画像を読み込めませんでした';onStatus('unavailable',error);};next.src=ART_CANDIDATES.find(a=>a.id===spec.candidate).src;onStatus('art-25d-loading');
 }
 function navigation(rect){if(legacy)return legacy.navigation(rect);if(!spec)return null;const {host}=geometry(),stage={left:rect.left-host.left,top:rect.top-host.top,width:rect.width,height:rect.height},key=JSON.stringify([env.region,host.width,host.height,stage]);if(key!==navKey){navKey=key;nav=createRecoveredNavigation(spec,host,stage);revision++;lastPaint='';}return nav;}
 function draw(dt,flags={}){if(dead||flags.paused)return;if(legacy){legacy.draw(dt,flags);return;}if(!spec)return;
  if(!flags.reducedMotion)time+=Math.max(0,Math.min(1,Number(dt)||0))*1000;
  const {host,stage}=geometry(),t=artTransform(host,stage),stamp=JSON.stringify([host.width,host.height,t.top,env.time,env.weather,loaded,flags.reducedMotion,Math.floor(time/120)]);if(stamp===lastPaint)return;lastPaint=stamp;
  const dpr=Math.min(2,win.devicePixelRatio||1),W=Math.round(host.width*dpr),H=Math.round(host.height*dpr);if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=env.region==='city'?'#ac8c90':env.region==='forest'?'#173d35':'#b5d4d9';ctx.fillRect(0,0,host.width,host.height);
  if(!loaded||!img)return;ctx.drawImage(img,t.left,t.top,t.width,t.height);
  // A representative painting is retained. This restrained overlay is not a
  // claim that baked sunset/sunbeams have become a completed night artwork.
  if(env.time==='night'||env.weather==='rain'){ctx.fillStyle=env.time==='night'?'rgba(21,30,73,.24)':'rgba(38,57,78,.15)';ctx.fillRect(0,0,host.width,host.height);}
  if(!flags.reducedMotion){ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<7;i++){const u=.18+(i*.117)% .65,v=spec.accent==='water'?.28+(i%3)*.035:.16+(i%4)*.13,x=u*t.width,y=t.top+v*t.height+Math.sin(time/2400+i)*3;ctx.globalAlpha=.08+.12*(.5+.5*Math.sin(time/1500+i));ctx.fillStyle=spec.accent==='glow'?'#ffdb9b':'#fffad4';ctx.beginPath();ctx.ellipse(x,y,spec.accent==='water'?7:1.4,spec.accent==='water'?1:1.4,0,0,Math.PI*2);ctx.fill();}ctx.restore();}
 }
 return {setEnvironment,navigation,draw,observationPoints(n){return legacy?legacy.observationPoints(n):spec.points.map(([x,z,action,tag])=>({...n.project({x,z}),activity:action,id:'art-'+env.region+'-'+tag,tag,target:n.project({x:x+.02,z:z-.04})})).filter(p=>n.valid(p));},
  occlusion(p){if(legacy)return legacy.occlusion(p);if(!spec||!nav)return [];const {host,stage}=geometry(),t=artTransform(host,stage);return spec.foreground.map(poly=>poly.map(([x,y])=>[t.left+x*t.width,t.top+y*t.height]));},
  stats:()=>legacy?legacy.stats():({mode:'art-25d',region:env.region,candidate:spec?.candidate,loaded,error,destroyed:dead,animationTime:time,projectionRevision:revision,renderer:{mode:'canvas-2d-art',objects:spec?.foreground.length||0,images:loaded?1:0,decodedBytes:loaded?1024*1536*4:0}}),
  destroy(){dead=true;generation++;img=null;legacy?.destroy();canvas.remove();}};
}
