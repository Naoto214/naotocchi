// Run on the preview origin using verify_v3.py pixels. Coordinates span the
// uncropped artwork; the mobile viewport crop is checked separately in UI tests.
export async function verifyV3Pixels(){
  const {drawFullMotion,forestWind}=await import('/game/beauty/full-motion.mjs');
  const {drawNature}=await import('/game/beauty/nature.mjs');
  const {DAYPARTS}=await import('/game/home-dayparts.mjs');
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=480;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const stages={forest:['day','summer','sunny'],sea:['evening','summer','rain'],snow:['evening','winter','snow'],city:['night','autumn','rain'],memory_lake:['night','summer','sunny']};
  const records={};
  function changed(a,b){
    let n=0,maximum=0;
    for(let i=0;i<a.length;i+=4){
      const delta=Math.max(...[0,1,2].map(k=>Math.abs(a[i+k]-b[i+k])));
      if(delta>=4)n++;maximum=Math.max(maximum,delta);
    }
    return {pixels:n,percent:+(100*n/(a.length/4)).toFixed(3),maxChannel:maximum};
  }
  for(const [region,[time,season,weather]] of Object.entries(stages)){
    const img=new Image();img.src='/game/'+DAYPARTS[region][time];await img.decode();
    const settings={region,time,season,weather,image:img,width:320,height:480,variant:'D3',opacity:1,strength:1,effects:{motion:true,water:true,particles:true,light:true}};
    function frame(t,patch={}){
      ctx.clearRect(0,0,320,480);ctx.drawImage(img,0,0,320,480);
      const state={...settings,seconds:t,...patch};
      (['B','C'].includes(state.variant)?drawNature:drawFullMotion)(ctx,state);
      return ctx.getImageData(0,0,320,480).data;
    }
    const zero=frame(13,{strength:0}), still=frame(13,{reduced:true}), sampled=[30,60,180];
    const keyframes=Object.fromEntries(sampled.map(t=>[t,changed(frame(t),frame(t+1))]));
    const atPeak={};for(const variant of ['B','C','D1','D2','D3'])atPeak[variant]=changed(zero,frame(57,{variant}));
    const reduced=changed(still,frame(60,{reduced:true}));
    const noStrength=changed(zero,frame(60,{strength:0}));
    if(reduced.maxChannel||noStrength.maxChannel||Object.values(keyframes).some(d=>d.pixels===0))throw Error('Motion/reduced-motion check failed in '+region);
    records[region]={keyframes,atPeak,reduced,noStrength};
  }
  records.forestWind=[13,30,57,60,108,173,180,213].map(t=>[t,+forestWind(t).gust.toFixed(3)]);
  return records;
}
