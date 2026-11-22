// Exact V18 delta over frozen main. Historical approval manifests remain unchanged.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const manifest=require('./approved-card459-v18.json'),files=manifest.files;
const blob=input=>{const b=Buffer.from(input);return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
function restore(file,text){
 text=require("./approved-notation-v6.cjs").restore(file,text);
 const e=files[file];if(!e||text===null)return text;
 if(e.baselineBlob!==null&&blob(text)===e.baselineBlob)return text;
 if(e.baselineBlob===null){assert.equal(blob(text),e.approvedBlob,'exact V18 addition: '+file);return null;}
 assert.equal(typeof e.baselineText,'string','text restoration supported: '+file);
 // Replace the entire exact approved block, leaving any unrelated extra text visible.
 assert.equal(text.split(e.approvedText).length,2,'exact single V18 block: '+file);
 return text.replace(e.approvedText,()=>e.baselineText);
}
function restoreBytes(file,bytes){
 bytes=require("./approved-notation-v6.cjs").restoreBytes(file,bytes);
 const e=files[file];if(!e)return bytes;
 assert.notEqual(bytes,null,'retained V18 file: '+file);
 assert.equal(blob(bytes),e.approvedBlob,'exact V18 approved bytes: '+file);
 if(e.baselineBlob===null)return null;
 const prior=Buffer.from(e.baselineText??e.baselineBase64,e.baselineText===undefined?'base64':'utf8');
 assert.equal(blob(prior),e.baselineBlob,'frozen V18 baseline: '+file);return prior;
}
function verify(reader=file=>fs.existsSync(file)?fs.readFileSync(file):null){
 for(const [file,e] of Object.entries(files)){
  const bytes=require("./approved-notation-v6.cjs").restoreBytes(file,reader(file));assert.notEqual(bytes,null,'retained V18 file: '+file);
  assert.equal(blob(bytes),e.approvedBlob,'exact V18 approved bytes: '+file);
  if(e.baselineBlob!==null){const prior=restoreBytes(file,bytes);assert.equal(blob(prior),e.baselineBlob);}
 }
}
function originalBlob(file){return Object.hasOwn(files,file)?files[file].baselineBlob:null;}
module.exports={files,blob,restore,restoreBytes,verify,originalBlob};
