// Run from a browser on the local comparison origin. Samples rendered pixels
// in original painting coordinates, independently of the CSS viewport crop.
export async function auditWater(base = '/game/beauty/nature.mjs') {
  const {drawNature,waterMask} = await import(base);
  const canvas=document.createElement('canvas');
  canvas.width=256;
  canvas.height=384;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const records=[];
  for(const region of ['sea','memory_lake']){
    const vertices=waterMask(region), mask=new Path2D();
    vertices.forEach(([x,y],i)=>mask[i?'lineTo':'moveTo'](x*canvas.width,y*canvas.height));
    mask.closePath();
    for(const time of ['morning','day','evening','night']){
      let ink=0,outside=0;
      for(const seconds of [0,7,23,46]){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        drawNature(ctx,{region,time,season:'summer',weather:'sunny',variant:'C',seconds,
          width:canvas.width,height:canvas.height,opacity:1,reduced:false,
          effects:{water:true,light:false,particles:false,contact:false}});
        const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        for(let i=0;i<canvas.width*canvas.height;i++){
          if(rgba[i*4+3]<6)continue;
          ink++;
          const x=i%canvas.width,y=Math.floor(i/canvas.width);
          // Include edge antialiasing on the four pixel corners.
          if(![[0,0],[1,0],[0,1],[1,1],[.5,.5]].some(([dx,dy])=>ctx.isPointInPath(mask,x+dx,y+dy)))outside++;
        }
      }
      records.push({region,time,ink,outside});
    }
  }
  if(records.some(row=>!row.ink||row.outside))throw Error(JSON.stringify(records));
  return records;
}
