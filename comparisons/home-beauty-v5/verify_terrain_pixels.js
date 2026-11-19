// Evaluate this async function at the built comparison origin.
async () => {
  const {drawMountainJungleDesert:draw}=await import('/game/beauty/mountain-jungle-desert.mjs');
  const {DAYPARTS}=await import('/game/home-dayparts.mjs');
  const canvas=document.createElement('canvas');
  canvas.width=336;canvas.height=504;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  function compare(a,b) {
    let changed=0,peak=0;
    for(let i=0;i<a.length;i+=4) {
      const delta=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]));
      if(delta>=2)changed++;
      peak=Math.max(peak,delta);
    }
    return {pixels:changed,peak};
  }
  const rows=[];
  for(const region of ['mountain','jungle','desert']){
    for(const time of ['morning','day','evening','night']){
      const image=new Image();image.src='/game/'+DAYPARTS[region][time];await image.decode();
      const state={region,time,image,width:canvas.width,height:canvas.height,seconds:4,
        strength:1,opacity:1,season:'summer',weather:'sunny',reduced:false};
      function sample(patch) {
        ctx.globalAlpha=1;ctx.drawImage(image,0,0,canvas.width,canvas.height);
        draw(ctx,{...state,...patch});return ctx.getImageData(0,0,canvas.width,canvas.height).data;
      }
      const a=sample({}),b=sample({seconds:12});
      const bare=sample({opacity:0});
      const diff=compare(a,b), off=compare(bare,sample({strength:0}));
      const still=compare(sample({seconds:4,reduced:true}),sample({seconds:12,reduced:true}));
      const boost=compare(a,sample({strength:2}));
      if(!diff.pixels||off.peak!==0||still.peak!==0||!boost.pixels)throw Error(JSON.stringify({region,time,diff,off,still,boost}));
      rows.push({region,time,changed4to12:diff.pixels,peakChange:diff.peak,strongerPixels:boost.pixels,reducedDelta:still.peak,zeroDelta:off.peak});
    }
  }
  return rows;
}
