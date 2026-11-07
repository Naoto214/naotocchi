import fs from 'node:fs';import{createRequire}from'node:module';
const sharp=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
const dir=new URL('light/',import.meta.url);fs.mkdirSync(dir,{recursive:true});let sizes={};
for(const id of ['M0','M1','M2','M3','G0','G1','G2','R0','R1','R2','FA','FB','FC','S1','S2','S3','V11E','stand-A','stand-B','stand-C']){
 let s=sharp(new URL(`evidence/${id}.png`,import.meta.url).pathname);
 if(id.startsWith('G'))s=s.extract({left:239,top:414,width:595,height:220});
 if(id.startsWith('R'))s=s.extract({left:416,top:592,width:240,height:240});
 await s.resize(id.startsWith('stand')?900:id.startsWith('G')?700:640).flatten({background:'#f5f6f5'}).jpeg({quality:78,mozjpeg:true}).toFile(new URL(id+'.jpg',dir).pathname);
 sizes[id]=fs.statSync(new URL(id+'.jpg',dir)).size;
}
for(const id of ['M0','M1','M2','M3','FA','FB','FC']){
 const main=id.startsWith('M'),box=main?{left:149,top:269,width:155,height:140}:{left:416,top:592,width:240,height:240};
 const name=id+(main?'-ten':'-roman');await sharp(new URL(`evidence/${id}.png`,import.meta.url).pathname).extract(box).resize(480).flatten({background:'#f5f6f5'}).jpeg({quality:80,mozjpeg:true}).toFile(new URL(name+'.jpg',dir).pathname);sizes[name]=fs.statSync(new URL(name+'.jpg',dir)).size;
}
fs.writeFileSync(new URL('sizes.json',dir),JSON.stringify(sizes,null,2));console.log({count:Object.keys(sizes).length,max:Math.max(...Object.values(sizes)),first:sizes.M1,total:Object.values(sizes).reduce((a,b)=>a+b,0)});
