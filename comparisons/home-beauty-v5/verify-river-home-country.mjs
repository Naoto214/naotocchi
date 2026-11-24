// Evaluate in a browser on the comparison origin; all art URLs come from the built manifest.
export async function verifyRiverHomeCountry() {
  const {drawRiverHomeCountry,artFootprints}=await import('/game/beauty/river-home-country.mjs');
  const {DAYPARTS}=await import('/game/home-dayparts.mjs');
  const width=320,height=480,canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  function mask(poly){
    const result=new Path2D();
    poly.forEach(([u,v],i)=>result[i?'lineTo':'moveTo'](u*width/1000,v*height/1500));
    result.closePath();return result;
  }
  const path={river:mask(artFootprints.river),pane:mask(artFootprints.pane)};
  function diff(a,b){
    let count=0;
    for(let i=0;i<a.length;i+=4)if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>=4)count++;
    return count;
  }
  const records=[];
  for(const region of ['river_lake','home','countryside']) for(const time of ['morning','day','evening','night']){
    const image=new Image();image.src='/game/'+DAYPARTS[region][time];await image.decode();
    const state={region,time,image,width,height,strength:1,season:'summer',opacity:1,weather:region==='home'?'rain':'sunny'};
    function render(s,original=true){
      ctx.clearRect(0,0,width,height);
      if(original)ctx.drawImage(image,0,0,width,height);
      drawRiverHomeCountry(ctx,{...state,...s});
      return ctx.getImageData(0,0,width,height).data;
    }
    const active=diff(render({seconds:11}),render({seconds:17})),reduced=diff(render({reduced:true,seconds:8}),render({reduced:true,seconds:188}));
    const boosted=diff(render({strength:1,seconds:16}),render({strength:2,seconds:16}));
    let outside=0,ink=0;
    if(region!=='countryside'){
      const p=region==='home'?path.pane:path.river;
      for(const seconds of [3,15,59,182]){
        const rgba=render({seconds,effects:region==='home'?{light:false}:{}},false);
        for(let i=0;i<width*height;i++){
          if(rgba[i*4+3]<6)continue;
          ink++;const x=i%width,y=Math.floor(i/width);
          if(![[0,0],[1,0],[1,1],[0,1],[.5,.5]].some(([a,b])=>ctx.isPointInPath(p,x+a,y+b)))outside++;
        }
      }
    }
    if(!active||!boosted||reduced||outside||(region!=='countryside'&&!ink))throw Error(JSON.stringify({region,time,active,reduced,boosted,outside,ink}));
    records.push({region,time,active,reduced,boosted,outside,ink});
  }
  return records;
}
