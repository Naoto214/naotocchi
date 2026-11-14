// Isolated read-only catalog exporter; writes only to an explicit output folder.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {CATALOG} from '../full-catalog.mjs';
import {CARD_ART} from '../ui-art.mjs';
import {marriedText} from '../lover-married.mjs';
import {cardArtColors,ATTRIBUTE_COLORS,CATEGORY_COLORS} from '../art-pilot/approved-colors.mjs';
import {icon} from '../ui-presentation.mjs';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../..'),game=resolve(here,'..');
const out=resolve(process.argv[2]||'/workspace/sites/naotocchi-card-design-v1/dist');
if(out===root||out===game||out===here)throw Error('Use a separate output directory');
mkdirSync(out,{recursive:true});mkdirSync(join(out,'assets'),{recursive:true});
const ref='948026343099e34628f5655ae240d1083763ea9e',base='prototypes/card-game/variable-life-20261031/';
const read498=p=>execFileSync('git',['show',`${ref}:${base}${p}`],{cwd:root,maxBuffer:10*1024*1024});
const pinnedMain='105dba519890c2dc17e94a8c9d1b7679720fddf3';
for(const p of ['full-catalog.mjs','ui-art.mjs','lover-married.mjs','ui-presentation.mjs','art-pilot/approved-colors.mjs','art-pilot/symbols/attributes.mjs','ui-assets/card-back-approved.png']){
 const pinned=execFileSync('git',['show',`${pinnedMain}:prototypes/card-game/${p}`],{cwd:root,maxBuffer:10*1024*1024});
 if(!pinned.equals(readFileSync(join(game,p))))throw Error('Official source differs from pinned baseline: '+p);
}
const tmp=join(out,'candidate-source.mjs'),doc=join(out,'481-time-reversal-cards.md');writeFileSync(tmp,read498('integration/candidate-cards.mjs'));writeFileSync(doc,read498('integration/481-time-reversal-cards.md'));
const {CANDIDATE_CARDS}=await import('file://'+tmp);
const {unlinkSync}=await import('node:fs');unlinkSync(tmp);unlinkSync(doc);
const extra=JSON.parse(read498('art-v1/delivery/card-art-v9.json'));
const cards={...CATALOG,...CANDIDATE_CARDS};
const preferred=['W-memory_lake','I-naoto_lantern','M-cat-05','M-dandelion-05','C-box','C-unicorn','P-anglerfish','P-ice_spirit','E-big-illness','E-fateful-transform','E-stairs','E-boss','W-star_stop','P-knitting_spider','C-chameleon'];
for(const attr of Object.keys(ATTRIBUTE_COLORS))preferred.push(Object.values(CATALOG).find(c=>c.attribute===attr&&c.stage===5)?.id);
for(const type of ['main','companion','partner','world','play','item','event']){
 const arr=Object.values(CATALOG).filter(c=>c.type===type).sort((a,b)=>(b.text.length+(marriedText(b.id)?.length||0))-(a.text.length+(marriedText(a.id)?.length||0)));
 preferred.push(arr[0].id,arr.at(-1).id);
}
preferred.push(...Object.keys(extra));
const representatives=[...new Set(preferred.filter(id=>cards[id]))];
const receipts=[];const sha=b=>createHash('sha256').update(b).digest('hex');
const records=Object.values(cards).map(c=>{
 const a=extra[c.id]??CARD_ART[c.id];let image='',large='';
 for(const size of representatives.includes(c.id)?['small','large']:['small']){
  const bytes=extra[c.id]?read498('art-v1/delivery/'+a[size]):readFileSync(join(game,a[size]));
  if(!a[size].includes(sha(bytes).slice(0,12)))throw Error('Official art filename hash mismatch: '+c.id);
  if(extra[c.id]&&sha(bytes)!==a[size+'_sha256'])throw Error('Hash mismatch: '+c.id);
  const dst='assets/'+a[size].split('/').at(-1);writeFileSync(join(out,dst),bytes);
  receipts.push({id:c.id,size,sha256:sha(bytes),path:dst,source:extra[c.id]?`${ref}:${base}art-v1/delivery/${a[size]}`:a[size]});
  if(size==='small')image=dst;else large=dst;
 }
 return {...c,married:marriedText(c.id),title:c.type==='main'?(c.form??c.name):c.name,...cardArtColors(c),mark:icon(c.type==='main'?c.attribute:c.type),image,large:large||image,additional:!!extra[c.id]};
});
const back=readFileSync(join(game,'ui-assets/card-back-approved.png'));writeFileSync(join(out,'assets/back.png'),back);
copyFileSync(join(game,'ui-assets/egg-card-large.webp'),join(out,'assets/egg.webp'));
const data={cards:records,representatives,attributes:ATTRIBUTE_COLORS,categories:CATEGORY_COLORS,backSha256:sha(back),source:{main:'105dba519890c2dc17e94a8c9d1b7679720fddf3',art:'a6ad1a9689335f0379d5c6795d1da8652f02ac0d',extra:ref}};
writeFileSync(join(out,'data.json'),JSON.stringify(data));
for(const file of ['index.html','design.css','app.mjs','title.mjs'])copyFileSync(join(here,file),join(out,file));
writeFileSync(join(here,'asset-verification.json'),JSON.stringify({count:records.length,representatives:representatives.length,backSha256:sha(back),receipts},null,2));
console.log(JSON.stringify({out,cards:records.length,representatives:representatives.length,assets:receipts.length,backSha256:sha(back)}));
