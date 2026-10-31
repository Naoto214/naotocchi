// Pure 2.5D projection shared by egg and terrain; no renderer dependencies.
export function artTransform(host,stage){
 // Full artwork width is always retained. Bottom ground is pinned to the stage,
 // not the browser's dynamic address bar. Uniform scale prevents stretching.
 const width=Math.min(host.width,stage.width+2*stage.left),height=width*1.5,left=stage.left+stage.width/2-width/2,top=stage.top+stage.height-height*.94;
 return {width,height,left,top,project:p=>({x:left+p.x*width-stage.left,y:top+p.z*height-stage.top}),unproject:p=>({x:(p.x+stage.left-left)/width,z:(p.y+stage.top-top)/height,y:0})};
}
