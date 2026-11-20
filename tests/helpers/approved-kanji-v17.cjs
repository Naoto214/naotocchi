// Reverse only exact VERSION17 approved changes; historical protection hashes stay frozen.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const manifest=require('./approved-kanji-v17.json');
const files=manifest.files;
const blob=text=>{const bytes=Buffer.from(text);return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');};
function restore(file,text){
 text=require('./approved-card459-v18.cjs').restore(file,text);
 const entry=files[file];if(!entry)return text;
 if(entry.baselineBlob===null){assert.equal(blob(text),entry.approvedBlob,'exact V17 addition: '+file);return null;}
 for(const {before,after} of entry.replacements){
  assert.ok(after.length,'nonempty approved replacement: '+file);
  assert.equal(text.split(after).length,2,'exact single V17 replacement: '+file);
  text=text.replace(after,()=>before);
 }
 return text;
}
function verify(reader=file=>fs.existsSync(file)?fs.readFileSync(file,'utf8'):null){
 for(const [file,entry] of Object.entries(files)){
  const current=reader(file);assert.notEqual(current,null,'retained V17 file: '+file);
  const text=require('./approved-card459-v18.cjs').restore(file,current);
  assert.equal(blob(text),entry.approvedBlob,'exact V17 approved bytes: '+file);
  const original=restore(file,text);
  assert.equal(original===null?null:blob(original),entry.baselineBlob,'original protected bytes: '+file);
 }
}
function originalBlob(file){return Object.hasOwn(files,file)?files[file].baselineBlob:null;}
module.exports={files,blob,restore,verify,originalBlob};
