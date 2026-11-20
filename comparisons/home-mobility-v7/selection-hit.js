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
    function hit(p,target,event) {
      const fallback=rectangleHit(p,target);
      if(!fallback||!doc.elementsFromPoint||!env.DOMMatrix)return fallback;
      const owner=target?.closest?.('[data-diorama-actor]');
      if(owner?.dataset.dioramaActor!==fallback)return fallback;
      let x=event?.clientX,y=event?.clientY;
      if(!Number.isFinite(x+y)){
        const r=displayRect(stage),v=env.NaotocchiHomeViewport?.residentPresentation?.();
        x=p.x+r.left;y=p.y+r.top;
        if(v){x=v.x+(x-v.x)*v.scaleX;y=v.y+(y-v.y)*v.scaleY;}
      }
      const stack=[];
      for(const element of doc.elementsFromPoint(x,y)){
        const key=element.closest?.('[data-diorama-actor]')?.dataset.dioramaActor;
        if(key&&rows.has(key)&&!stack.includes(key))stack.push(key);
      }
      if(stack.length<2||stack[0]!==fallback)return fallback;
      for(const key of stack){
        const alpha=paintedAlpha(key,p,x,y);
        if(alpha===null||alpha>0&&alpha<128)return fallback;
        if(alpha>=128)return key;
      }
      return fallback;
    }
