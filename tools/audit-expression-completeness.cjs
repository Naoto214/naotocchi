#!/usr/bin/env node
// Read-only audit: derive scope from the character master, not the expression allowlist.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const crypto=require('node:crypto'),cp=require('node:child_process'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=(...args)=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const context={window:{}};
vm.runInNewContext(read('character-world-master.v1.js').toString(),context);
const master=context.window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1.playerSpecies;
const species=[...master.normal,...master.rare,...master.secret];
const code=read('pet-expression.js').toString();
const ids=JSON.parse(code.match(/const EXPRESSIONS = Object.freeze\((\[[\s\S]*?\])\);/)[1].replace(/'/g,'"').replace(/,\s*]/,']')).filter(x=>x!=='normal');
// Independently read from the approved ten-state specification, not a runtime count.
const canonicalIds=['happy','strained','hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping'];
const expression=require('../pet-expression.js');
const placement=JSON.parse(code.match(/const MARK_PLACEMENT = (\{[\s\S]*?\n  \});/)[1]);
const anchors=require('./expression-face-anchors.json');
const names=require('./expression-stage-names.json');
const bounds=require('../cast-bounds.js');
const preExpression='dab89b129efc38bb0db70d6b75f795d9c2bf52d5';
const auditBaseline=process.env.EXPRESSION_AUDIT_BASE || 'd0399d249c82dd74159fdd8ac592e0d1bd405204';
const retainedLegacy=['06-happy.png','06-happy-v2.png','06-sleeping.png','06-sleeping-v2.png'].map(p=>'assets/characters/expressions/cat/'+p);
const walk=p=>fs.readdirSync(path.join(root,p),{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(p+'/'+x.name):[p+'/'+x.name]);
const issues=[];
const check=(ok,kind,details)=>{if(!ok)issues.push({kind,...details});};
const blobMap=ref=>Object.fromEntries(git('ls-tree','-r',ref,'--','assets/characters').split('\n').filter(Boolean).map(line=>{const [info,p]=line.split('\t');return [p,info.split(' ')[2]];}));
const oldBlobs=blobMap(preExpression),startBlobs=blobMap(auditBaseline);
const records=[],originals=[],routes=new Map(),fileHashes=new Map(),pixelHashes=new Map();
async function inspect(p){
 const bytes=read(p),{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const alpha=new Set();let x0=info.width,y0=info.height,x1=0,y1=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const a=data[(y*info.width+x)*4+3];alpha.add(a);if(a){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}
 }
 return {path:p,sha256:hash(bytes),gitBlob:crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex'),pixelSha256:hash(data),width:info.width,height:info.height,alpha:[...alpha].sort((a,b)=>a-b),bounds:[x0,y0,x1,y1]};
}
(async()=>{
 check(new Set(species.map(s=>s.id)).size===species.length,'duplicate-species',{});
 check(ids.length===10&&new Set(ids).size===10,'expression-ids',{ids});
 check(JSON.stringify([...ids].sort())===JSON.stringify([...canonicalIds].sort()),'canonical-expression-ids',{ids});
 for(const s of species){
  check(s.stages.length===8,'stage-count',{species:s.id});
  check(anchors[s.id]?.length===8&&names[s.id]?.length===8,'stage-metadata',{species:s.id});
  for(let n=1;n<=s.stages.length;n++){
   const stage=String(n).padStart(2,'0'),base=`assets/characters/${s.id}/${stage}.png`,key=`${s.id}/${stage}`;
   check(fs.existsSync(path.join(root,base)),'missing-original',{base});
   if(!fs.existsSync(path.join(root,base)))continue;
   const original=await inspect(base);originals.push(original);
   check(original.gitBlob===oldBlobs[base],'original-changed-since-pre-expression',{base});
   check(expression.assetFor(base,'normal')===base&&expression.assetFor(base,'invalid')===base,'normal-fallback',{base});
   check(expression.accentFor(base,'normal')===''&&expression.accentFor(base,'invalid')==='','normal-mark',{base});
   check(placement[key]&&Object.keys(placement[key].marks).length===10,'placement-count',{base});
   check(JSON.stringify(placement[key]?.face)===JSON.stringify(anchors[s.id]?.[n-1]?.slice(0,2)),'face-anchor-mismatch',{base});
   const previewName=names[s.id]?.[n-1];
   const displayName=['man','woman'].includes(s.id)?previewName?.replace(/（[男女]）$/,''):previewName;
   check(displayName===s.stages[n-1],'stage-label-mismatch',{base,previewName,masterName:s.stages[n-1]});
   check(JSON.stringify(Object.keys(placement[key]?.marks||{}).sort())===JSON.stringify([...canonicalIds].sort()),'placement-state-keys',{base});
   for(const id of ids){
    const actual=expression.assetFor(base,id);
    const expected=`assets/characters/expressions/${s.id}/${stage}-${id}${s.id==='cat'&&n===6&&['happy','sleeping'].includes(id)?'-v3':''}.png`;
    check(actual===expected,'incorrect-route',{base,id,actual,expected});
    check(!routes.has(actual),'duplicate-route',{base,id,actual});routes.set(actual,{base,id});
    if(!fs.existsSync(path.join(root,actual))){issues.push({kind:'missing-expression',actual});continue;}
    const record=await inspect(actual);records.push({...record,species:s.id,stage,id});
    check(record.width===128&&record.height===128&&JSON.stringify(record.alpha)==='[0,255]','png-format',{actual});
    check(JSON.stringify(record.bounds)===JSON.stringify(original.bounds),'original-bounds',{actual,expected:original.bounds,actualBounds:record.bounds});
    check(JSON.stringify(original.bounds)===JSON.stringify(bounds[base]?.box),'bounds-manifest',{base});
    for(const [map,value,kind] of [[fileHashes,record.sha256,'duplicate-file-content'],[pixelHashes,record.pixelSha256,'duplicate-pixels']]){
     if(map.has(value))issues.push({kind,files:[map.get(value),actual]});else map.set(value,actual);
    }
    const accent=expression.accentFor(base,id);
    check((accent.match(/<svg\b/g)||[]).length===1&&(accent.match(/<span\b/g)||[]).length===1,'mark-layer-count',{actual});
    check(accent.includes('pet-expression-accent--'+id),'mark-state',{actual});
    check(record.gitBlob===startBlobs[actual],'expression-changed-during-audit',{actual});
   }
  }
 }
 const files=walk('assets/characters/expressions');
 const extras=files.filter(p=>!routes.has(p)&&!retainedLegacy.includes(p));
 extras.forEach(p=>issues.push({kind:'unclassified-extra-or-orphan',path:p}));
 const legacy=retainedLegacy.map(p=>({path:p,preserved:startBlobs[p]===git('hash-object',p),referencedByRuntime:[...routes.keys()].includes(p)}));
 for(const record of legacy){
  record.sha256=hash(read(record.path));record.gitBlob=git('hash-object',record.path);
  check(record.preserved&&!record.referencedByRuntime,'retained-legacy-preservation',{path:record.path});
 }
 const allOriginals=walk('assets/characters').filter(p=>p.endsWith('.png')&&!p.startsWith('assets/characters/expressions/'));
 const historicalOriginals=Object.keys(oldBlobs).filter(p=>p.endsWith('.png')&&!p.startsWith('assets/characters/expressions/'));
 check(JSON.stringify([...allOriginals].sort())===JSON.stringify([...historicalOriginals].sort()),'original-path-set',{
  missing:historicalOriginals.filter(p=>!allOriginals.includes(p)),extra:allOriginals.filter(p=>!historicalOriginals.includes(p))});
 const changedOriginals=allOriginals.filter(p=>git('hash-object',p)!==oldBlobs[p]);
 check(changedOriginals.length===0,'all-originals-preservation',{changedOriginals});
 check(Object.keys(placement).length===originals.length,'extra-placement',{});
 check(Object.keys(anchors).length===species.length&&Object.keys(names).length===species.length,'extra-species-metadata',{});
 const expectedKeys=originals.map(r=>r.path.slice(18,-4)).sort();
 check(JSON.stringify(Object.keys(placement).sort())===JSON.stringify(expectedKeys),'placement-key-set',{});
 for(const [label,data] of [['anchors',anchors],['names',names]])check(JSON.stringify(Object.keys(data).sort())===JSON.stringify(species.map(s=>s.id).sort()),'metadata-key-set',{label});
 const report={schema:1,preExpression,auditBaseline,baselineTree:git('rev-parse',auditBaseline+'^{tree}'),scope:species.map(s=>({id:s.id,label:s.label,stages:s.stages.length,expected:s.stages.length*ids.length,actual:records.filter(r=>r.species===s.id).length})),ids,counts:{species:species.length,stages:originals.length,expected:species.reduce((n,s)=>n+s.stages.length*ids.length,0),active:records.length,physicalExpressionFiles:files.length,retainedLegacy:legacy.length,unexpectedExtras:extras.length,allOriginalPngs:allOriginals.length,changedOriginals:changedOriginals.length},legacy,issues,originals,expressions:records};
 report.allOriginals=allOriginals.map(p=>({path:p,sha256:hash(read(p)),gitBlob:git('hash-object',p),historicalGitBlob:oldBlobs[p]}));
 const output=process.argv[2];if(output)fs.writeFileSync(path.resolve(output),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({counts:report.counts,issues},null,2));if(issues.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
