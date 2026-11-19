import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const source=path.dirname(fileURLToPath(import.meta.url)),site=process.argv[2];if(!site)throw Error('Site checkout required');
const out=path.join(site,'dist/v12');fs.mkdirSync(out,{recursive:true});
for(const name of fs.readdirSync(source)){if(name==='build.mjs'||name.endsWith('.test.mjs'))continue;fs.copyFileSync(path.join(source,name),path.join(out,name));}
console.log('V12 standalone comparison built: '+out);
