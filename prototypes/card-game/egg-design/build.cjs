// Derivatives only. Current source is exported by frame-unification/build.mjs; prior imagegen C is retained.
const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'sharp'):'sharp');
(async()=>{
 const source=path.join(__dirname,'original.png'),meta=await sharp(source).metadata();
 if(meta.width*3!==meta.height*2)throw Error('Expected undistorted 2:3 original');
 await sharp(source).withMetadata({density:300}).png().toFile(path.join(__dirname,'egg-card-print.png'));
 for(const [name,width] of [['small',320],['large',1024]])await sharp(source).resize({width,withoutEnlargement:true}).webp({quality:92}).toFile(path.join(__dirname,'../ui-assets/egg-card-'+name+'.webp'));
 const crypto=require('node:crypto');
 const files=['original.png','egg-card-print.png','../ui-assets/egg-card-small.webp','../ui-assets/egg-card-large.webp'];
 const rows=[];for(const name of files){const b=fs.readFileSync(path.join(__dirname,name)),m=await sharp(b).metadata();rows.push({path:name,width:m.width,height:m.height,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});}
 fs.writeFileSync(path.join(__dirname,'assets.json'),JSON.stringify({ratio:'2:3',canonicalEgg:'assets/characters/egg/intact.png',approvedBack:'prototypes/card-game/ui-assets/card-back-approved.png',files:rows},null,2)+'\n');console.log(rows);
})();
