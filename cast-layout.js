(function(root) {
  'use strict';
  const bounds = typeof module === 'object' && module.exports ? require('./cast-bounds.js') : root.NaotocchiCastBounds;
  const full = {box:[0,0,128,128],hull:[[0,0],[128,0],[128,128],[0,128]]};
  const rect = (x,y,w,h=w) => ({x,y,w,h});
  const shape = asset => bounds?.[asset] || full;
  const body = (frame,asset) => {
    const b=shape(asset).box;
    return rect(frame.x+frame.w*b[0]/128,frame.y+frame.h*b[1]/128,frame.w*(b[2]-b[0])/128,frame.h*(b[3]-b[1])/128);
  };
  const polygon = (frame,asset) => shape(asset).hull.map(([x,y])=>[frame.x+x*frame.w/128,frame.y+y*frame.h/128]);
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
    const partner=hasPartner?rect(-m/2-p*.18,main.y-p*.4,p):null;
    const accessory=hasAccessory?rect(m/2-38*scale,main.y-12*scale,36*scale):null;
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

  // Use the height left after text, meters and buttons. Pack equal-size friends
  // in two side groups, measuring visible bounds but keeping entire image frames.
  function compactCast(args) {
    const {width,height,mainAsset,hasPartner,partnerAsset,hasAccessory,companions,motionRadius}=args;
    const gap=4+2*motionRadius, room=width-16, count=companions.length;
    const maxMain=Math.min(room>=310?112:104,Math.floor(height*.7));
    for(let m=maxMain;m>=40;m-=2) {
      const c=coreCast(m,mainAsset,hasPartner,partnerAsset,hasAccessory,2*motionRadius);
      const e=extent(c.coreFrames), coreX=-(e.left+e.right)/2, coreY=(height-e.bottom-e.top)/2;
      if(e.bottom-e.top>height-8)continue;
      const sideWidth=(room-(e.right-e.left))/2-gap;
      for(let size=count?72:48;size>=12;size--) {
        let best=null;
        for(let columns=1;columns<=Math.min(4,Math.ceil(count/2)||1);columns++) {
          const bw=Math.max(0,...companions.map(a=>{const b=shape(a).box;return size*(b[2]-b[0])/128;}));
          const bh=Math.max(0,...companions.map(a=>{const b=shape(a).box;return size*(b[3]-b[1])/128;}));
          const frames=Array(count), sides=[[],[]];
          for(let i=0;i<count;i++) {
            const side=i%2, n=Math.ceil((count-side)/2), index=Math.floor(i/2);
            const rows=Math.ceil(n/columns), col=Math.floor(index/rows), row=index%rows;
            const colRows=Math.min(rows,n-col*rows), b=shape(companions[i]).box;
            const f=rect(col*(bw+gap)-size*(b[0]+b[2])/256,(row-(colRows-1)/2)*(bh+gap)-size*(b[1]+b[3])/256,size);
            sides[side].push({i,f});
          }
          let fits=true;
          for(let side=0;side<2;side++) {
            if(!sides[side].length)continue;
            const ex=extent(sides[side].map(v=>v.f));
            if(ex.right-ex.left>sideWidth || ex.bottom-ex.top>height-8){fits=false;break;}
            const x=side ? e.right+coreX+gap-ex.left : e.left+coreX-gap-ex.right;
            const y=(height-ex.bottom-ex.top)/2;
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
    if(Number.isFinite(height) && height>=96) {
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
  const api={layoutCast};
  if(typeof module==='object' && module.exports)module.exports=api;else root.NaotocchiCast=api;
})(typeof window!=='undefined'?window:globalThis);
