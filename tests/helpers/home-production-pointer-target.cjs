// Browser-side fixture selection only; the shipped navigation remains the
// authority. Try nearby candidates first so route search does not leave an
// input origin stale while autonomous characters or conversations advance.
module.exports=()=>{
 const started=performance.now(),q=HomeReleaseQA,d=q.detail(),inspection=q.inspect(),a=d.actors[0],b=inspection.bounds[0],nav=inspection.scene.navigation,s=d.slots.castStage;
 const frame=document.querySelector('.screen-frame').getBoundingClientRect();
 const from={x:s.x+a.x,y:s.y+a.y-a.h*.4};
 if(from.y<frame.top||from.y>frame.bottom)throw Error('Protagonist cannot be reached by pointer');
 const free=p=>d.actors.slice(1).every(c=>Math.hypot((p.x-c.x)/((a.w+c.w)*.5+10),(p.y-c.y)/((a.h+c.h)*.38+10))>=1)&&inspection.scene.visible(p,a);
 const candidates=[];
 for(let y=b.top;y<b.bottom;y+=4)for(let x=b.left;x<b.right;x+=4){
  const distance=Math.hypot(x-a.x,y-a.y),p={x,y},to={x:s.x+x,y:s.y+y};
  if(distance<12||to.y<frame.top+5||to.y>frame.bottom-5||to.x<frame.left+5||to.x>frame.right-5||!free(p)||!nav.valid(p))continue;
  if(d.actors.some(c=>Math.abs(x-c.x)<=Math.max(22,c.w/2)&&y>=c.y-Math.max(44,c.h)&&y<=c.y+10))continue;
  candidates.push({p,to,distance});
 }
 candidates.sort((a,b)=>a.distance-b.distance);
 for(const minimumDistance of [45,12])for(const {p,to,distance} of candidates){
  if(distance<minimumDistance)continue;
  if(nav.route(a,p,b,free).length)return {a,p,stage:s,from,to,selectionMs:performance.now()-started};
 }
 throw Error('No visible grounded destination for pointer: '+JSON.stringify({candidates:candidates.length,selectionMs:performance.now()-started,pet:a,frame:{top:frame.top,bottom:frame.bottom}}));
};
