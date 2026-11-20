// Injected in the measurement browser only. The production app loads no probe code.
(() => {
  const canvas = () => document.createElement('canvas');
  const tile = canvas(), base = canvas(), copy = canvas();
  const q = window.leafProbe = {rows:[], replaying:false};
  const rgb = Array.from({length:256}, (_, i) => {
    const x = i/255;
    return x <= .04045 ? x/12.92 : ((x+.055)/1.055)**2.4;
  });
  const cielab = (r,g,b) => {
    const f = x => x > .00885645 ? Math.cbrt(x) : 7.787*x+16/116;
    const x = f((.4124564*r+.3575761*g+.1804375*b)/.95047);
    const y = f(.2126729*r+.7151522*g+.072175*b);
    const z = f((.0193339*r+.119192*g+.9503041*b)/1.08883);
    return [116*y-16,500*(x-y),200*(y-z)];
  };
  function color(data, offset) {
    return cielab(rgb[data[offset]],rgb[data[offset+1]],rgb[data[offset+2]]);
  }
  function percentile(values, fraction) {
    values.sort((a,b)=>a-b);
    return values[Math.floor((values.length-1)*fraction)] ?? 0;
  }
  q.setup = (ctx,rect,host,fade,fullBackdrop,contain,compose) => {
    if (fade.previous || !fade.image || !fade.image.complete || !fade.image.naturalWidth) return;
    const source=ctx.canvas, display=source.getBoundingClientRect();
    if (!source.width || !display.width) return;
    q.liveT=window.HomeBeauty.clockSeconds; q.liveRevision=window.HomeBeauty.revision;
    q.dpr=source.width/display.width;
    q.geometry={mode:contain?'contain':fullBackdrop?'cover':'stage', art:{...rect}, cssWidth:display.width,cssHeight:display.height,
      x:display.x,y:display.y, buffer:[source.width,source.height], dpr:q.dpr, viewport:[innerWidth,innerHeight]};
    if (base.width!==source.width || base.height!==source.height) {
      base.width=copy.width=source.width; base.height=copy.height=source.height;
    }
    base.getContext('2d').drawImage(source,0,0);
    q.render = seconds => {
      const work=copy.getContext('2d',{willReadFrequently:true});
      work.setTransform(1,0,0,1,0,0);
      work.drawImage(base,0,0);
      work.setTransform(ctx.getTransform());
      window.HomeBeauty.clockSeconds=seconds;
      q.t=seconds; q.replaying=true; q.rows=[];
      compose(work,rect,host,fade,seconds,false);
      q.replaying=false;
      return q.rows;
    };
  };
  q.leaf = (draw,ctx,args,i,p,x,y,pose) => {
    if (!q.replaying) return draw(ctx,...args);
    const m=ctx.getTransform(), d=q.dpr;
    const u=x+(pose.dx||0),v=y+(pose.dy||0);
    const cx=Math.round(m.a*u+m.c*v+m.e), cy=Math.round(m.b*u+m.d*v+m.f);
    const half=Math.round(26*d),side=2*half,left=cx-half,top=cy-half;
    if (cx < 0 || cy < 0 || cx>=ctx.canvas.width || cy>=ctx.canvas.height ||
        p.phase < .09 || p.phase > .88 || p.alpha < .2) return draw(ctx,...args);
    if (tile.width!==side) tile.width=tile.height=side;
    const mask=tile.getContext('2d',{willReadFrequently:true});
    mask.setTransform(1,0,0,1,0,0); mask.clearRect(0,0,side,side);
    mask.setTransform(m.a,m.b,m.c,m.d,m.e-left,m.f-top);
    mask.globalAlpha=ctx.globalAlpha;
    mask.imageSmoothingEnabled=ctx.imageSmoothingEnabled;
    draw(mask,...args);
    const rgba=mask.getImageData(0,0,side,side).data;
    const before=ctx.getImageData(left,top,side,side);
    draw(ctx,...args);
    const after=ctx.getImageData(left,top,side,side);
    const pixels=[],delta=[];
    let visible=0,mx=0,my=0;
    for(let offset=3;offset<rgba.length;offset+=4) {
      if(rgba[offset]<26) continue;
      const i=(offset-3)/4,x=i%side,y=Math.floor(i/side);
      pixels.push([x,y]); mx+=x; my+=y;
      const a=color(before.data,offset-3), b=color(after.data,offset-3);
      const distance=Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
      delta.push(distance);
      if(distance>=10) visible++;
    }
    if (pixels.some(([x,y])=>left+x<0 || top+y<0 || left+x>=ctx.canvas.width || top+y>=ctx.canvas.height)) return;
    const n=pixels.length;
    mx/=n||1; my/=n||1;
    let xx=0,yy=0,xy=0;
    for(const [x,y] of pixels) {xx+=(x-mx)**2; yy+=(y-my)**2; xy+=(x-mx)*(y-my);}
    const rot=.5*Math.atan2(2*xy,xx-yy),cos=Math.cos(rot),sin=Math.sin(rot);
    const a=pixels.map(([x,y])=>x*cos+y*sin), b=pixels.map(([x,y])=>y*cos-x*sin);
    const span = v => v.length ? (Math.max(...v)-Math.min(...v)+1)/d : 0;
    const row={id:i,t:q.t,z:p.depth,x:cx/d,y:cy/d,face:pose.face,p:p.phase,
      long:span(a),short:span(b),area:n/(d*d),visible:visible/(d*d),delta:percentile(delta,.5)};
    q.rows.push(row);
  };
})();
