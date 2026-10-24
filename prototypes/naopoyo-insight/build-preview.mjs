import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {stages} from './stages.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),out=path.resolve(process.argv[2]);
execFileSync(process.execPath,[path.join(root,'prototypes/naopoyo-world/build-preview.mjs'),out]);
const version=JSON.parse(fs.readFileSync(path.join(out,'version.json'))),files=version.files;
function copy(f){const b=fs.readFileSync(path.join(root,f));const dst=path.join(out,f);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,b);files[f]=createHash('sha256').update(b).digest('hex')}
for(const f of ['index.html','style.css','stages.mjs'])copy('prototypes/naopoyo-insight/'+f);
for(const f of new Set(stages.flatMap(s=>[s.narrator?.asset,...s.guests.map(g=>g.asset)]).filter(Boolean)))copy(f);
const html=fs.readFileSync(path.join(root,'prototypes/naopoyo-insight/index.html'),'utf8').replace('<head>','<head><base href="./prototypes/naopoyo-insight/">');fs.writeFileSync(path.join(out,'index.html'),html);files['index.html']=createHash('sha256').update(html).digest('hex');
fs.writeFileSync(path.join(out,'version.json'),JSON.stringify({name:'NAOPOYO. Insight Pilot',build:'insight-20261023-v1',dependency:'599fcb4854818e418a88301b48aed1da8ee16325',files},null,2));console.log(JSON.stringify({out,files:Object.keys(files).length}));
