import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {CANDIDATES,CANDIDATE_SCENES} from './scenes.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const [baseArg,outArg]=process.argv.slice(2);
if(!baseArg||!outArg)throw Error('Usage: node build.mjs PINNED_CHECKOUT OUTPUT');
const base=path.resolve(baseArg),out=path.resolve(outArg);
export const BASE_HEAD='323debc35f44136d64ae74fadf8f36da7f358e86';
const head=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:base,encoding:'utf8'}).trim();
if(head!==BASE_HEAD)throw Error('Wrong runtime HEAD: '+head);
cp.execFileSync('git',['diff','--quiet','HEAD'],{cwd:base}); // Reject modified tracked build inputs.
const read=f=>fs.readFileSync(path.join(base,f),'utf8');
const put=(f,s)=>{const p=path.join(out,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);};
const copy=(from,to)=>put(to,fs.readFileSync(from));
if(!fs.existsSync(path.join(out,'script.js')))cp.execFileSync('python',['tools/pages/package.py','--out',out,'--report',out+'-base.json'],{cwd:base,stdio:'inherit'});
// Audit the full baseline before adding disposable comparison files.
const allow=JSON.parse(read('tools/pages/allowlist.json')).files;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const f of allow){if(f==='index.html'&&fs.existsSync(path.join(out,'home-original.html')))continue;if(sha(fs.readFileSync(path.join(base,f)))!==sha(fs.readFileSync(path.join(out,f))))throw Error('Baseline differs: '+f);}
cp.execFileSync(process.execPath,['tools/home-production-v5-qa.cjs',out],{cwd:base,stdio:'inherit'});
const {ART_CANDIDATES,ART_SCENES}=await import(pathToFileURL(path.join(base,'home-production-manifest.mjs')));
put('comparison-manifest.mjs',`import {ART_CANDIDATES as original,ART_SCENES as scenes} from './home-production-manifest.mjs';\nconst additions=${JSON.stringify(CANDIDATES)};\nconst candidates=${JSON.stringify(CANDIDATE_SCENES)};\nconst chosen=new URLSearchParams(location.search).get('scene');\nexport const ART_CANDIDATES=[...original,...additions];\nexport function selectRecoveredScene(region){return candidates[chosen]?.region===region?candidates[chosen]:scenes[region]||scenes.home;}\n`);
put('comparison-world.mjs',read('home-production-world.mjs').replace("'./home-production-manifest.mjs'","'./comparison-manifest.mjs'"));
let diorama=fs.readFileSync(path.join(out,'v5-qa-diorama.js'),'utf8').replace("'./home-production-world.mjs'","'./comparison-world.mjs'");
put('comparison-diorama.js',diorama);
let js=fs.readFileSync(path.join(out,'v5-qa-script.js'),'utf8');
// Owner play retains the normal clock; only explicit QA freezes gameplay time.
js=js.replace('/* deterministic QA clock */',"if(!new URLSearchParams(location.search).has('qa'))setInterval(loop, TICK_MS);");
// The fixture starts in adulthood. Initialize its normal individuality field.
js=js.replace('homeCastLayoutKey=\'\';render();homeDiorama.sync();return this.detail();',"state.individuality ||= INDIVIDUALITY.create(state.speciesLine,REGIONS.map(r=>r.id));homeCastLayoutKey='';render();homeDiorama.sync();return this.detail();");
js=js.replace('const qaRegion=qaParams.get(\'region\');',"const qaRegion=qaParams.get('scene')?.startsWith('jungle')?'jungle':'forest';");
js=js.replace(/\}\)\(\);\s*$/,`\nwindow.F2J3QA={model:homeDiorama.model,scene:()=>homeDiorama.inspectScene(),detail:()=>HomeReleaseQA.detail()};\n})();`);
put('comparison-script.js',js);
let html=fs.readFileSync(path.join(out,'v5-qa.html'),'utf8').replaceAll('v5-qa-script.js','comparison-script.js').replaceAll('v5-qa-diorama.js','comparison-diorama.js').replace("n='naotocchi-home-v5-qa:'","n='naotocchi-f2j3-qa:'+new URLSearchParams(location.search).get('scene')+':'+new URLSearchParams(location.search).get('count')+':'");
put('play.html',html);
copy(path.join(base,'index.html'),'home-original.html');
copy(path.join(here,'gallery.html'),'index.html');
copy(path.join(here,'gallery.js'),'gallery.js');
copy(path.join(here,'review.html'),'review.html');
copy(path.join(here,'scenes.mjs'),'comparison-scenes.mjs');
for(const name of ['forest-f2','jungle-j3']){
 copy(path.join(here,'runtime',name+'.webp'),'comparison-art/'+name+'.webp');
 copy(path.join(here,'originals',name+'.png'),'comparison-originals/'+name+'.png');
}
const entries=[['forest-current','forest','現行の森','滝と苔むした小道'],['forest-f2','forest','森F2 · 木漏れ日の広場','広葉樹に包まれた、優しい草地'],['jungle-current','jungle','現行のジャングル','赤土の小道と亜熱帯林'],['jungle-j3','jungle','ジャングルJ3 · 生命の水辺','濃密なシダ、光芒と静かな湿地']].map(([id,region,name,note])=>{
 const current=ART_CANDIDATES.find(a=>a.id===ART_SCENES[region].candidate),candidate=CANDIDATES.find(a=>a.id===id);
 return {id,region,name,note,src:candidate?.src||current.src,original:candidate?'comparison-originals/'+id+'.png':current.src,geometry:CANDIDATE_SCENES[id]||ART_SCENES[region]};
});
put('comparison.json',JSON.stringify({baseline:BASE_HEAD,entries},null,2));
// Preserve and hash every original file. Only the new gallery occupies index.
const preserved=Object.fromEntries(allow.map(f=>[f,sha(fs.readFileSync(path.join(base,f)))]));
put('comparison-provenance.json',JSON.stringify({baseline:BASE_HEAD,branch:'compare/forest-f2-jungle-j3-20261101',originalFiles:preserved,candidateOnly:true,productionChanged:false},null,2));
console.log('Comparison built. Baseline files verified:',allow.length);
