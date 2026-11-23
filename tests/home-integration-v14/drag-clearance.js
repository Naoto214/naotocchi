// Disposable observation at the beginning of the trusted drag and during native retries.
function surroundingClearance() {
  const actors=model.snapshot();
  const a=actors.find(p=>p.key===(model.selected()||actors[0]?.key));
  const b=model.bounds(a), scale=scene.navigation.intentScale||{x:1,y:1};
  const v=env.NaotocchiHomeViewport.residentPresentation(), r=displayRect(stage);
  const screenX=v.x+(r.left+a.x-v.x)*v.scaleX;
  const horizontal=window.regionTrace.requestDirection??=(screenX>innerWidth/2?-1:1);
  const summary={clock:model.metrics().clock,key:a.key,neighbors:[],radii:[]};
  for(const peer of actors){
    if(a.key===peer.key)continue;
    const d=Math.hypot((a.x-peer.x)/((a.w+peer.w)*.5+10),(a.y-peer.y)/((a.h+peer.h)*.38+10));
    if(d<1.05)summary.neighbors.push([peer.key,+d.toFixed(6)]);
  }
  for(const radius of (window.regionalDragRadii||[1,4,12,28])){
    let clear=0,forward=0,terrain=0,bodyBlocked=0,alternate=null,straightTerrain=false,straightClear=false;
    for(let i=0;i<72;i++){
      const angle=i*Math.PI/36;
      const p={x:a.x+Math.cos(angle)*radius/scale.x,y:a.y+Math.sin(angle)*radius/scale.y};
      if(p.x<b.left||p.x>b.right||p.y<b.top||p.y>b.bottom||
         !scene.navigation.segmentSafe(a,p)||!visibleAt(p,a))continue;
      terrain++;
      const straight=(horizontal===1&&i===0)||(horizontal===-1&&i===36);
      if(straight)straightTerrain=true;
      const safe=actors.every(peer=>{
        if(peer.key===a.key)return true;
        const rx=(a.w+peer.w)*.5+10,ry=(a.h+peer.h)*.38+10;
        const x=(a.x-peer.x)/rx,y=(a.y-peer.y)/ry,dx=(p.x-a.x)/rx,dy=(p.y-a.y)/ry;
        const old=Math.hypot(x,y),dot=x*dx+y*dy;
        if(old<1)return dot>=0&&Math.hypot(x+dx,y+dy)>old+1e-6;
        const t=Math.max(0,Math.min(1,-dot/(dx*dx+dy*dy||1)));
        return Math.hypot(x+t*dx,y+t*dy)>=1;
      });
      if(!safe){bodyBlocked++;continue;}
      clear++;if(straight)straightClear=true;
      if(!alternate)alternate=[Math.round(v.x+(r.left+p.x-v.x)*v.scaleX),
        Math.round(v.y+(r.top+p.y-v.y)*v.scaleY)];
      if((p.x-a.x)*horizontal>0)forward++;
    }
    summary.radii.push({radius,terrain,bodyBlocked,clear,forward,alternate,straightTerrain,straightClear});
  }
  return summary;
}
