// Illustration selection only. No movement, condition, save or catalog changes.
import {tile} from '../../render.mjs';
import {renderDraft} from '../v6/render.mjs';
import {sceneFor} from './scenes.mjs';
import {createGameState} from '../../engine.mjs';
export function paintCrate(c,value=2){
 c.save();
 const path=(points,fill,stroke=null)=>{c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.018;c.stroke();}};
 const grad=c.createLinearGradient(.2,.2,.65,.86);grad.addColorStop(0,'#d9bb88');grad.addColorStop(1,'#b88b57');
 c.fillStyle='#203c3d30';c.beginPath();c.ellipse(.51,.87,.37,.055,0,0,7);c.fill();
 path([[.16,.27],[.25,.16],[.84,.16],[.75,.27]],'#e4c99a','#8e714d');
 path([[.75,.27],[.84,.16],[.84,.75],[.75,.86]],'#96714b','#765c40');
 c.fillStyle=grad;c.strokeStyle='#816445';c.lineWidth=.025;c.beginPath();c.roundRect(.16,.26,.6,.6,.035);c.fill();c.stroke();
 c.strokeStyle='#ac835555';c.lineWidth=.012;c.beginPath();c.moveTo(.2,.46);c.lineTo(.72,.46);c.moveTo(.2,.66);c.lineTo(.72,.66);c.stroke();
 // Raised wooden rim, with quiet diagonal corner braces and an open center.
 c.strokeStyle='#eddbb7';c.lineWidth=.048;c.lineJoin='round';c.strokeRect(.205,.305,.51,.51);
 c.strokeStyle='#e4cda4';c.lineWidth=.036;c.beginPath();for(const [x,y,tx,ty]of [[.22,.32,.34,.44],[.70,.32,.61,.41],[.22,.8,.34,.68],[.70,.8,.60,.7]]){c.moveTo(x,y);c.lineTo(tx,ty);}c.stroke();
 c.strokeStyle='#f5e4bd';c.lineWidth=.018;c.beginPath();c.moveTo(.28,.185);c.lineTo(.79,.185);c.stroke();
 c.fillStyle='#826849';for(const x of [.22,.70])for(const y of [.32,.80]){c.beginPath();c.arc(x,y,.014,0,7);c.fill();}
 c.save();c.translate(.46,.565);c.scale(.01,.01);c.font='800 43px "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=2.5;c.strokeStyle='#f4dfb6';c.strokeText(String(value),0,0);c.fillStyle='#5e4936';c.fillText(String(value),0,0);c.restore();
 c.restore();
}
export function drawCrateSwatch(canvas,px,style='new',value=2){
 const dpr=Math.min(globalThis.devicePixelRatio||1,2);canvas.width=canvas.height=px*dpr;if(canvas.style)canvas.style.width=canvas.style.height=px+'px';const c=canvas.getContext('2d');c.setTransform(px*dpr,0,0,px*dpr,0,0);if(style==='old')tile(c,'object.crate',{weight:value,min:value});else paintCrate(c,value);
}
export function crateScene(){const scene=sceneFor('object.crate');return{d:scene.d,state:createGameState(scene.d.board)};}
const backgrounds=new WeakMap();
export function drawCrateBoard(canvas,scene,style='old'){
 renderDraft(canvas,scene.d,scene.state,{reduced:true,now:1});if(style!=='new')return;
 let bg=backgrounds.get(canvas);if(!bg){bg=document.createElement('canvas');backgrounds.set(canvas,bg);}bg.getBoundingClientRect=()=>canvas.getBoundingClientRect();renderDraft(bg,scene.d,scene.state,{reduced:true,now:1},{gimmicks:false,actors:false});
 const c=canvas.getContext('2d'),unit=canvas.width/8;c.save();c.setTransform(1,0,0,1,0,0);
 for(const t of scene.d.board.tiles.filter(t=>t.catalogId==='object.crate')){
  c.drawImage(bg,t.x*unit,t.y*unit,unit,unit,t.x*unit,t.y*unit,unit,unit);
  c.save();c.translate(t.x*unit,t.y*unit);c.scale(unit,unit);paintCrate(c,t.params.weight);c.restore();
 }
 c.restore();
}
