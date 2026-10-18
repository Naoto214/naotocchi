// Browser QA measures the approved glyph, not its transparent atlas square.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
async function loadRingBounds(){
 const root=path.resolve(__dirname,'../..'),ctx={};
 vm.runInNewContext(fs.readFileSync(path.join(root,'illustration-catalog.js'),'utf8'),ctx);
 const entry=ctx.NaotocchiIllustrationCatalog.create({uiKeys:{'💍':'ring'},atlases:{ui:'assets/ui/world-items-atlas-v1.png'}}).resolve('💍');
 const [left,top,width,height]=entry.frame;
 const {data,info}=await require('sharp')(path.join(root,entry.image)).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let x0=width,y0=height,x1=0,y1=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*info.channels+3]>0){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}
 assert.ok(x1>x0 && y1>y0,'ring atlas must contain painted pixels');
 return {image:entry.image,width,height,box:[x0,y0,x1,y1]};
}
function paintedRing(r,b){return {x:r.x+r.w*b.box[0]/b.width,y:r.y+r.h*b.box[1]/b.height,w:r.w*(b.box[2]-b.box[0])/b.width,h:r.h*(b.box[3]-b.box[1])/b.height};}
function noIntersection(a,b){return a.x+a.w<=b.x+.01 || b.x+b.w<=a.x+.01 || a.y+a.h<=b.y+.01 || b.y+b.h<=a.y+.01;}
function assertApprovedRing(r,label){
 assert.ok(r.baseW>=15 && r.baseW<=23 && Math.abs(r.baseH-r.baseW)<.01,label+': ring solver size');
 assert.ok(Math.abs(r.scaleX-1.2)<.001 && Math.abs(r.scaleY-1.2)<.001,label+': approved ring scale');
 assert.ok(Math.abs(r.originX-r.baseW/2)<.01 && Math.abs(r.originY-r.baseH/2)<.01,label+': ring center origin');
 assert.ok(Math.abs(r.w-r.baseW*1.2)<.1 && Math.abs(r.h-r.baseH*1.2)<.1,label+': rendered ring size');
 assert.ok(r.glyph && ['x','y','w','h'].every(k=>Number.isFinite(r.glyph[k])) && r.glyph.w>0 && r.glyph.h>0,label+': ring atlas glyph missing or collapsed');
}
module.exports={loadRingBounds,paintedRing,noIntersection,assertApprovedRing};
