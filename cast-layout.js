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
  function layoutCast({width,mainAsset,hasPartner=false,partnerAsset,hasAccessory=false,companions=[]}) {
    width=Math.max(240,Math.floor(width));
    const room=width-16, count=companions.length, m=room>=310?112:104,p=m/2;
    const main=rect(-m/2,-m*.26+8,m);
    const partner=hasPartner?rect(-m/2-p*.18,main.y-p*.4,p):null;
    const accessory=hasAccessory?rect(m/2-38,main.y-12,36):null;
    const mainPoly=polygon(main,mainAsset);
    // Move only the attachment towards the shoulder, never scale/crop artwork.
    if(partner)while(!separated(mainPoly,polygon(partner,partnerAsset),2))partner.y-=1;
    if(accessory)while(!separated(mainPoly,polygon(accessory,null),2) || (partner && !separated(polygon(partner,partnerAsset),polygon(accessory,null),2)))accessory.y-=1;
    const hearts=partner?[rect(partner.x+5,partner.y-24,26),rect(partner.x+p-17,partner.y-12,18)]:[];
    const core=[body(main,mainAsset),...(partner?[body(partner,partnerAsset)]:[]),...(accessory?[accessory]:[]),...hearts];
    const coreFrames=[main,...(partner?[partner]:[]),...(accessory?[accessory]:[]),...hearts];
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
            if(frame.x < -room/2 || frame.x+size>room/2 || [...core,...bodies].some(other=>overlaps(visible,other))){collision=true;break;}
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
      const size=32, columns=Math.max(1,Math.floor(room/(size+4)));
      const startY=Math.max(...coreFrames.map(f=>f.y+f.h))+8;
      const frames=companions.map((_,i)=>rect((i%columns-(columns-1)/2)*(size+4)-size/2,startY+Math.floor(i/columns)*(size+4),size));
      const top=Math.min(...coreFrames.map(f=>f.y))-4;
      fallback={size,frames,bodies:frames.map((f,i)=>body(f,companions[i])),top,height:Math.ceil(startY+Math.ceil(count/columns)*(size+4)-top)};
    }
    const result=answer || fallback;
    const move=f=>f?{...f,x:f.x+width/2,y:f.y-result.top}:null;
    return {width,height:result.height,size:result.size,main:move(main),partner:move(partner),accessory:move(accessory),hearts:hearts.map(move),companions:result.frames.map(move),companionBodies:result.bodies.map(move)};
  }
  const api={layoutCast};
  if(typeof module==='object' && module.exports)module.exports=api;else root.NaotocchiCast=api;
})(typeof window!=='undefined'?window:globalThis);
