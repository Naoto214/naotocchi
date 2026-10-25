import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {spriteData} from '../naopoyo-rescue/sprite-data.mjs';
import {stages} from './stages.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),out=path.resolve(process.argv[2]),hashes={},seen=new Set();
if(!process.argv[2]||out===root||root.startsWith(out+path.sep))throw Error('Provide isolated output directory');
fs.mkdirSync(out,{recursive:true});
function copy(file){
 if(seen.has(file))return;seen.add(file);
 const src=path.join(root,file),b=fs.readFileSync(src),dst=path.join(out,file);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,b);hashes[file]=createHash('sha256').update(b).digest('hex');
 if(/\.(mjs|css|html)$/.test(file))for(const match of b.toString().matchAll(/(?:from\s*|import\s*|@import\s+url\(|(?:href|src)=)["']([^"']+)["']/g)){
  const rel=match[1];if(!rel.startsWith('.')&&!/^(style\.css|\.\/)/.test(rel))continue;
  const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(file),rel));if(fs.existsSync(path.join(root,resolved))&&fs.statSync(path.join(root,resolved)).isFile())copy(resolved);
 }
}
for(const f of ['index.html','qa.html','app.mjs','style.css'])copy('prototypes/naopoyo-chapter2/'+f);
for(const spec of Object.values(spriteData))copy(spec.path);
for(const s of stages)if(s.narrator)copy(s.narrator.asset);
copy('assets/characters/companions/owl.png');copy('assets/world/forest-v1.webp');
const html=fs.readFileSync(path.join(root,'prototypes/naopoyo-chapter2/index.html'),'utf8').replace('<head>','<head><base href="./prototypes/naopoyo-chapter2/">');fs.writeFileSync(path.join(out,'index.html'),html);hashes['index.html']=createHash('sha256').update(html).digest('hex');
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
fs.writeFileSync(path.join(out,'version.json'),JSON.stringify({name:'NAOPOYO. こもれびの森',version:7,terrainRules:'magic-rock-v1',sourceCommit:commit,base:'92ac654644351a169b9661e2319b0cd81670c497',files:hashes},null,2));console.log(JSON.stringify({out,files:Object.keys(hashes).length,sourceCommit:commit}));
