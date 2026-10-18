// Read-only image scan. Only generated metadata in the resolver is rewritten.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),file=path.join(root,'relationship-expression.js');
const {SUPPORTED}=require(file);
(async()=>{
 const bounds={};
 for(const [kind,ids] of Object.entries(SUPPORTED))for(const id of ids){
  const box=[128,128,0,0];
  for(const rel of [`assets/characters/${kind==='companion'?'companions':'partners'}/${id}.png`,...['positive','lonely'].map(face=>`assets/characters/relationship/${id}/${face}.png`)]){
   const {data,info}=await sharp(path.join(root,rel)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   if(info.width!==128||info.height!==128)throw Error('Review changed asset dimensions: '+rel);
   for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(data[(y*128+x)*info.channels+info.channels-1]){
    box[0]=Math.min(box[0],x);box[1]=Math.min(box[1],y);box[2]=Math.max(box[2],x+1);box[3]=Math.max(box[3],y+1);
   }
  }
  bounds[id]=box;
 }
 const s=fs.readFileSync(file,'utf8');
 const content='// BEGIN GENERATED RELATIONSHIP BOUNDS\n  const ART_BOUNDS = Object.freeze('+JSON.stringify(bounds)+');\n  // END GENERATED RELATIONSHIP BOUNDS';
 fs.writeFileSync(file,s.replace(/\/\/ BEGIN GENERATED RELATIONSHIP BOUNDS[\s\S]*?\/\/ END GENERATED RELATIONSHIP BOUNDS/,content));
})();
