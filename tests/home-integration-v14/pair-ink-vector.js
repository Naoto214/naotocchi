// Sample the approved image alpha at CSS pixel centres, preserving this pose's
// CSS transform, body scale, depth and facing. Translate only the mate's image.
regional.measureOpening = function() {
  const actors=model.snapshot(), hero=actors.find(a=>a.kind==='pet'), mate=actors.find(a=>a.kind==='partner');
  const feet=regional.placement().feet, petFoot=feet.find(a=>a.kind==='pet'), mateFoot=feet.find(a=>a.kind==='partner');
  function imageMask(actor) {
    const image=rows.get(actor.key).owner.querySelector('img.character-asset');
    const css=env.getComputedStyle(image),rect=image.getBoundingClientRect(),matrix=spriteBasis(image);
    const width=parseFloat(css.width),height=parseFloat(css.height);
    const canvas=doc.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const {a,b,c,d}=matrix,det=a*d-c*b,fit=Math.min(width/canvas.width,height/canvas.height);
    const left=rect.left-Math.min(0,a*width,c*height,a*width+c*height);
    const top=rect.top-Math.min(0,b*width,d*height,b*width+d*height);
    function opaque(x,y) {
      const dx=x-left,dy=y-top;
      const u=Math.floor(((d*dx-c*dy)/det-(width-canvas.width*fit)/2)/fit);
      const v=Math.floor(((-b*dx+a*dy)/det-(height-canvas.height*fit)/2)/fit);
      return u>=0&&u<canvas.width&&v>=0&&v<canvas.height&&data[(v*canvas.width+u)*4+3]>=64;
    }
    const pixels=[];
    for(let y=Math.floor(rect.top);y<Math.ceil(rect.bottom);y++){
      for(let x=Math.floor(rect.left);x<Math.ceil(rect.right);x++)if(opaque(x+.5,y+.5))pixels.push([x+.5,y+.5]);
    }
    return {pixels,opaque};
  }
  const a=imageMask(hero),b=imageMask(mate);
  const wanted=petFoot.screen.map((x,i)=>x+mateFoot.solverScreen[i]-petFoot.solverScreen[i]);
  const tx=wanted[0]-mateFoot.screen[0],ty=wanted[1]-mateFoot.screen[1];
  const side=Math.sign(mateFoot.solverScreen[0]-petFoot.solverScreen[0]);
  const overlap=(ox,oy)=>a.pixels.filter(([x,y])=>b.opaque(x-ox,y-oy)).length;
  const bounds=model.bounds(mate),view=env.NaotocchiHomeViewport.residentPresentation();
  let firstAlpha=null,firstLegal=null;
  for(let extra=0;extra<=180;extra+=.25){
    const ox=tx+side*extra;
    if(a.pixels.some(([x,y])=>b.opaque(x-ox,y-ty)))continue;
    if(firstAlpha===null)firstAlpha=extra;
    const p={x:mate.x+ox/view.scaleX,y:mate.y+ty/view.scaleY};
    if(p.x<bounds.left||p.x>bounds.right||p.y<bounds.top||p.y>bounds.bottom)continue;
    if(!scene.navigation.valid(p)||!scene.visible(p,mate))continue;
    if(actors.some(other=>other!==mate&&Math.hypot((p.x-other.x)/((mate.w+other.w)*.5+10),(p.y-other.y)/((mate.h+other.h)*.38+10))<1))continue;
    firstLegal=extra;break;
  }
  return {heroPixels:a.pixels.length,matePixels:b.pixels.length,currentOverlap:overlap(0,0),
    translatedOverlap:overlap(tx,ty),firstAlpha,firstLegal,side,current:mateFoot.screen,wanted,hero:petFoot.screen};
};
