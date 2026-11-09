import {BoardInput} from '../naopoyo-time-hand-chapter1/input.mjs';
// Same approved pointer boundaries as chapter1 app: single primary pointer,
// visible-actor regrab, final/coalesced samples and sign taps separate from moves.
export class TouchController {
 constructor(canvas,{state,step,presentation,enabled=()=>true,begin=()=>{},end=()=>{},render=()=>{},sign=()=>{},signEnabled=()=>true}){
  Object.assign(this,{canvas,state,presentation,enabled,begin,endGesture:end,render,toggleSign:sign,signEnabled});
  this.input=new BoardInput(state,step);this.pointer=null;this.signTap=null;
  canvas.onpointerdown=e=>this.down(e);canvas.onpointermove=e=>this.move(e);canvas.onpointerup=e=>this.up(e);
  canvas.onpointercancel=canvas.onlostpointercapture=e=>{if(e.pointerId===this.pointer)this.end()};
 }
 point(e){const r=this.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*8,y:(e.clientY-r.top)/r.height*8}}
 onSign(p){return p.x>=0&&p.x<1&&p.y>=7&&p.y<8}
 release(){const id=this.pointer;this.pointer=null;this.signTap=null;if(id!==null&&this.canvas.hasPointerCapture?.(id))this.canvas.releasePointerCapture(id)}
 cancel(){this.release();this.input.cancel();this.endGesture();this.presentation.motion=[]}
 end(){this.input.end();this.endGesture();this.release();this.render()}
 down(e){
  if(this.pointer!==null||!this.enabled()||e.isPrimary===false)return;e.preventDefault();
  const p=this.point(e),s=this.state();this.presentation.sync(s);const hit=this.presentation.hit(p)||null;
  if(!hit&&s.gravity&&this.signEnabled()&&this.onSign(p)){this.pointer=e.pointerId;this.signTap={x:e.clientX,y:e.clientY,moved:false};this.canvas.setPointerCapture(this.pointer);return}
  const a=s.actors.find(a=>a.id===this.input.selected);
  if(!hit&&(!a||Math.max(Math.abs(Math.floor(p.x)-a.x),Math.abs(Math.floor(p.y)-a.y))!==1))return;
  this.cancel();this.pointer=e.pointerId;this.canvas.setPointerCapture(this.pointer);this.begin();this.input.start(p,{hit});this.render();
 }
 travel(e){const samples=e.getCoalescedEvents?.();for(const sample of samples?.length?samples:[e])this.input.drag(this.point(sample));this.render()}
 move(e){if(e.pointerId!==this.pointer||!this.enabled())return;e.preventDefault();if(this.signTap){if(Math.hypot(e.clientX-this.signTap.x,e.clientY-this.signTap.y)>10)this.signTap.moved=true;return}this.travel(e)}
 up(e){if(e.pointerId!==this.pointer)return;if(this.signTap){const tap=!this.signTap.moved&&Math.hypot(e.clientX-this.signTap.x,e.clientY-this.signTap.y)<=10&&this.onSign(this.point(e));this.release();if(tap){this.toggleSign();this.render()}return}this.travel(e);this.end()}
}
