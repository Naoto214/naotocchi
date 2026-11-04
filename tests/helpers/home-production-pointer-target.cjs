// Browser-side fixture selection only; the shipped navigation remains the
// authority. Try nearby candidates first so route search does not leave an
// input origin stale while autonomous characters or conversations advance.
module.exports=(kind='tap')=>{
 const started=performance.now(),q=HomeReleaseQA,d=q.detail(),inspection=q.inspect(),a=d.actors[0],b=inspection.bounds[0],nav=inspection.scene.navigation,s=d.slots.castStage;
 const viewport=window.NaotocchiHomeViewport,presentation=viewport?.residentPresentation?.(),stageNode=document.getElementById('castStage');
 const native=presentation?viewport.presentationRect(stageNode):{left:s.x,top:s.y};
 // Project navigation coordinates through the real camera. Resident size is
 // independent of terrain scale in the shipped V18 presentation.
 const project=p=>presentation?{x:presentation.x+(native.left+p.x-presentation.x)*presentation.scaleX,y:presentation.y+(native.top+p.y-presentation.y)*presentation.scaleY}:{x:s.x+p.x,y:s.y+p.y};
 const frame=document.querySelector('.screen-frame').getBoundingClientRect();
 const foot=project(a),bodyScale=presentation?.bodyScale||1;
 const owner=document.querySelector('[data-diorama-actor="'+a.key+'"]'),rect=owner?.getBoundingClientRect();
 // Model dimensions describe the selection area, not the painted DOM frame.
 // Perspective, motion and overlapping residents can put its nominal centre
 // over another actor. Require a physical point that hits the protagonist and
 // is also inside the controller's body hitbox.
 const originPoints=[{x:foot.x,y:foot.y-a.h*.4*bodyScale}];
 if(rect)for(let y=Math.max(frame.top+1,rect.top+1,foot.y-a.h*bodyScale+1);y<Math.min(frame.bottom-1,rect.bottom-1,foot.y);y+=2)
  for(let x=Math.max(frame.left+1,rect.left+1,foot.x-a.w*bodyScale/2+1);x<Math.min(frame.right-1,rect.right-1,foot.x+a.w*bodyScale/2);x+=2)originPoints.push({x,y});
 const from=originPoints.map(p=>({x:Math.floor(p.x),y:Math.floor(p.y)})).find(p=>p.x>frame.left&&p.x<frame.right&&p.y>frame.top&&p.y<frame.bottom&&document.elementFromPoint(p.x,p.y)?.closest?.('[data-diorama-actor]')===owner);
 if(!owner||!from)throw Error('Protagonist cannot be reached by pointer');
 const clearance=(p,c)=>Math.hypot((p.x-c.x)/((a.w+c.w)*.5+10),(p.y-c.y)/((a.h+c.h)*.38+10));
 const free=p=>d.actors.slice(1).every(c=>clearance(p,c)>=1)&&inspection.scene.visible(p,a);
 // Match the controller's escape-only routing from an already cramped seat.
 // The destination must still be completely free.
 const routeFree=p=>d.actors.slice(1).every(c=>clearance(p,c)>=Math.min(1,clearance(a,c))-1e-9)&&inspection.scene.visible(p,a);
 let candidateCount=0;
 // Refine only when the coarse grid misses a narrow reserved exit.
 for(const spacing of [4,1]){
 const candidates=[],points=[];
 const scan=spacing===1?{left:Math.max(b.left,a.x-64),right:Math.min(b.right,a.x+64),top:Math.max(b.top,a.y-64),bottom:Math.min(b.bottom,a.y+64)}:b;
 for(let y=scan.top;y<scan.bottom;y+=spacing)for(let x=scan.left;x<scan.right;x+=spacing)points.push({x,y});
 for(const candidate of points){
  // WebKit dispatches integer CSS pixels. Validate the world point that
  // will actually arrive at the controller, not a fractional near-obstacle
  // candidate that rounds into an occupied cell on delivery.
  const projected=project(candidate),to={x:Math.floor(projected.x),y:Math.floor(projected.y)};
  const unscaled=viewport?.unscalePoint?.(to)||to,p={x:unscaled.x-native.left,y:unscaled.y-native.top};
  const {x,y}=p,distance=Math.hypot(x-a.x,y-a.y);
  // The pointer starts above the feet. A 45px ground route can still be a
  // sub-pixel gesture; require a real drag beyond the shipped 8px threshold.
  if(kind==='drag'&&Math.hypot(to.x-from.x,to.y-from.y)<12)continue;
  if(distance<12||to.y<frame.top+5||to.y>frame.bottom-5||to.x<frame.left+5||to.x>frame.right-5||!free(p)||!nav.valid(p))continue;
  // Ground taps must miss every selection hitbox. A captured drag may finish
  // over a sprite (including the pet itself); its endpoint still must be free
  // ground with the exact same collision, visibility and route checks below.
  if(kind==='tap'&&d.actors.some(c=>Math.abs(x-c.x)<=Math.max(22,c.w/2)&&y>=c.y-Math.max(44,c.h)&&y<=c.y+10))continue;
  if(kind==='tap'&&presentation&&d.actors.some(c=>Math.abs(x-c.x)<=c.w*presentation.bodyScale/presentation.scaleX/2&&y>=c.y-c.h*presentation.bodyScale/presentation.scaleY&&y<=c.y))continue;
  candidates.push({p,to,distance});
 }
 candidates.sort((a,b)=>a.distance-b.distance);
 for(const minimumDistance of [45,12])for(const {p,to,distance} of candidates){
  if(distance<minimumDistance)continue;
  const route=nav.route(a,p,b,routeFree);if(!route.length)continue;
  // Terrain routes sample in 3px steps. Reject a segment that grazes a
  // resident between those samples: live movement enforces body clearance
  // at every frame and would correctly stop before reaching the destination.
  let start=a;
  const clear=route.every(end=>{
   const safe=d.actors.slice(1).every(c=>{
    const rx=(a.w+c.w)*.5+10,ry=(a.h+c.h)*.38+10;
    const x=(start.x-c.x)/rx,y=(start.y-c.y)/ry,dx=(end.x-start.x)/rx,dy=(end.y-start.y)/ry;
    const t=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(x+dx*t,y+dy*t)>=Math.min(1,Math.hypot(x,y))-1e-9;
   });start=end;return safe;
  });if(!clear)continue;
  // The scroll frame includes padding that paints terrain but belongs to the
  // device. A physical ground tap must actually hit the stage, not that gutter.
  const hit=document.elementFromPoint(to.x,to.y);
  if(kind==='tap'&&hit!==stageNode&&!stageNode.contains(hit))continue;
  return {a,p,route,kind,stage:s,from,to,hit:hit?.id||hit?.tagName||null,selectionMs:performance.now()-started};
 }
 candidateCount+=candidates.length;
 }
 throw Error('No visible grounded destination for pointer: '+JSON.stringify({candidates:candidateCount,selectionMs:performance.now()-started,pet:a,frame:{top:frame.top,bottom:frame.bottom}}));
};
