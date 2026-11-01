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
function pointer(type,id,x,y){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:id,pointerType:'touch',button:0,isPrimary:id===1,clientX:x,clientY:y});Object.defineProperty(e,'timeStamp',{value:time+=30});scene.dispatchEvent(e);}
function pinch(from,to){const cx=left+width/2,cy=top+height/2;pointer('pointerdown',1,cx-from/2,cy);pointer('pointerdown',2,cx+from/2,cy);pointer('pointermove',1,cx-to/2,cy);pointer('pointermove',2,cx+to/2,cy);pointer('pointerup',1,cx-to/2,cy);pointer('pointerup',2,cx+to/2,cy);}
for(const [sw,sh]of [[520,180],[550,140],[296,220],[288,390],[343,470],[358,600],[398,680]]){
 width=sw;height=sh;await clock.open();const art=d.querySelector('#life-clock-face').innerHTML;
 pinch(80,160);assert.ok(Math.abs(scale()-2)<.01,'pinch out must continuously enlarge clock');assert.equal(zoom.textContent,'全体表示');visible('pinch out');centered('pinch center');assert.equal(d.querySelector('#life-clock-face').dataset.side,'front');
 pinch(160,120);assert.ok(Math.abs(scale()-1.5)<.01,'pinch in must shrink from current scale');
 const oldx=sx;pointer('pointerdown',1,left+width/2,top+height/2);pointer('pointermove',1,left+width/2-20,top+height/2);pointer('pointerup',1,left+width/2-20,top+height/2);assert.ok(sx>oldx,'single finger pans enlarged clock');
 pinch(160,40);assert.equal(scale(),1);assert.equal(zoom.textContent,'拡大');visible('pinch return');
 pinch(80,160);double();assert.equal(scale(),1,'double tap returns after pinch');zoom.click();pinch(160,40);visible('pinch after button');zoom.click();if(scale()>1)zoom.click();
 assert.equal(d.querySelector('#life-clock-face').innerHTML,art);pinch(80,160);width=550;height=140;w.dispatchEvent(new w.Event('resize'));visible('rotate pinched');centered('rotate');d.querySelector('#life-clock-flip').click();visible('pinched back');
 clock.close();await clock.open();assert.equal(scale(),1,'reopen resets pinch');
 pointer('pointerdown',1,100,100);pointer('pointerdown',2,180,100);pointer('pointermove',2,220,100);pointer('pointercancel',2,220,100);pointer('pointerup',1,100,100);visible('cancel');
 clock.close();await clock.open();pointer('pointerdown',1,100,100);pointer('pointerdown',2,180,100);pointer('pointerdown',3,140,130);pointer('pointermove',2,300,100);assert.equal(scale(),1,'third finger cancels pinch');for(const id of [1,2,3])pointer('pointerup',id,100,100);
 pinch(80,160);assert.ok(scale()>1,'new pinch after cancel');clock.close();await clock.open();
 pointer('pointerdown',1,100,100);pointer('pointerdown',2,180,100);pointer('pointermove',2,182,100);w.dispatchEvent(new w.Event('blur'));zoom.click();assert.ok(scale()>=1.5,'tiny interrupted pinch must not poison button zoom');clock.close();
}
width=520;height=180;await clock.open();pinch(80,160);w.matchMedia=()=>({matches:false});let motion;scene.animate=(frames,options)=>{motion={frames,options,cancel(){},onfinish:null};return motion;};zoom.click();motion.onfinish();assert.equal(scale(),1,'animated return after pinch');zoom.click();motion.onfinish();assert.equal(scale(),4,'button zoom restored after pinch');clock.close();
assert.equal(JSON.stringify(view),before);console.log('V22 pinch DOM PASS: seven shapes, in/out, midpoint, pan, controls, rotate, back, cancel, third finger, reopen');w.close();
