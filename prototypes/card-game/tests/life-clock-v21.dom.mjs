// DOM + CSS geometry model, not a browser rendering/Safari test.
import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {mountLifeClock} from '../life-clock-view.mjs';import {renderClock,renderBack} from '../life-clock-render.mjs';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_PATH);
const dom=new JSDOM('<button data-life-clock></button><dialog></dialog>',{pretendToBeVisual:true}),w=dom.window,d=w.document;
globalThis.document=d;w.matchMedia=()=>({matches:true});
const dialog=d.querySelector('dialog');dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new w.Event('close'));};
const view={round:1,humanSeat:'A',mode:'cpu',players:{A:{time:1,growth:20},B:{time:0,growth:20}}},before=JSON.stringify(view);
const clock=mountLifeClock({dialog,getView:()=>view,onPause(){},onResume(){},loadRenderer:async()=>({renderClock,renderBack,alignNumerals(){}})});
const stage=d.querySelector('.life-clock-stage'),scene=d.querySelector('.life-clock-scene'),zoom=d.querySelector('#life-clock-zoom');
let width=520,height=180,left=47,top=90,sx=0,sy=0,time=0;
const scale=()=>dialog.classList.contains('life-clock-zoomed')?Number(scene.style.getPropertyValue('--clock-zoom-scale')):1;
Object.defineProperties(stage,{clientWidth:{get:()=>width},clientHeight:{get:()=>height},scrollLeft:{get:()=>sx,set:v=>{sx=Math.max(0,Math.min(width*(scale()-1),v));}},scrollTop:{get:()=>sy,set:v=>{sy=Math.max(0,Math.min(height*(scale()-1),v));}}});
Object.defineProperties(scene,{clientWidth:{get:()=>width*scale()},clientHeight:{get:()=>height*scale()},offsetWidth:{get:()=>width*scale()},offsetHeight:{get:()=>height*scale()}});
stage.getBoundingClientRect=()=>({left,top,width,height,right:left+width,bottom:top+height});
scene.getBoundingClientRect=()=>({left:left-sx,top:top-sy,width:width*scale(),height:height*scale()});
// Actual clock uses square 1152x1152 viewBox in rectangular SVG viewport (xMidYMid meet).
function bounds(){const r=scene.getBoundingClientRect(),side=Math.min(r.width,r.height);return {x:r.left+(r.width-side)/2,y:r.top+(r.height-side)/2,side};}
function visible(label){const r=bounds();assert.ok(r.x<left+width&&r.x+r.side>left&&r.y<top+height&&r.y+r.side>top,label);}
function centered(label){const r=bounds();assert.ok(Math.abs(r.x+r.side/2-left-width/2)<1,label+' x');assert.ok(Math.abs(r.y+r.side/2-top-height/2)<1,label+' y');}
function event(type,x,y){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,button:0,isPrimary:true,clientX:x,clientY:y});Object.defineProperty(e,'timeStamp',{value:time+=30});scene.dispatchEvent(e);}
function double(){for(let i=0;i<2;i++){event('pointerdown',left+width/2,top+height/2);event('pointerup',left+width/2,top+height/2);}}
for(const [sw,sh]of [[520,180],[550,140],[296,220],[288,390],[343,470],[358,600],[398,680]]){
 width=sw;height=sh;await clock.open();visible('normal');const art=d.querySelector('#life-clock-face').innerHTML;
 zoom.click();assert.equal(zoom.textContent,'全体表示');visible('button zoom must not hide clock');centered('button zoom anchor');
 // Pan over all extents then return using the same control.
 for(const [x,y]of [[0,0],[width*scale(),0],[0,height*scale()],[width*scale(),height*scale()]]){stage.scrollLeft=x;stage.scrollTop=y;assert.ok(Number.isFinite(sx)&&Number.isFinite(sy));}
 zoom.click();assert.equal(sx,0);assert.equal(sy,0);visible('return to fit');assert.equal(zoom.textContent,'拡大');
 double();visible('double tap');centered('double tap anchor');assert.equal(zoom.textContent,'全体表示');
 d.querySelector('#life-clock-flip').click();assert.equal(d.querySelector('#life-clock-face').dataset.side,'back');visible('back zoom');d.querySelector('#life-clock-flip').click();visible('front zoom');
 // Rotate and apply safe-area/viewport offset changes while enlarged.
 width=550;height=140;left=59;top=74;w.dispatchEvent(new w.Event('resize'));visible('rotate enlarged');centered('rotate center');
 width=288;height=390;left=12;top=90;w.dispatchEvent(new w.Event('resize'));visible('portrait enlarged');centered('portrait center');
 double();assert.equal(zoom.textContent,'拡大');visible('double tap return');assert.equal(d.querySelector('#life-clock-face').innerHTML,art);clock.close();
}
// Check the actual non-reduced animation endpoints without claiming a rendered screenshot.
width=520;height=180;left=47;top=90;await clock.open();w.matchMedia=()=>({matches:false});let motion;
scene.animate=(frames,options)=>{motion={frames,options,cancel(){},onfinish:null};return motion;};
zoom.click();assert.equal(motion.options.duration,260);assert.equal(motion.frames[1].transform,'translate(-780px,-270px) scale(4)');motion.onfinish();visible('animated zoom commit');centered('animated zoom center');
zoom.click();motion.onfinish();visible('animated fit commit');assert.equal(zoom.textContent,'拡大');clock.close();
assert.equal(JSON.stringify(view),before);console.log('V21 geometry DOM PASS: 7 stage sizes, button/double tap zoom, pan bounds, fit return, front/back, portrait/landscape resize and viewport offsets; artwork and state unchanged');w.close();
