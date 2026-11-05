// Browser-side probe: transform the image's actual alpha pixels through its
// CSS affine transform. Transparent PNG padding is not visible clipping.
function createPaintedActorProbe() {
  const alphaCache=new Map();
  return function paintedActorRects(node) {
    return [...node.querySelectorAll('img')].filter(img=>img.getClientRects().length&&getComputedStyle(img).visibility!=='hidden').map(img=>{
      const key=img.currentSrc||img.src;
      if(!img.complete||!img.naturalWidth)throw Error('actor image not decoded: '+key);
      let pixels=alphaCache.get(key);
      if(!pixels){
        const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
        const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;pixels=[];
        for(let y=0;y<canvas.height;y++){
          let left=canvas.width,right=-1;
          for(let x=0;x<canvas.width;x++)if(rgba[(y*canvas.width+x)*4+3]){left=Math.min(left,x);right=x;}
          if(right>=left)pixels.push([left,y],[right+1,y],[left,y+1],[right+1,y+1]);
        }
        if(!pixels.length)throw Error('actor image has no painted pixels: '+key);
        alphaCache.set(key,pixels);
      }
      const css=getComputedStyle(img),width=parseFloat(css.width),height=parseFloat(css.height);
      let matrix=new DOMMatrix();
      // Individual rotate/scale compose outside transform; translation and
      // transform origins are recovered from the measured full image box.
      for(let e=img;e&&e.nodeType===1;e=e.parentElement){
        const style=getComputedStyle(e),scale=style.scale==='none'||!style.scale?[1,1]:style.scale.split(/\s+/).map(Number);
        const angle=style.rotate==='none'?0:parseFloat(style.rotate)||0;
        const degrees=style.rotate?.endsWith('rad')?angle*180/Math.PI:style.rotate?.endsWith('turn')?angle*360:angle;
        const zoom=parseFloat(style.zoom)||1;
        matrix=new DOMMatrix().rotate(degrees).scale(scale[0]*zoom,(scale[1]??scale[0])*zoom)
          .multiply(new DOMMatrix(style.transform==='none'?undefined:style.transform)).multiply(matrix);
      }
      const project=(x,y)=>({x:matrix.a*x+matrix.c*y,y:matrix.b*x+matrix.d*y});
      const corners=[[0,0],[width,0],[0,height],[width,height]].map(([x,y])=>project(x,y));
      const rect=img.getBoundingClientRect(),offsetX=rect.left-Math.min(...corners.map(p=>p.x)),offsetY=rect.top-Math.min(...corners.map(p=>p.y));
      const ink=pixels.map(([x,y])=>project(x*width/img.naturalWidth,y*height/img.naturalHeight));
      return {asset:new URL(key).pathname,left:offsetX+Math.min(...ink.map(p=>p.x)),right:offsetX+Math.max(...ink.map(p=>p.x)),top:offsetY+Math.min(...ink.map(p=>p.y)),bottom:offsetY+Math.max(...ink.map(p=>p.y))};
    });
  };
}
module.exports={createPaintedActorProbe};
