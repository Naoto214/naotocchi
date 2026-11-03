// QA-only capture: preserve the legacy world and overlay, including WebGL's
// non-preserved drawing buffer, by drawing and copying in the same task.
export function captureBackground(host,world){
 if(!host)return null;
 world?.draw(0);
 const r=host.getBoundingClientRect(),canvas=host.ownerDocument.createElement('canvas');canvas.width=Math.round(r.width);canvas.height=Math.round(r.height);
 const ctx=canvas.getContext('2d');
 for(const layer of host.querySelectorAll('canvas')){if(layer.style.display==='none')continue;const b=layer.getBoundingClientRect();if(b.width&&b.height)ctx.drawImage(layer,b.left-r.left,b.top-r.top,b.width,b.height);}
 return canvas;
}
if(typeof window!=='undefined')window.HomeV6Capture=captureBackground;
