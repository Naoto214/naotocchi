/* Injected only by the offline collector into the native model closure. All queries use copies. */
globalThis.spaceAtlas = (input => {
  const nav = scene.navigation;
  const scale = nav.intentScale || {x:1,y:1};
  const lengths = [3,8,16];
  const sectors = 96;
  const step = 2;
  const precision = n => Math.round(n * 1000) / 1000;
  const css = p => [precision(p.x*scale.x),precision(p.y*scale.y)];
  const model = (x,y) => ({x:x/scale.x,y:y/scale.y});
  const inside = (p,b) => p.x>=b.left && p.x<=b.right && p.y>=b.top && p.y<=b.bottom;
  const legal = (a,p,q) => inside(p,a.box) && inside(q,a.box) && nav.segmentSafe(p,q,a.ink);
  const radius = (a,b) => [(a.w+b.w)*.5+10,(a.h+b.h)*.38+10];
  function touches(a,from,to,b) {
    const [rx,ry] = radius(a,b);
    if (!contactSegmentSafe(from,to,b,rx,ry)) return true;
    const before=clearance(a,from,b);
    if (before>=1) return false;
    const dx=to.x-from.x,dy=to.y-from.y,t=Math.min(1,.35/(Math.hypot(dx,dy)||1));
    const next=clearance(a,{x:from.x+t*dx,y:from.y+t*dy},b);
    return next<1 && next<=before+1e-6;
  }
  function packed(bytes) { return btoa(String.fromCharCode(...bytes)); }
  function cast(feet) {
    if (feet.length!==actors.length) throw Error('Unexpected cast size');
    return feet.map(([key,x,y,w,h])=>{
      const native=actors.find(a=>a.key===key);
      if(!native || Math.abs(native.w-w)>.01 || Math.abs(native.h-h)>.01) throw Error('Body mismatch '+key);
      const a={...native,x,y};
      return {...a,box:bounds(a,scene),ink:scene.planVisibility(a)};
    });
  }
  const localCast=cast(input.frames[0].feet);
  const cols=Math.floor(scene.width*scale.x/step),rows=Math.floor(scene.height*scale.y/step);
  const bytes=()=>new Uint8Array(Math.ceil(cols*rows/8));
  const ground=bytes(), allowed=localCast.map(bytes);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++) {
    const p=model((x+.5)*step,(y+.5)*step),id=y*cols+x;
    if(!nav.valid(p))continue;
    ground[id>>3]|=1<<(id&7);
    localCast.forEach((a,i)=>{if(inside(p,a.box)&&a.ink(p))allowed[i][id>>3]|=1<<(id&7);});
  }
  const bearings=Array.from({length:sectors},(_,i)=>[Math.cos(i*2*Math.PI/sectors),Math.sin(i*2*Math.PI/sectors)]);
  function directions(a,cast) {
    const peers=cast.filter(b=>a!==b), [x,y]=css(a),refuge=[];
    const rays=lengths.map(length=>{
      const terrain=new Uint8Array(12),clear=new Uint8Array(12),blockers={};
      for(const [i,[dx,dy]] of bearings.entries()) {
        const q={x:a.x+length*dx/scale.x,y:a.y+length*dy/scale.y};
        if(!legal(a,a,q))continue;
        terrain[i>>3]|=1<<(i&7);
        const blocked=peers.filter(b=>touches(a,a,q,b));
        if(blocked.length){for(const b of blocked)blockers[b.key]=(blockers[b.key]||0)+1;continue;}
        clear[i>>3]|=1<<(i&7);
        if(length!==16 || refuge.length>=4 || peers.some(b=>clearance(a,q,b)<1))continue;
        if(refuge.some(r=>Math.hypot(r[0]-q.x*scale.x,r[1]-q.y*scale.y)<12))continue;
        // A visible stop reached by a real 16px line, with two independent 3px returns sideways.
        if([-1,1].every(s=>{const r={x:q.x+s*3*dy/scale.x,y:q.y-s*3*dx/scale.y};return legal(a,q,r)&&peers.every(b=>!touches(a,q,r,b));}))refuge.push(css(q));
      }
      return {terrain:packed(terrain),clear:packed(clear),blockers};
    });
    return {key:a.key,x,y,rx:precision((a.w/2+5)*scale.x),ry:precision((a.h*.38+5)*scale.y),contacts:peers.filter(b=>clearance(a,a,b)<1).map(b=>b.key),refuge,rays};
  }
  function passing(cast) {
    if(cast.length<2)return null;
    const sorted=[...cast].sort((a,b)=>a.w*a.h-b.w*b.h||a.key.localeCompare(b.key)), mid=Math.floor(sorted.length/2);
    const a=sorted[mid-1],b=sorted[mid],peers=cast.filter(p=>p!==a&&p!==b), [rx,ry]=radius(a,b);
    const examples=[],positions=[],spacing=12;
    let clear=0,staticCount=0;
    for(let y=spacing/2;y<rows*step;y+=spacing)for(let x=spacing/2;x<cols*step;x+=spacing){
      if(!nav.valid(model(x,y)))continue;
      let terrain=false,safe=false;
      for(const i of [0,12,24,36]) {
        const [dx,dy]=bearings[i],gap=Math.hypot(rx*scale.x*dy,ry*scale.y*dx)+2;
        const p=(side,t)=>model(x+side*(-dy)*gap/2+t*dx*12,y+side*dx*gap/2+t*dy*12);
        for(const sign of [-1,1]){
          const f=p(sign,-1),g=p(sign,1),h=p(-sign,1),j=p(-sign,-1);
          if(!legal(a,f,g)||!legal(b,h,j))continue;
          terrain=true;
          if(peers.some(o=>clearance(a,f,o)<1||touches(a,f,g,o)||clearance(b,h,o)<1||touches(b,h,j,o))) continue;
          safe=true;positions.push([x,y]);
          if(examples.length<12&&examples.every(e=>Math.hypot(x-e[0],y-e[1])>=28))examples.push([x,y,...css(f),...css(g),...css(h),...css(j)]);
          break;
        }
        if(safe)break;
      }
      if(terrain)staticCount++;if(safe)clear++;
    }
    return {pair:[a.key,b.key],clear,staticCount,positions,examples};
  }
  return {cols,rows,step,scale,ground:packed(ground),allowed:allowed.map(packed),frames:input.frames.map(frame=>{
    const house=cast(frame.feet);
    return {phase:frame.phase,time:frame.time,actors:house.map(a=>directions(a,house)),passing:passing(house)};
  })};
});
