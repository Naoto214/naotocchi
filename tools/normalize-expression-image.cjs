// Normalize a generated transparent expression to its original stage bounds.
const fs=require('fs'),path=require('path'),sharp=require('sharp');
(async()=>{const [source,line,stage,state]=process.argv.slice(2),root=path.resolve(__dirname,'..');
if(!/^[a-z_]+$/.test(line)||!/^0[1-8]$/.test(stage)||!['happy','strained','hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping'].includes(state))throw Error('Invalid species, stage or expression');
// Project the full approved canvas before reading pixels: masters may be larger
// than 128px. Keep the same alpha threshold as the generated expression.
const original=await sharp(`${root}/assets/characters/${line}/${stage}.png`).resize(128,128,{kernel:'nearest'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
let x0=128,y0=128,x1=0,y1=0;for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(original.data[(y*128+x)*4+3]>=128){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
const w=x1-x0+1,h=y1-y0+1;
let {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let i=3;i<data.length;i+=4)data[i]=data[i]>=128?255:0;
let cropped=await sharp(data,{raw:info}).trim().resize(w,h,{fit:'fill',kernel:'nearest'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let i=3;i<cropped.data.length;i+=4)cropped.data[i]=cropped.data[i]>=128?255:0;
// Nearest-neighbor downsampling can drop a one-pixel extremity. Refit the
// resulting opaque crop once; this second pass only scales up to target bounds.
let bx=w,by=h,ex=-1,ey=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(cropped.data[(y*w+x)*4+3]){bx=Math.min(bx,x);by=Math.min(by,y);ex=Math.max(ex,x);ey=Math.max(ey,y);}
if(ex<0)throw Error('Generated sprite is empty');
if(bx!==0||by!==0||ex!==w-1||ey!==h-1)cropped=await sharp(cropped.data,{raw:cropped.info}).extract({left:bx,top:by,width:ex-bx+1,height:ey-by+1}).resize(w,h,{fit:'fill',kernel:'nearest'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const out=`${root}/assets/characters/expressions/${line}/${stage}-${state}.png`;fs.mkdirSync(path.dirname(out),{recursive:true});
await sharp(cropped.data,{raw:cropped.info}).extend({left:x0,top:y0,right:128-x0-w,bottom:128-y0-h,background:{r:0,g:0,b:0,alpha:0}}).png({palette:false}).toFile(out);console.log(out);
})();
