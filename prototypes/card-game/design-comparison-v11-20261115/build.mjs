import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const source=path.dirname(fileURLToPath(import.meta.url)),site=process.argv[2],dist=path.join(site,'dist'),old=path.join(dist,'v10'),out=path.join(dist,'v11');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');fs.mkdirSync(out,{recursive:true});
for(const f of fs.readdirSync(source,{withFileTypes:true})){if(f.isDirectory()){fs.cpSync(path.join(source,f.name),path.join(out,f.name),{recursive:true});continue;}if(f.name==='build.mjs'||f.name.endsWith('.test.mjs'))continue;fs.writeFileSync(path.join(out,f.name),fs.readFileSync(path.join(source,f.name),'utf8').replaceAll('../design-comparison-v10-20261115/','../v10/'));}
// Only copy modules that transitively depend on the two card renderer dispatches.
const files=new Map(fs.readdirSync(path.join(old,'game')).filter(f=>f.endsWith('.mjs')).map(f=>[f,fs.readFileSync(path.join(old,'game',f),'utf8')]));
const needed=new Set(['ui-presentation.mjs']);let change=true;while(change){change=false;for(const [f,s] of files)if(!needed.has(f)&&[...needed].some(dep=>s.includes("'./"+dep+"'")||s.includes('"./'+dep+'"'))){needed.add(f);change=true;}}
function imports(s,folder){return s.replace(/(from\s*|import\s*\(|import\s*)(['"])(\.\.?\/[^'"]+)\2/g,(m,p,q,target)=>{const absolute=path.posix.normalize('/v10/'+folder+'/'+target);if(folder==='game'&&target.startsWith('./')&&needed.has(target.slice(2)))return m;if(target==='../render.mjs')return m;return p+q+absolute+q;});}
const manifest={basedOn:'c51bf4eebd31248ca5139f1c1b5a7e4c926ea35d',formalCommit:'408c72e6ebef71da3eab33cfb268c7494117aaaa',routed:[],images:'V10 and V8 unchanged'};
fs.mkdirSync(path.join(out,'game'),{recursive:true});
for(const f of needed){let s=files.get(f);s=imports(s,'game').replaceAll('ui-assets/egg-card-small.webp','/v10/game/ui-assets/egg-card-small.webp');if(f==='ui-presentation.mjs')s=s.replace("new URL('../data.json',import.meta.url)","new URL('/v10/data.json',import.meta.url)");fs.writeFileSync(path.join(out,'game',f),s);manifest.routed.push({path:'game/'+f,sourceSha256:hash(files.get(f)),outputSha256:hash(s)});}
function html(s){return s.replaceAll('href="style.css"','href="/v10/game/style.css"').replace(/href="([^"/]+\.css)"/g,'href="/v10/game/$1"').replaceAll('../runtime/','/v10/runtime/');}
fs.writeFileSync(path.join(out,'game/index.html'),html(fs.readFileSync(path.join(old,'game/index.html'),'utf8')));
// Same catalog UI and data; route its UI imports to the candidate dispatch.
fs.mkdirSync(path.join(out,'catalog'),{recursive:true});
for(const f of ['app.mjs','collection-ui.mjs','collection.mjs','catalog-data.mjs']){let s=fs.readFileSync(path.join(old,'catalog',f),'utf8');s=s.replace(/(from\s*|import\s*\(|import\s*)(['"])(\.\.?\/[^'"]+)\2/g,(m,p,q,t)=>{if(t.startsWith('./'))return m;const name=t.split('/').at(-1);return p+q+(needed.has(name)?'../game/'+name:'/v10/game/'+name)+q;});s=s.replace("fetch('../data.json')","fetch('/v10/data.json')");fs.writeFileSync(path.join(out,'catalog',f),s);}
fs.writeFileSync(path.join(out,'catalog/index.html'),html(fs.readFileSync(path.join(old,'catalog/index.html'),'utf8')).replaceAll('href="../game/','href="/v10/game/'));
fs.writeFileSync(path.join(out,'preservation.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({out,modules:needed.size,bytes:manifest.routed.length}));
