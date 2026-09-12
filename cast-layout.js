(function(root) {
  'use strict';
  const bounds = typeof module === 'object' && module.exports ? require('./cast-bounds.js') : root.NaotocchiCastBounds;
  const full = {box:[0,0,128,128],hull:[[0,0],[128,0],[128,128],[0,128]]};
  const rect = (x,y,w,h=w) => ({x,y,w,h});
  const shape = asset => bounds?.[asset] || full;
  const body = (frame,asset) => {
    const b=shape(asset).box;
    return rect(frame.x+frame.w*b[0]/128,frame.y+frame.h*b[1]/128+(frame.artOffsetY||0),frame.w*(b[2]-b[0])/128,frame.h*(b[3]-b[1])/128);
  };
  const polygon = (frame,asset) => shape(asset).hull.map(([x,y])=>[frame.x+x*frame.w/128,frame.y+y*frame.h/128+(frame.artOffsetY||0)]);
  // Separating axes of conservative alpha hulls. A clear axis leaves at least
  // `gap` CSS pixels between bodies; the transparent image frames stay intact.
  function separated(a,b,gap) {
    for(const poly of [a,b]) for(let i=0;i<poly.length;i++) {
      const p=poly[i],q=poly[(i+1)%poly.length],dx=q[0]-p[0],dy=q[1]-p[1],length=Math.hypot(dx,dy);
      if(!length)continue;
      const nx=-dy/length,ny=dx/length;
      const aa=a.map(v=>v[0]*nx+v[1]*ny),bb=b.map(v=>v[0]*nx+v[1]*ny);
      if(Math.max(...aa)+gap<=Math.min(...bb) || Math.max(...bb)+gap<=Math.min(...aa))return true;
    }
    return false;
  }
  function overlaps(a,b,gap=4) {
    return a.x<b.x+b.w+gap-.001 && b.x<a.x+a.w+gap-.001 && a.y<b.y+b.h+gap-.001 && b.y<a.y+a.h+gap-.001;
  }
  function coreCast(m,mainAsset,hasPartner,partnerAsset,hasAccessory,motionGap) {
    const p=m/2, scale=m/104;
    const main=rect(-m/2,-m*.26+8,m);
    // Move only transparent bottom padding outside this logical frame. Every
    // painted pixel stays inside it; the source PNG and its proportions stay.
    main.artOffsetY=m*(128-shape(mainAsset).box[3])/128;
    // Anchor to the painted body. Young characters may have a large transparent
    // area above them; that space should not push their partner or item away.
    const visible=body(main,mainAsset), pb=shape(partnerAsset).box, a=36*scale;
    const pairWidth=(p*(pb[2]-pb[0])/128+a)/2;
    // A narrow body needs outward anchors so the item can stay beside the
    // partner instead of being pushed above it by the collision check.
    const inset=hasPartner && hasAccessory?Math.min(visible.w*.12,(visible.w-pairWidth-3-motionGap)/2):visible.w*.12;
    const partner=hasPartner?rect(visible.x+inset-p*(pb[0]+pb[2])/256,visible.y-p*pb[3]/128,p):null;
    const accessory=hasAccessory?rect(visible.x+visible.w-inset-a/2,visible.y-a,a):null;
    const mainPoly=polygon(main,mainAsset);
    if(partner)while(!separated(mainPoly,polygon(partner,partnerAsset),2+motionGap))partner.y-=1;
    if(accessory)while(!separated(mainPoly,polygon(accessory,null),2+motionGap) || (partner && !separated(polygon(partner,partnerAsset),polygon(accessory,null),2+motionGap)))accessory.y-=1;
    const hearts=partner?[rect(partner.x+5*scale,partner.y-24*scale,26*scale),rect(partner.x+p-17*scale,partner.y-12*scale,18*scale)]:[];
    const core=[body(main,mainAsset),...(partner?[body(partner,partnerAsset)]:[]),...(accessory?[accessory]:[]),...hearts];
    const coreFrames=[main,...(partner?[partner]:[]),...(accessory?[accessory]:[]),...hearts];
    return {main,partner,accessory,hearts,core,coreFrames};
  }
  const extent = frames => ({left:Math.min(...frames.map(f=>f.x)),right:Math.max(...frames.map(f=>f.x+f.w)),top:Math.min(...frames.map(f=>f.y)),bottom:Math.max(...frames.map(f=>f.y+f.h))});
  const translate = (f,x,y) => f?{...f,x:f.x+x,y:f.y+y}:null;

  // Keep the approved half-ellipse wings at every available height. Pack curved
  // lanes from the core outward; never replace the wings with straight columns.
  function compactCast(args) {
    const {width,height,mainAsset,hasPartner,partnerAsset,hasAccessory,companions,motionRadius}=args;
    const gap=4+2*motionRadius, room=width-16, count=companions.length;
    const boxes=companions.map(a=>shape(a).box), centersY=boxes.map(b=>(b[1]+b[3])/256);
    const bodyHeight=Math.max(0,...boxes.map(b=>(b[3]-b[1])/128));
    const frameSpan=1-Math.max(0,...centersY)+Math.min(1,...centersY);
    // Keep up to four friends on one arc. Five may use 2+3, with a curved
    // outer lane; choose each side separately when the total is odd.
    const sideCounts=[Math.ceil(count/2),Math.floor(count/2)];
    const laneLimits=sideCounts.map(n=>Math.min(4,Math.max(1,Math.floor((n+1)/3))));
    const maxLanes=Math.max(...laneLimits);
    const mainLimit=count===0?Math.min(256,room*.78):room>=310?112:104;
    const maxMain=Math.floor(Math.min(mainLimit,count===0?height-8:height*.7));
    for(let m=maxMain;m>=(height<96?32:40);m-=2) {
      const c=coreCast(m,mainAsset,hasPartner,partnerAsset,hasAccessory,2*motionRadius);
      const e=extent(c.coreFrames), coreX=-(e.left+e.right)/2, coreY=height-4-e.bottom;
      if(e.bottom-e.top>height-8 || e.right-e.left>room)continue;
      const sideWidth=(room-(e.right-e.left))/2-gap;
      for(let size=count?72:48;size>=12;size--) {
        let best=null;
        const bh=size*bodyHeight, bow=Math.max(size*.8,Math.min(height*.25,40));
        for(let lanes=1;lanes<=maxLanes;lanes++) {
          // Reject impossible vertical spans before allocating candidate lanes.
          // Account for differently centered PNG frames, not just body height.
          const maxRows=Math.max(...sideCounts.map((n,side)=>Math.ceil(n/Math.min(lanes,laneLimits[side]))));
          if(count && (maxRows-1)*(bh+gap)+size*frameSpan>height-8)continue;
          const frames=Array(count), sides=[[],[]];
          for(let side=0;side<2;side++) {
            const n=sideCounts[side], sideLanes=Math.min(lanes,laneLimits[side]);
            const rows=Math.floor(n/sideLanes), extra=n%sideLanes;
            const packed=[];let index=0, previousShift=0;
            for(let lane=0;lane<sideLanes;lane++) {
              const laneRows=rows+(lane>=sideLanes-extra?1:0);
              if(!laneRows)continue;
              // Equal vertical spacing protects the body gap. The horizontal
              // coordinate follows an ellipse, with both tips turning inward.
              const positions=Array.from({length:laneRows},(_,row)=>row-(laneRows-1)/2).sort((a,b)=>Math.abs(a)-Math.abs(b)||a-b);
              const current=positions.map(row=>{
                const i=side+2*index++, b=shape(companions[i]).box;
                const t=laneRows>1?row/((laneRows-1)/2)*.94:0;
                const f=rect(bow*Math.sqrt(1-t*t)-size*(b[0]+b[2])/256,row*(bh+gap)-size*(b[1]+b[3])/256,size);
                return {i,f,visible:body(f,companions[i])};
              });
              let shift=lane?previousShift+size*.5+gap:0;
              for(const a of current) for(const b of packed) {
                if(a.visible.y<b.y+b.h+gap && b.y<a.visible.y+a.visible.h+gap)
                  shift=Math.max(shift,b.x+b.w+gap-a.visible.x);
              }
              previousShift=shift;
              for(const {i,f,visible} of current) {
                packed.push(translate(visible,shift,0));
                const b=shape(companions[i]).box, cx=f.x+shift+size*(b[0]+b[2])/256;
                sides[side].push({i,f:rect((side?cx:-cx)-size*(b[0]+b[2])/256,f.y,size)});
              }
            }
          }
          let fits=true;
          for(let side=0;side<2;side++) {
            if(!sides[side].length)continue;
            const ex=extent(sides[side].map(v=>v.f));
            if(ex.right-ex.left>sideWidth || ex.bottom-ex.top>height-8){fits=false;break;}
            const x=side ? e.right+coreX+gap-ex.left : e.left+coreX-gap-ex.right;
            const y=height-4-ex.bottom;
            for(const {i,f} of sides[side])frames[i]=translate(f,x,y);
          }
          if(fits){best=frames;break;}
        }
        if(best) {
          const frames=best.map(f=>translate(f,width/2,0));
          return {width,height,size,main:translate(c.main,coreX+width/2,coreY),partner:translate(c.partner,coreX+width/2,coreY),accessory:translate(c.accessory,coreX+width/2,coreY),hearts:c.hearts.map(f=>translate(f,coreX+width/2,coreY)),companions:frames,companionBodies:frames.map((f,i)=>body(f,companions[i]))};
        }
      }
    }
    return null;
  }

  function layoutCast({width,height,mainAsset,hasPartner=false,partnerAsset,hasAccessory=false,companions=[],motionRadius=0}) {
    width=Math.max(240,Math.floor(width));
    motionRadius=Math.max(0,Number(motionRadius)||0);
    if(Number.isFinite(height) && height>=80) {
      const compact=compactCast({width,height:Math.floor(height),mainAsset,hasPartner,partnerAsset,hasAccessory,companions,motionRadius});
      if(compact)return compact;
    }
    const motionGap=2*motionRadius;
    const room=width-16, count=companions.length, m=room>=310?112:104;
    const {main,partner,accessory,hearts,core,coreFrames}=coreCast(m,mainAsset,hasPartner,partnerAsset,hasAccessory,motionGap);
    const heightLimit=count<=6?220:count<=18?Math.min(320,room*.85):count<=26?Math.min(400,room*1.05):Math.max(400,room*1.2);
    let fallback=null, answer=null;
    const presets=[[12.5,40,74,.82,.84],[12.5,40,74,.9,.9],[13,37,65,.82,.84],[13,40,72,.9,.9],[14,42,74,.86,.86],[12,38,70,.78,.84],[13,40,70,1,1]];
    for(let size=count?84:48;size>=24 && !answer;size--) {
      let best=null;
      for(const [near,middle,tip,lane,extra] of presets) {
        const outerRx=room/2-size/2-2, innerRx=count<=12?outerRx:outerRx-size*lane-3;
        for(let ry=48;ry<=360;ry+=2) {
          const outerRy=ry+size*extra+6;
          const n=Math.max(7,Math.ceil(count/2)-6);
          const outer=n===7?[0,-26,26,-50,50,-74,74]:Array.from({length:n},(_,i)=>-78+156*i/(n-1)).sort((a,b)=>Math.abs(a)-Math.abs(b));
          const slots=[...[-near,near,-middle,middle,-tip,tip].map(angle=>[angle,innerRx,ry]),...outer.map(angle=>[angle,outerRx,outerRy])];
          const bodies=[],frames=[];let collision=false;
          for(let i=0;i<count;i++) {
            const [angle,rx,sy]=slots[Math.floor(i/2)],sign=i%2?1:-1,b=shape(companions[i]).box;
            const frame=rect(sign*rx*Math.cos(angle*Math.PI/180)-size*(b[0]+b[2])/256,sy*Math.sin(angle*Math.PI/180)-size*(b[1]+b[3])/256,size);
            const visible=body(frame,companions[i]);
            if(frame.x < -room/2 || frame.x+size>room/2 || [...core,...bodies].some(other=>overlaps(visible,other,4+motionGap))){collision=true;break;}
            frames.push(frame);bodies.push(visible);
          }
          if(collision)continue;
          const all=[...coreFrames,...frames],top=Math.min(...all.map(f=>f.y))-4,bottom=Math.max(...all.map(f=>f.y+f.h))+4;
          const candidate={size,frames,bodies,top,height:Math.ceil(bottom-top)};
          if(!fallback || candidate.height<fallback.height)fallback=candidate;
          if(candidate.height<=heightLimit && (!best || candidate.height<best.height))best=candidate;
          break;
        }
      }
      if(best)answer=best;
    }
    // Unbounded legacy collections still keep every body. Only collections that
    // cannot fit in arcs use extra rows below the core; no saved IDs are removed.
    if(!answer && !fallback) {
      const size=32, spacing=size+4+motionGap, columns=Math.max(1,Math.floor(room/spacing));
      const startY=Math.max(...coreFrames.map(f=>f.y+f.h))+8+motionGap;
      const frames=companions.map((_,i)=>rect((i%columns-(columns-1)/2)*spacing-size/2,startY+Math.floor(i/columns)*spacing,size));
      const top=Math.min(...coreFrames.map(f=>f.y))-4;
      fallback={size,frames,bodies:frames.map((f,i)=>body(f,companions[i])),top,height:Math.ceil(startY+Math.ceil(count/columns)*spacing-top)};
    }
    const result=answer || fallback;
    const move=f=>f?{...f,x:f.x+width/2,y:f.y-result.top}:null;
    return {width,height:result.height,size:result.size,main:move(main),partner:move(partner),accessory:move(accessory),hearts:hearts.map(move),companions:result.frames.map(move),companionBodies:result.bodies.map(move)};
  }
  function layoutHomeCast(args) {
    // Reserve the same compact floor when silent, speaking or being cleaned.
    // The side wings keep every friend above it; dialogue never follows the
    // highest friend/item, and the poops flank it rather than moving below it.
    const conversationHeight=Math.max(0,Number(args.conversationHeight)||0);
    const side=2, top=16, floor=conversationHeight?conversationHeight+12:20;
    const height=Number.isFinite(args.height) ? Math.max(conversationHeight?80:96,args.height-top-floor) : undefined;
    const r=layoutCast({...args,width:args.width-2*side,height});
    const move=f=>translate(f,side,top);
    const result={...r,width:r.width+2*side,height:r.height+top+floor,
      main:move(r.main),partner:move(r.partner),accessory:move(r.accessory),
      hearts:r.hearts.map(move),companions:r.companions.map(move),companionBodies:r.companionBodies.map(move)};
    if(conversationHeight) {
      const main=body(result.main,args.mainAsset), width=Math.min(224,result.width-104);
      // Bias the shared bubble slightly right of the feet. A compact 2x2
      // floor patch on its left keeps poop near even a small painted body.
      const x=Math.max(56,Math.min(result.width-width-12,main.x+main.w/2-48));
      result.conversation=rect(x,main.y+main.h+10,width,conversationHeight);
      result.poops=[0,1,2,3].map(i=>rect(x-24-(i%2)*20,result.conversation.y+4+Math.floor(i/2)*20,16));
    }
    return result;
  }
  const api={layoutCast,layoutHomeCast};
  if(typeof module==='object' && module.exports)module.exports=api;else root.NaotocchiCast=api;
})(typeof window!=='undefined'?window:globalThis);
