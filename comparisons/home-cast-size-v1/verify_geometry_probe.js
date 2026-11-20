// The browser supplies actual sprite frames, the effective foreground clip and
// foot transforms. This probe only runs in the separate QA process.
(() => {
  const rect = node => {
    const r = node.getBoundingClientRect();
    return [r.left, r.top, r.right, r.bottom];
  };
  function imagePaint(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const c = canvas.getContext('2d');
    c.drawImage(image, 0, 0);
    const rgba = c.getImageData(0, 0, canvas.width, canvas.height).data;
    let x1 = canvas.width, x2 = 0, y1 = canvas.height, y2 = 0;
    for (let y=0; y<canvas.height; y++) for (let x=0; x<canvas.width; x++) {
      if (rgba[(y*canvas.width+x)*4+3] < 96) continue;
      x1 = Math.min(x1,x); x2 = Math.max(x2,x+1);
      y1 = Math.min(y1,y); y2 = Math.max(y2,y+1);
    }
    const source = [x1 / canvas.width, y1 / canvas.height, x2 / canvas.width, y2 / canvas.height];
    const frame = rect(image);
    let flip = false;
    for (let n=image; n; n=n.parentElement) {
      const s = getComputedStyle(n);
      if(parseFloat(s.scale)<0) flip=!flip;
      if(s.transform!=='none' && new DOMMatrix(s.transform).a<0) flip=!flip;
    }
    if (flip) [source[0],source[2]]=[1-source[2],1-source[0]];
    return {frame, uncut:source.map((v,i)=>frame[i%2]+v*(frame[2+i%2]-frame[i%2]))};
  }
  window.qaGeometryActors = () => {
    const groups = [...document.querySelectorAll('#castStage [data-diorama-actor]')];
    return groups.flatMap(n => {
      const im=n.querySelector('img.character-asset');
      if (!im || !im.naturalWidth) return [];
      const id=n.dataset.dioramaActor; im.setAttribute('data-qa-key',id);
      return [{id, ...imagePaint(im), z:Number(n.style.zIndex), owner:rect(n),
        mask:getComputedStyle(im).maskImage!=='none'}];
    });
  };
  window.qaGeometryAnchors = () => {
    const stage=document.querySelector('#castStage');
    const boxes=s=>[...stage.querySelectorAll(s)].map(n=>({name:n.id||n.className,box:rect(n),scale:getComputedStyle(n).scale,
        left:n.style.left,top:n.style.top,z:n.style.zIndex}));
    return {shadows:boxes('.diorama-shadow'),equipment:boxes('#petAccessory,.partner-ring,.partner-heart').filter(n=>n.box[2]>n.box[0]),contacts:boxes('.beauty-foot'),
      screen:rect(document.querySelector('.screen-frame')),stage:rect(stage)};
  };
  window.qaGeometrySilhouette = (keys) => {
    let style=document.getElementById('qa-silhouette');
    if(!keys) {style?.remove();return;}
    if(!style) {
      style=document.createElement('style');style.id='qa-silhouette';document.head.appendChild(style);
    }
    const visible=keys.map(id=>'html body img[data-qa-key="'+ CSS.escape(id)+'"]').join(',');
    style.textContent='html,html body{background:#000!important}html body *,html body *::after,html body *::before{visibility:hidden!important}'
      +'html body :has(img[data-qa-key]){filter:none!important}'
      +visible+'{visibility:visible!important;filter:brightness(0) invert(1)!important}';
  };
})();
