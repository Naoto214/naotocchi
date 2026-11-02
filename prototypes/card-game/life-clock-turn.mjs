// Inspection state only. No game projection, storage, or CPU interfaces.
export function mountClockTurn({scene,rotor,button,hint}){
 const doc=scene.ownerDocument,win=doc.defaultView,pointers=new Set();
 let angle=0,back=false,zoom=false,enabled=false,turning=false,start=null,timer;
 const reduced=()=>win.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
 function update(){
  rotor.dataset.side=back?'back':'front';rotor.style.transform=`rotateY(${angle}deg)`;
  rotor.querySelector('[data-clock-front]')?.setAttribute('aria-hidden',String(back));
  rotor.querySelector('[data-clock-back]')?.setAttribute('aria-hidden',String(!back));
  button.textContent=back?'表へ':'裏へ';button.setAttribute('aria-label',back?'時計の表面を表示':'時計の裏面を表示');button.setAttribute('aria-pressed',String(back));button.disabled=!enabled||turning;
  hint.textContent=zoom?'拡大中はスクロールできます。表裏は上のボタンで切り替えられます。':'時計を左右にスワイプすると、表と裏を切り替えられます。';
 }
 function finish(){win.clearTimeout(timer);turning=false;update();}
 function flip(direction=1){
  if(!enabled||turning)return;
  start=null;back=!back;angle+=180*direction;
  const instant=reduced();rotor.style.transition=instant?'none':'';turning=!instant;update();
  if(turning)timer=win.setTimeout(finish,760);
 }
 function trackDown(e){pointers.add(e.pointerId);if(pointers.size>1||e.isPrimary===false)start=null;}
 function trackUp(e){pointers.delete(e.pointerId);}
 function down(e){
  if(pointers.size!==1||e.isPrimary===false||e.button!==0||zoom||!enabled||turning){start=null;return;}
  start={id:e.pointerId,x:e.clientX,y:e.clientY};
  try{scene.setPointerCapture(e.pointerId);}catch{/* Synthetic/older pointer implementation. */}
 }
 function move(e){
  if(!start||start.id!==e.pointerId)return;
  const dx=e.clientX-start.x,dy=e.clientY-start.y;
  if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){start=null;return;}
 }
 function up(e){
  const g=start;start=null;pointers.delete(e.pointerId);
  if(!g||g.id!==e.pointerId||pointers.size||zoom)return;
  const dx=e.clientX-g.x,dy=e.clientY-g.y;
  if(Math.abs(dx)>=40&&Math.abs(dx)>Math.abs(dy)*1.3)flip(Math.sign(dx));
 }
 function cancel(e){start=null;pointers.delete(e.pointerId);}
 const click=()=>flip();
 const end=e=>{if(e.target===rotor&&e.propertyName==='transform')finish();};
 const handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,lostpointercapture:cancel};
 doc.addEventListener('pointerdown',trackDown,true);doc.addEventListener('pointerup',trackUp,true);doc.addEventListener('pointercancel',trackUp,true);
 for(const [name,fn]of Object.entries(handlers))scene.addEventListener(name,fn);
 button.addEventListener('click',click);rotor.addEventListener('transitionend',end);
 function reset(){win.clearTimeout(timer);angle=0;back=false;zoom=false;enabled=false;turning=false;start=null;pointers.clear();rotor.style.transition='none';update();}
 reset();
 return {reset,setEnabled(value){enabled=value;update();},setZoom(value){zoom=value;start=null;update();},destroy(){reset();doc.removeEventListener('pointerdown',trackDown,true);doc.removeEventListener('pointerup',trackUp,true);doc.removeEventListener('pointercancel',trackUp,true);for(const [name,fn]of Object.entries(handlers))scene.removeEventListener(name,fn);button.removeEventListener('click',click);rotor.removeEventListener('transitionend',end);}};
}
