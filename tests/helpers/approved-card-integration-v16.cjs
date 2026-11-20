// Owner-approved exact bytes, not a directory-wide exemption or regenerated CI baseline.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const manifest=require('./approved-card-integration-v16.json');
const files=manifest.files;
const blob=bytes=>crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const read=file=>{if(!fs.existsSync(file))return null;const kanji=require('./approved-kanji-v17.cjs'),bytes=require('./approved-card459-v18.cjs').restoreBytes(file,fs.readFileSync(file));if(bytes===null)return null;if(!Object.hasOwn(kanji.files,file))return blob(bytes);const original=kanji.restore(file,bytes.toString('utf8'));return original===null?null:blob(Buffer.from(original));};
const signatures=['character-world-master.v1.js','prototypes/card-game/ui-presentation.mjs'];
function verify(reader=read){
 const variants=['baseline','names','design','combined'].filter(mode=>signatures.every(file=>reader(file)===files[file][mode]));
 assert.equal(variants.length,1,'exact approved names/design combination');
 const mode=variants[0];
 for(const [file,hashes] of Object.entries(files))assert.equal(reader(file),hashes[mode],'V16 owner-approved bytes: '+file);
 return mode;
}
function originalBlob(file){return Object.hasOwn(files,file)?files[file].baseline:null;}
module.exports={files,verify,originalBlob};
