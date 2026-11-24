// Exercise the actual compositing entry point on decoded originals. Rendering this
// small diagnostic surface deliberately excludes resident DOM and device timing.
async () => {
  const {composeNature} = await import('/game/beauty/paint.mjs');
  const {DAYPARTS} = await import('/game/home-dayparts.mjs');
  const cv = document.createElement('canvas');
  cv.width=160; cv.height=240;
  const ctx=cv.getContext('2d',{willReadFrequently:true});
  const rect={left:0,top:0,width:cv.width,height:cv.height};
  const effects=Object.fromEntries(['water','particles','light','contact','motion','canopy','shafts','depth','gusts','magic','ground','waves','foam','caustics','reflections'].map(k=>[k,true]));
  window.HomeBeauty={sampleClock:x=>x};
  function render(im,s,clock,reduced){
    HomeBeauty.settings={...s,effects};
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    ctx.drawImage(im,0,0,cv.width,cv.height);
    if(s) composeNature(ctx,rect,rect,{previous:null,image:im,alpha:1},clock,reduced);
    return ctx.getImageData(0,0,cv.width,cv.height).data;
  }
  function distinct(a,b){
    let changed=0;
    for(let i=0;i<a.length;i+=4){
      if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>=4) changed++;
    }
    return changed;
  }
  const results={};
  for(const region of ['forest','sea']){
    for(const time of ['morning','day','evening','night']){
      const im=new Image();im.src='/game/'+DAYPARTS[region][time];await im.decode();
      const base=render(im,null,0,false);
      for(const variant of ['D3','E1','E2','E3']){
        const s={region,time,variant,season:'summer',weather:'sunny',strength:1};
        const start=render(im,s,23.25,true);
        const still=render(im,s,57,true);
        const normal=render(im,s,23.25,false);
        const zero=render(im,{...s,strength:0},23.25,false);
        const strong=render(im,{...s,strength:2},23.25,false);
        let conditions=0,minimum=Infinity,maximum=0,weatherDelta=0,seasonDelta=0;
        for(const season of ['spring','summer','autumn','winter']) {
          let fair;
          for(const weather of ['sunny','cloudy','rain','snow']){
            const frame=render(im,{...s,season,weather},23.25,false);
            const delta=distinct(base,frame);
            minimum=Math.min(minimum,delta);maximum=Math.max(maximum,delta);
            if(weather==='sunny') {fair=frame;seasonDelta=Math.max(seasonDelta,distinct(frame,normal));}
            else weatherDelta=Math.max(weatherDelta,distinct(fair,frame));
            conditions++;
          }
        }
        results[region+'/'+time+'/'+variant]={conditions,minPixelsFromArt:minimum,maxPixelsFromArt:maximum,
          maxWeatherDifference:weatherDelta,maxSeasonDifference:seasonDelta,zeroPixels:distinct(base,zero),
          doubleDifference:distinct(normal,strong),reducedTemporalDifference:distinct(start,still)};
      }
    }
  }
  return results;
}
