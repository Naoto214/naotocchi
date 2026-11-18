import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {CATALOG} from '../full-catalog.mjs';
import {cardMarkup,icon} from '../ui-presentation.mjs';
import {cardArtColors} from '../art-pilot/approved-colors.mjs';
import {marriedText} from '../lover-married.mjs';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../..'),game=resolve(here,'..');
const out=resolve(process.argv[2]||'/workspace/sites/naotocchi-card-design-v1/.sites-checkout/dist/v2');
const data=JSON.parse(readFileSync(join(out,'data.json'))),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(data.cards.length,459);assert.equal(data.nine.length,9);assert.equal(new Set(data.nine).size,9);
const byId=new Map(data.cards.map(c=>[c.id,c]));assert.equal(new Set(data.nine.map(id=>byId.get(id).type)).size,7);
let unchanged=0;
const bind=(html,src)=>html.replace(/(<img class="dedicated-art" src=")[^"]+(")/,(_,a,b)=>a+src+b);
for(const c of data.cards){
 assert.equal(c.color,cardArtColors(c).color);assert.equal(c.mark,icon(c.type==='main'?c.attribute:c.type));assert.equal(c.married,marriedText(c.id));
 if(CATALOG[c.id]){
  for(const [k,v]of Object.entries(CATALOG[c.id]))assert.deepEqual(c[k],v,`${c.id} ${k}`);
  assert.equal(c.officialFull,bind(cardMarkup(CATALOG[c.id],{detail:true}),c.large));
  assert.equal(c.officialCompact,bind(cardMarkup(CATALOG[c.id],{compact:true}),c.image));unchanged++;
 }else{assert(c.additional);assert.equal(c.source_sha256,'d4bb2d7a07192632bc25f06d1857af57fb311c976bd396bca6ce6cf979f3583b');assert(c.officialFull.includes(c.large));}
}
assert.equal(unchanged,452);
assert(readFileSync(join(out,'official/style.css')).equals(readFileSync(join(game,'style.css'))));
assert.equal(sha(readFileSync(join(out,'assets/back.png'))),'028114e02034a5c5d84a0ace2c97babb92363e19eed6249f87cc591897189872');
const receipts=JSON.parse(readFileSync(join(here,'asset-verification.json'))).receipts;
for(const r of receipts)assert.equal(sha(readFileSync(join(out,r.path))),r.sha256);
const files=execFileSync('git',['ls-tree','-r','--name-only','6aecc6b1e4eaa72834d6c6111457a1f075889544','prototypes/card-game/design-comparison-v1-20261114'],{cwd:root,encoding:'utf8'}).trim().split('\n');
for(const file of files)assert(readFileSync(join(root,file)).equals(execFileSync('git',['show',`6aecc6b1e4eaa72834d6c6111457a1f075889544:${file}`],{cwd:root,maxBuffer:10*1024*1024})));
const report={cards:459,unchangedProductionRecordsAndMarkup:unchanged,nineCards:9,nineCardCategories:7,verifiedImages:receipts.length,productionCssUnchanged:true,backUnchanged:true,v1FilesUnchanged:files.length};
console.log(JSON.stringify(report,null,2));
