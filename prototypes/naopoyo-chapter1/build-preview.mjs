import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url)),out=path.resolve(process.argv[2]);
execFileSync(process.execPath,[path.join(root,'prototypes/naopoyo-world/build-preview.mjs'),out]);
const hashes=JSON.parse(fs.readFileSync(path.join(out,'version.json'))).files;
function copy(f){const b=fs.readFileSync(path.join(root,f)),dst=path.join(out,f);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,b);hashes[f]=createHash('sha256').update(b).digest('hex')}
for(const f of ['index.html','qa.html','style.css','stages.mjs','progress.mjs','app.mjs','render.mjs','ability.html','ability-ui.mjs','ability-lab.mjs'])copy('prototypes/naopoyo-chapter1/'+f);
for(const f of ['themes.mjs','fixtures.mjs'])copy('prototypes/naopoyo-rescue/'+f);
for(const family of ['butterfly','cicada','beetle'])for(let n=1;n<=8;n++)copy('assets/characters/'+family+'/'+String(n).padStart(2,'0')+'.png');
const html=fs.readFileSync(path.join(root,'prototypes/naopoyo-chapter1/index.html'),'utf8').replace('<head>','<head><base href="./prototypes/naopoyo-chapter1/">');fs.writeFileSync(path.join(out,'index.html'),html);hashes['index.html']=createHash('sha256').update(html).digest('hex');
fs.writeFileSync(path.join(out,'version.json'),JSON.stringify({name:'NAOPOYO. Chapter 1',build:'chapter1-20261023-v1',dependency:'ac9b441c7985284bedbde335c2d2fa56b291c4cd',files:hashes},null,2));console.log(JSON.stringify({out,files:Object.keys(hashes).length}));
