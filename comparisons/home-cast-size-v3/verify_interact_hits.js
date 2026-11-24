// Actual image coordinates and the official hit() result, sampled without
// pointing at, selecting, or rerouting the residents being compared.
(() => {
  const masks = new Map();
  function inkPoints(image) {
    if (masks.has(image.currentSrc)) return masks.get(image.currentSrc);
    const c = document.createElement('canvas');
    c.width = image.naturalWidth; c.height = image.naturalHeight;
    if (!c.width || !c.height) throw Error('Resident image has not decoded');
    const ctx = c.getContext('2d', {willReadFrequently:true});
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0,0,c.width,c.height).data;
    const pixels = [];
    let xmin = c.width, xmax = 0, ymin = c.height, ymax = 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (data[(y*c.width+x)*4+3] < 200) continue;
      pixels.push([x,y]); xmin=Math.min(xmin,x); xmax=Math.max(xmax,x);
      ymin=Math.min(ymin,y); ymax=Math.max(ymax,y);
    }
    if (!pixels.length) throw Error('Empty resident ink mask');
    const points = [[.50,.35],[.35,.60],[.65,.60]].map(([fx,fy])=>{
      const tx=xmin+(xmax-xmin)*fx, ty=ymin+(ymax-ymin)*fy;
      let nearest=null, distance=Infinity;
      for (const pixel of pixels) {
        const d=(pixel[0]-tx)**2+(pixel[1]-ty)**2;
        if (d<distance) {nearest=pixel;distance=d;}
      }
      return [(nearest[0]+.5)/c.width,(nearest[1]+.5)/c.height];
    });
    masks.set(image.currentSrc,points);
    return points;
  }
  window.qaTapPoints = owner => {
    const img=owner.querySelector('img.character-asset'), r=img.getBoundingClientRect();
    let flipped=false;
    for(let n=img;n;n=n.parentElement){
      const style=getComputedStyle(n);
      if(parseFloat(style.scale)<0)flipped=!flipped;
      if(style.transform!=='none' && new DOMMatrix(style.transform).a<0)flipped=!flipped;
    }
    return inkPoints(img).map(([x,y])=>[r.left+r.width*(flipped?1-x:x),r.top+r.height*y]);
  };
  window.qaTapHits = () => {
    const roles={pet:[0,0],partner:[0,0],companion:[0,0]},zero=[];
    for(const owner of document.querySelectorAll('#castStage [data-diorama-actor]')){
      const key=owner.dataset.dioramaActor, role=key.split(':')[0];
      const points=qaTapPoints(owner);
      const successful=points.filter(([x,y])=>window.qaNativeHit(x,y)===key).length;
      roles[role][0]+=successful; roles[role][1]+=points.length;
      if(!successful)zero.push(key);
    }
    return {roles,zero};
  };
})();
