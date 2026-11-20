// QA only. Sample original PNG texels and the DOM's actual paint stack at press.
(() => {
  const cache=new Map();
  function imageData(img) {
    if(cache.has(img.currentSrc))return cache.get(img.currentSrc);
    const layer=document.createElement('canvas');
    layer.width=img.naturalWidth;layer.height=img.naturalHeight;
    const g=layer.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
    const data=g.getImageData(0,0,layer.width,layer.height);
    cache.set(img.currentSrc,data);return data;
  }
  function clipped(img,local) {
    const url=img.style.maskImage||img.style.webkitMaskImage;
    if(!url||url==='none')return false;
    const xml=decodeURIComponent(url.split(',').slice(1).join(',')).replace(/["']?\)$/,'');
    const polygons=[...xml.matchAll(/<polygon\b[^>]*points="([^"]+)"/g)];
    return polygons.some(([,points])=>{
      const vertices=points.trim().split(/\s+/).map(v=>v.split(',').map(Number));
      let odd=false;for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){
        const a=vertices[i],b=vertices[j];
        if((a[1]>local.y)!==(b[1]>local.y)&&local.x<(b[0]-a[0])*(local.y-a[1])/(b[1]-a[1])+a[0])odd=!odd;
      }
      return odd;
    });
  }
  function alpha(owner,x,y) {
    const img=owner.querySelector('img.character-asset');
    if(!img?.complete||!img.naturalWidth)return {alpha:null};
    const rect=img.getBoundingClientRect(),style=getComputedStyle(img);
    if(!rect.width||!rect.height)return {alpha:null};
    if(x<rect.left||x>=rect.right||y<rect.top||y>=rect.bottom)return {alpha:0,outside:true};
    const width=parseFloat(style.width),height=parseFloat(style.height);
    let matrix=new DOMMatrix();
    for(let node=img;node;node=node.parentElement) {
      const s=getComputedStyle(node);
      const sz=s.scale==='none'?[1,1]:s.scale.split(/\s+/).map(Number);
      const rotate=s.rotate==='none'?0:parseFloat(s.rotate)||0;
      const deg=s.rotate.endsWith('rad')?rotate*180/Math.PI:s.rotate.endsWith('turn')?rotate*360:rotate;
      const zoom=parseFloat(s.zoom)||1;
      matrix=new DOMMatrix().rotate(deg).scale(sz[0]*zoom,(sz[1]??sz[0])*zoom).multiply(new DOMMatrix(s.transform==='none'?undefined:s.transform)).multiply(matrix);
    }
    const linear=(x,y)=>({x:matrix.a*x+matrix.c*y,y:matrix.b*x+matrix.d*y});
    const corners=[[0,0],[0,height],[width,0],[width,height]].map(v=>linear(...v));
    const tx=rect.left-Math.min(...corners.map(v=>v.x)),ty=rect.top-Math.min(...corners.map(v=>v.y));
    const local=new DOMMatrix([matrix.a,matrix.b,matrix.c,matrix.d,tx,ty]).inverse().transformPoint(new DOMPoint(x,y));
    const fit=Math.min(width/img.naturalWidth,height/img.naturalHeight);
    const u=Math.floor((local.x-(width-img.naturalWidth*fit)/2)/fit),v=Math.floor((local.y-(height-img.naturalHeight*fit)/2)/fit);
    if(u<0||v<0||u>=img.naturalWidth||v>=img.naturalHeight)return {alpha:0,outside:true};
    const source=imageData(img).data[4*(v*img.naturalWidth+u)+3],masked=clipped(img,local);
    return {alpha:masked?0:source,sourceAlpha:source,masked,texel:[u,v]};
  }
  const audit={
    at(x,y) {
      const owners=[...new Set(document.elementsFromPoint(x,y).map(el=>el.closest('[data-diorama-actor]')).filter(Boolean))];
      const stack=owners.map(o=>({key:o.dataset.dioramaActor,z:Number(o.style.zIndex),...alpha(o,x,y)}));
      return {x,y,stack,foreground:stack.find(v=>v.alpha>0)?.key||null};
    }
  };
  window.mobilitySelectionQA=audit;
  document.addEventListener('pointerdown',e=>{
    if(audit.recordNext){audit.last=audit.at(e.clientX,e.clientY);audit.recordNext=false;}
  },true);
})();
