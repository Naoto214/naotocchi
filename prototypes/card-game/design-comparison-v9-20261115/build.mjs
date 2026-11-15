import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const source=path.dirname(fileURLToPath(import.meta.url)),site=process.argv[2];
if(!site)throw Error('Pass an existing Site checkout');
const root=path.join(site,'dist'),v8=path.join(root,'v8'),dest=path.join(root,'v9');
if(!fs.existsSync(path.join(v8,'data.json')))throw Error('Existing V8 is required; do not regenerate assets.');
fs.mkdirSync(dest,{recursive:true});
for(const file of fs.readdirSync(source,{withFileTypes:true})){
 if(file.isDirectory()){if(file.name==='qa')fs.cpSync(path.join(source,'qa'),path.join(dest,'qa'),{recursive:true});continue;}if(!/\.(html|css|mjs|json|md)$/.test(file.name)||['build.mjs','verify.mjs','policy.test.mjs'].includes(file.name))continue;
 let text=fs.readFileSync(path.join(source,file.name),'utf8').replaceAll('../design-comparison-v8-20261115/','../v8/');
 fs.writeFileSync(path.join(dest,file.name),text);
}
console.log(JSON.stringify({destination:dest,assets:'V8/V7 originals reused',previousVersions:'untouched'}));
