// Evaluate on the isolated comparison origin using Playwright page.evaluate.
// Same full painting, same clock, no resident/UI draw in the pixel measurements.
async () => {
  const {drawSnowCityLake}=await import('/game/beauty/snow-city-lake.mjs');
  const {drawFullMotion}=await import('/game/beauty/full-motion.mjs');
  const {DAYPARTS}=await import('/game/home-dayparts.mjs');
  const canvas=document.createElement('canvas'); canvas.width=320; canvas.height=480;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const rows=[];
  function difference(a,b) {
    let count=0;
    for(let i=0;i<a.length;i+=4){
      if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>9)count++;
    }
    return count;
  }
  for(const region of ['snow','city','memory_lake'])for(const time of ['morning','day','evening','night']){
    const image=new Image(); image.src='/game/'+DAYPARTS[region][time]; await image.decode();
    const weather=region==='snow'?'snow':'rain';
    function frame(variant,changes={}){
      ctx.globalAlpha=1; ctx.drawImage(image,0,0,320,480);
      const s={region,time,variant,image,width:320,height:480,seconds:13.25,season:'winter',weather,strength:1,opacity:1,effects:{},...changes};
      (variant==='E3'?drawSnowCityLake:drawFullMotion)(ctx,s);
      return ctx.getImageData(0,0,320,480).data;
    }
    const base=frame('D3'),e=frame('E3');
    const e2=frame('E3',{seconds:14.25}),red=frame('E3',{reduced:true});
    const red2=frame('E3',{reduced:true,seconds:90}),peak=frame('E3',{strength:2}),mid=frame('E3',{strength:1.5});
    const row={region,time,delta:difference(base,e),motion:difference(e,e2),reduced:difference(red,red2),upperSlider:difference(mid,peak)};
    if(region==='memory_lake')row.weatherDifference=difference(e,frame('E3',{weather:'snow'}));
    rows.push(row);
  }
  if(rows.some(r=>!r.delta||!r.motion||r.reduced||!r.upperSlider||r.weatherDifference))throw Error(JSON.stringify(rows));
  return rows;
}
