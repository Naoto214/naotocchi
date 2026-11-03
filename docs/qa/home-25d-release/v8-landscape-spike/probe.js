/* Disposable presentation experiment. No runtime file or model method is patched.
 * Copy beside v7-qa.html as v8-structure-probe.{html,js}. QA storage remains isolated.
 * Geometric reachability/hit testing is NOT proof of actual tap/drag success.
 */
const params=new URLSearchParams(location.search),frame=document.getElementById('game');
let mode='V7',before=null,results=[];
const rect=e=>e?.getBoundingClientRect().toJSON(),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const css=(e,props)=>Object.entries(props).forEach(([k,v])=>e.style.setProperty(k,String(v),'important'));
const paint=()=>new Promise(r=>frame.contentWindow.requestAnimationFrame(()=>frame.contentWindow.requestAnimationFrame(r)));
async function load(w,h,n){
 frame.width=w;frame.height=h;mode='V7';before=null;
 await new Promise(resolve=>{frame.onload=resolve;frame.src='v7-qa.html?region=home&count='+Math.max(1,n)+'&probe='+Date.now();});
 for(let i=0;i<100;i++){if(frame.contentWindow.HomeReleaseQA?.detail().world?.loaded)break;await sleep(100);}
 const q=frame.contentWindow.HomeReleaseQA;
 if(n===0)q.egg();else q.scene('home',n);
 await sleep(400);await paint();before=sample();return before;
}
function sample(){
 const w=frame.contentWindow,d=w.document,q=w.HomeReleaseQA,viewport=d.querySelector('.screen-frame'),vr=rect(viewport),controls=rect(d.getElementById('careActions'));
 const lane=mode==='V7'?{top:controls.top-80,bottom:controls.top-4}:rect(d.getElementById('homeCommentDock'));
 const actors=[...d.querySelectorAll('[data-diorama-actor]')].filter(e=>e.getBoundingClientRect().height).map(e=>{
  const r=rect(e),x=r.x+r.width/2,y=r.y+r.height/2,hit=d.elementFromPoint(x,y);
  return {key:e.dataset.dioramaActor,rect:r,overlapsLane:r.bottom>lane.top&&r.top<lane.bottom&&r.right>(lane.left??0)&&r.left<(lane.right??w.innerWidth),
   fullyInsideViewport:r.top>=vr.top&&r.bottom<=vr.bottom&&r.left>=vr.left&&r.right<=vr.right,centerHit:hit===e||e.contains(hit),
   tallerThanViewport:r.height>vr.height};
 });
 return {mode,baselineStage:before?.stage,viewport:[w.innerWidth,w.innerHeight],header:rect(d.querySelector('.device-header')),buttons:[...d.querySelectorAll('#careActions button')].map(e=>({id:e.id,rect:rect(e)})),information:rect(d.getElementById('homeInformation')),notice:rect(d.getElementById('homeEventSlot')),comment:rect(d.getElementById('homeCommentDock')),controls,central:vr,stage:rect(d.getElementById('castStage')),scroll:viewport.scrollTop,scrollRange:viewport.scrollHeight-viewport.clientHeight,actors,model:q?.detail(),inputTrace:w.HomeReleaseInputTrace?.slice(-8)};
}
function measure(){const data=sample();document.getElementById('result').textContent=JSON.stringify(data);document.getElementById('summary').textContent=`${mode}: ${data.viewport.join('×')} 中央 ${data.central.height}px / actor ${data.actors.length} / 中央より高い ${data.actors.filter(a=>a.tallerThanViewport).length} / 中心hit ${data.actors.filter(a=>a.centerHit).length}`;return data;}
async function apply(next){
 if(mode!=='V7')throw Error('Reload baseline before switching prototype');
 mode=next;const w=frame.contentWindow,d=w.document,device=d.getElementById('device'),pane=d.querySelector('.screen-frame'),notice=d.getElementById('homeEventSlot'),dock=d.getElementById('homeCommentDock');
 const pr=rect(pane),cr=rect(d.getElementById('careActions')),hr=rect(d.querySelector('.device-header'));
 // Preserve original world dimensions; do not reduce petArea or castStage.
 const top=hr.bottom+3+42+3,bottom=cr.top-4-76;
 const marker=d.createElement('div');marker.style.height='42px';marker.style.flex='0 0 42px';notice.before(marker);
 css(notice,{position:'fixed',top:(hr.bottom+3)+'px',left:pr.left+'px',width:pr.width+'px',height:'42px','min-height':'42px','max-height':'42px',overflow:'auto','margin-bottom':'0','z-index':1201});
 css(dock,{display:'flex',height:'76px','min-height':'76px','max-height':'76px',overflow:'auto','pointer-events':'auto',background:'#fff8db55'});
 if(next==='A')css(pane,{position:'fixed',top:top+'px',left:pr.left+'px',width:pr.width+'px',height:Math.max(0,bottom-top)+'px','min-height':'0','max-height':'none',overflow:'auto'});
 if(next==='D'){
  // Throwaway landscape rail: preserve stage dimensions, scroll the view only.
  const gap=8,rail=260,left=pr.left,railLeft=w.innerWidth-pr.left-rail,viewWidth=railLeft-gap-left;
  const screen=d.getElementById('screen'),originalScreenWidth=rect(screen).width,info=d.getElementById('homeInformation'),ir=rect(info);
  const placeholder=d.createElement('div');placeholder.style.height=ir.height+'px';info.before(placeholder);
  device.append(notice,dock,info);
  css(screen,{width:originalScreenWidth+'px','min-width':originalScreenWidth+'px','box-sizing':'border-box'});
  css(pane,{position:'fixed',top:top+'px',left:left+'px',width:viewWidth+'px',height:(cr.bottom-top)+'px','min-height':'0','max-height':'none',overflow:'auto','scroll-behavior':'auto'});
  css(notice,{left:left+'px',width:viewWidth+'px'});
  css(dock,{position:'fixed',left:railLeft+'px',right:'auto',top:(cr.top-80)+'px',bottom:'auto',width:rail+'px','z-index':1201});
  css(d.getElementById('careActions'),{position:'fixed',left:railLeft+'px',right:'auto',top:cr.top+'px',bottom:'auto',width:rail+'px',height:cr.height+'px','z-index':1201});
  css(info,{position:'fixed',left:railLeft+'px',top:(hr.bottom+3)+'px',width:rail+'px',height:(cr.top-80-hr.bottom-6)+'px',overflow:'auto','z-index':1201,background:'#fff9e8'});
 }
 await paint();return measure();
}
async function focus(){const d=frame.contentDocument,p=d.querySelector('.screen-frame'),a=d.querySelector('[data-diorama-actor^="pet:"]');if(a){const r=rect(a),v=rect(p);p.scrollTop+=(r.top+r.bottom-v.top-v.bottom)/2;p.scrollLeft+=(r.left+r.right-v.left-v.right)/2;}await paint();measure();}
document.getElementById('measure').onclick=measure;document.getElementById('focus').onclick=focus;
document.getElementById('baseline').onclick=async()=>{await load(+(params.get('w')||375),+(params.get('h')||667),+(params.get('n')||28));measure();};
for(const m of ['A','D'])document.getElementById(m.toLowerCase()).onclick=async()=>{await load(+(params.get('w')||568),+(params.get('h')||320),+(params.get('n')||1));await apply(m);await focus();};
load(+(params.get('w')||568),+(params.get('h')||320),+(params.get('n')||1)).then(measure);
