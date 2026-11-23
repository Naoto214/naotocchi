// Read-only ink sampling. The production selection handler receives each touch.
    function spriteBasis(n){
        let m=new env.DOMMatrix();
        for(let e=n;e&&e.nodeType===1;e=e.parentElement){
          const css=env.getComputedStyle(e),scale=css.scale==='none'||!css.scale?[1,1]:css.scale.split(/\s+/).map(Number);
          const angle=css.rotate==='none'?0:parseFloat(css.rotate)||0,deg=css.rotate?.endsWith('rad')?angle*180/Math.PI:css.rotate?.endsWith('turn')?angle*360:angle;
          const zoom=parseFloat(css.zoom)||1;
          const own=new env.DOMMatrix().rotate(deg).scale((scale[0]||1)*zoom,(scale[1]??scale[0]??1)*zoom).multiply(new env.DOMMatrix(css.transform==='none'?undefined:css.transform));
          m=own.multiply(m);
        }
      return m;
    }
    const inside=(x,y,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const u=poly[i],v=poly[j];if((u[1]>y)!==(v[1]>y)&&x<(v[0]-u[0])*(y-u[1])/(v[1]-u[1])+u[0])yes=!yes;}return yes;};
    let selectionCanvas;
    function paintedAlpha(key, p, x, y) {
      const row=rows.get(key), img=row?.owner?.querySelector('img.character-asset');
      if(!img?.complete||!img.naturalWidth||!img.naturalHeight)return null;
      const rect=img.getBoundingClientRect();
      if(!rect.width||!rect.height)return null;
      if(x<rect.left||x>=rect.right||y<rect.top||y>=rect.bottom)return 0;
      const css=env.getComputedStyle(img);
      if(css.objectFit!=='contain'||css.objectPosition!=='50% 50%'||css.visibility!=='visible')return null;
      const width=parseFloat(css.width),height=parseFloat(css.height);
      if(!(width>0&&height>0))return null;
      const basis=spriteBasis(img);
      const local=localOcclusionPolygons([[[x,y]]],rect,width,height,[basis.a,basis.b,basis.c,basis.d])[0]?.[0];
      if(!local)return null;
      const fit=Math.min(width/img.naturalWidth,height/img.naturalHeight);
      const sx=Math.floor((local[0]-(width-img.naturalWidth*fit)/2)/fit);
      const sy=Math.floor((local[1]-(height-img.naturalHeight*fit)/2)/fit);
      if(sx<0||sy<0||sx>=img.naturalWidth||sy>=img.naturalHeight)return 0;
      if(img.style.maskImage||img.style.webkitMaskImage){
        const actor=model.snapshot().find(a=>a.key===key);
        if(!actor||!worldHost)return null;
        const sr=displayRect(stage),host=displayRect(worldHost);
        if(polygonsAt(actor).some(poly=>inside(p.x+sr.left-host.left,p.y+sr.top-host.top,poly)))return 0;
      }
      // Sampling one source texel avoids decoding a complete RGBA frame in JS.
      if(!selectionCanvas){
        const canvas=doc.createElement('canvas');canvas.width=canvas.height=1;
        selectionCanvas=canvas.getContext('2d',{willReadFrequently:true});
      }
      if(!selectionCanvas)return null;
      try {
        selectionCanvas.clearRect(0,0,1,1);
        selectionCanvas.drawImage(img,sx,sy,1,1,0,0,1,1);
        return selectionCanvas.getImageData(0,0,1,1).data[3];
      } catch (_) {
        selectionCanvas=null;
        return null;
      }
    }
window.residentTouches = {
  ready: () => model.snapshot().length===28 && !pendingResidentPresentation && !blocked() &&
    !!world?.stats().loaded && [...rows.values()].every(r=>r.owner.querySelector('img.character-asset')?.naturalWidth),
  keys: () => model.snapshot().map(a=>a.key),
  prepare(key) {
    const box=rows.get(key).owner.querySelector('img.character-asset').getBoundingClientRect();
    let from;
    const steps=[.5,.4,.6,.3,.7,.2,.8,.1,.9,.05,.95];
    for (const dy of steps) {
      for (const dx of steps) {
        const x=Math.round(box.left+box.width*dx),y=Math.round(box.top+box.height*dy);
        const target=document.elementFromPoint(x,y);
        if (!stage.contains(target) || target.closest('button,a,input,select,textarea')) continue;
        const event={clientX:x,clientY:y}, p=point(event);
        const alpha=paintedAlpha(key,p,x,y);
        if (alpha===null || alpha<128) continue;
        const stack = [...new Set(document.elementsFromPoint(x,y).map(el =>
          el.closest('[data-diorama-actor]')?.dataset.dioramaActor).filter(Boolean))];
        const visibleKey = stack.find(k => {
          const opacity = paintedAlpha(k,p,x,y);
          return opacity === null || opacity > 0;
        });
        if (visibleKey === key) {from=[x,y];break;}
      }
      if(from)break;
    }

    return {key,from:from||null};
  }, selected:()=>model.selected(), blocked:()=>blocked()
};
